'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Ticket, TicketMessage, TicketFilters, Tag } from '@/lib/types/ticket'
import { sendTicketEmail } from '@/lib/email/ticket-mailer'

export async function getTickets(filters: TicketFilters = {}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert', data: [] }
    }

    // Get user profile for role check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'admin'

    const page = filters.page || 1
    const perPage = 10
    const offset = (page - 1) * perPage

    let query = supabase
      .from('tickets')
      .select(`
        *,
        assigned_user:profiles!tickets_assigned_to_fkey(id, first_name, last_name, email),
        creator:profiles!tickets_created_by_fkey(id, first_name, last_name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    // Apply spam filter
    if (filters.filter === 'spam') {
      if (!isManagerOrAdmin) {
        return { success: false, error: 'Keine Berechtigung', data: [] }
      }
      query = query.eq('is_spam', true)
    } else {
      query = query.eq('is_spam', false)
    }

    // Apply assignment filter
    if (filters.filter === 'assigned') {
      query = query.eq('assigned_to', user.id)
    }

    // Apply status filter
    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Get tickets error:', error)
      return { success: false, error: 'Fehler beim Laden der Tickets', data: [] }
    }

    // Fetch tags for these tickets
    if (data && data.length > 0) {
      const ticketIds = data.map(t => t.id)
      const { data: ticketTagsData } = await supabase
        .from('ticket_tags')
        .select('ticket_id, tag:tags(id, name, color)')
        .in('ticket_id', ticketIds)

      // Group tags by ticket
      const tagsByTicket: Record<string, Tag[]> = {}
      ticketTagsData?.forEach((tt: any) => {
        if (tt.tag) {
          if (!tagsByTicket[tt.ticket_id]) {
            tagsByTicket[tt.ticket_id] = []
          }
          tagsByTicket[tt.ticket_id].push(tt.tag)
        }
      })

      // Add tags to tickets
      data.forEach((ticket: any) => {
        ticket.tags = tagsByTicket[ticket.id] || []
      })
    }

    return {
      success: true,
      data: data as Ticket[],
      count: count || 0,
      page,
      perPage,
      totalPages: Math.ceil((count || 0) / perPage)
    }
  } catch (error) {
    console.error('Get tickets error:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten', data: [] }
  }
}

export async function getTicket(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Get ticket with creator and assigned user
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        assigned_user:profiles!tickets_assigned_to_fkey(id, first_name, last_name, email),
        creator:profiles!tickets_created_by_fkey(id, first_name, last_name, email)
      `)
      .eq('id', id)
      .single()

    if (error || !ticket) {
      return { success: false, error: 'Ticket nicht gefunden' }
    }

    // Get messages
    const { data: messages } = await supabase
      .from('ticket_messages')
      .select(`
        *,
        sender:profiles(id, first_name, last_name, email, is_active)
      `)
      .eq('ticket_id', id)
      .order('created_at', { ascending: true })

    // Get tags
    const { data: ticketTags } = await supabase
      .from('ticket_tags')
      .select('tag:tags(id, name, color)')
      .eq('ticket_id', id)

    const tags = ticketTags?.map((tt: any) => tt.tag).filter(Boolean) || []

    return {
      success: true,
      data: {
        ...ticket,
        tags,
        messages: messages || []
      } as Ticket & { messages: TicketMessage[] }
    }
  } catch (error) {
    console.error('Get ticket error:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

export async function createTicket(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Extract form data
    const subject = formData.get('subject') as string
    const description = formData.get('description') as string
    const priority = formData.get('priority') as string
    const recipient_email = formData.get('recipient_email') as string
    const attachmentFiles = formData.getAll('attachments') as File[]

    // Validate required fields
    if (!subject || !description || !recipient_email) {
      return { success: false, error: 'Pflichtfelder fehlen' }
    }

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single()

    const senderName = profile
      ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email
      : 'FLIGHTHOUR Team'

    // Create ticket
    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        subject,
        description,
        priority,
        created_by: user.id,
        created_from_email: recipient_email,
        status: 'open'
      })
      .select()
      .single()

    if (error || !ticket) {
      console.error('Create ticket error:', error)
      return { success: false, error: 'Fehler beim Erstellen des Tickets' }
    }

    // Handle file uploads to Supabase Storage
    const uploadedAttachments: Array<{ filename: string; path?: string; content?: Buffer; contentType?: string }> = []

    if (attachmentFiles && attachmentFiles.length > 0) {
      for (const file of attachmentFiles) {
        // Skip empty entries
        if (!file || file.size === 0) continue
        try {
          // Convert File to ArrayBuffer then to Buffer
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          // Upload to Supabase Storage
          const fileName = `${ticket.id}/${Date.now()}_${file.name}`
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('ticket-attachments')
            .upload(fileName, buffer, {
              contentType: file.type,
              upsert: false
            })

          if (uploadError) {
            console.error('File upload error:', uploadError)
            continue
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('ticket-attachments')
            .getPublicUrl(fileName)

          // Save attachment metadata to database
          await supabase
            .from('ticket_attachments')
            .insert({
              ticket_id: ticket.id,
              message_id: null,
              filename: file.name,
              original_filename: file.name,
              mime_type: file.type,
              size_bytes: file.size,
              storage_path: fileName,
              uploaded_by: user.id
            })

          // Add to email attachments with buffer
          uploadedAttachments.push({
            filename: file.name,
            content: buffer,
            contentType: file.type
          })
        } catch (fileError) {
          console.error('Error processing file:', file.name, fileError)
        }
      }
    }

    // Tags are not supported in FormData version yet (can be added later if needed)

    // Queue email for background processing instead of sending directly
    // This prevents timeout issues and provides better monitoring
    try {
      // Store attachment data for email (serialize to JSON)
      const attachmentData = uploadedAttachments.map(att => ({
        filename: att.filename,
        contentType: att.contentType,
        ticketId: ticket.id,
        storagePath: `${ticket.id}/${Date.now()}_${att.filename}`
      }))

      await supabase
        .from('email_queue')
        .insert({
          ticket_id: ticket.id,
          recipient_email,
          subject,
          content: description,
          status: 'pending'
        })

      console.log('[Ticket] Email queued for delivery')
    } catch (queueError) {
      console.error('[Ticket] Failed to queue email:', queueError)
      // Don't fail ticket creation if queue insertion fails
    }

    revalidatePath('/tickets')
    return { success: true, data: ticket }
  } catch (error) {
    console.error('Create ticket error:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

export async function updateTicket(id: string, data: {
  status?: string
  priority?: string
  assigned_to?: string | null
}) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('tickets')
      .update(data)
      .eq('id', id)

    if (error) {
      console.error('Update ticket error:', error)
      return { success: false, error: 'Fehler beim Aktualisieren' }
    }

    revalidatePath('/tickets')
    revalidatePath(`/tickets/${id}`)
    return { success: true }
  } catch (error) {
    console.error('Update ticket error:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

export async function updateTicketTags(ticketId: string, tagIds: string[]) {
  try {
    const supabase = await createClient()

    // Delete existing tags
    await supabase
      .from('ticket_tags')
      .delete()
      .eq('ticket_id', ticketId)

    // Add new tags
    if (tagIds.length > 0) {
      const tagInserts = tagIds.map(tagId => ({
        ticket_id: ticketId,
        tag_id: tagId
      }))

      const { error } = await supabase
        .from('ticket_tags')
        .insert(tagInserts)

      if (error) {
        console.error('Update tags error:', error)
        return { success: false, error: 'Fehler beim Aktualisieren der Tags' }
      }
    }

    revalidatePath(`/tickets/${ticketId}`)
    return { success: true }
  } catch (error) {
    console.error('Update ticket tags error:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

export async function addMessage(ticketId: string, content: string, isInternal: boolean = false) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const { data: message, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        content,
        sender_id: user.id,
        is_internal: isInternal
      })
      .select()
      .single()

    if (error) {
      console.error('Add message error:', error)
      return { success: false, error: 'Fehler beim Senden der Nachricht' }
    }

    revalidatePath(`/tickets/${ticketId}`)
    return { success: true, data: message }
  } catch (error) {
    console.error('Add message error:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

export async function deleteTicket(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Check if user owns this ticket
    const { data: ticket } = await supabase
      .from('tickets')
      .select('created_by')
      .eq('id', id)
      .single()

    if (!ticket || ticket.created_by !== user.id) {
      return { success: false, error: 'Keine Berechtigung' }
    }

    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete ticket error:', error)
      return { success: false, error: 'Fehler beim Löschen' }
    }

    revalidatePath('/tickets')
    return { success: true }
  } catch (error) {
    console.error('Delete ticket error:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

export async function getTags() {
  try {
    // Use admin client to bypass RLS and see all tags
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name')

    if (error) {
      return { success: false, error: 'Fehler beim Laden der Tags', data: [] }
    }

    return { success: true, data: data as Tag[] }
  } catch (error) {
    return { success: false, error: 'Ein Fehler ist aufgetreten', data: [] }
  }
}

export async function getManagers() {
  try {
    // Use admin client to bypass RLS and see all managers/admins
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('role', ['manager', 'admin'])
      .order('first_name')

    if (error) {
      return { success: false, error: 'Fehler beim Laden', data: [] }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: 'Ein Fehler ist aufgetreten', data: [] }
  }
}
