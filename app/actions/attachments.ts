'use server'

import { createClient } from '@/lib/supabase/server'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import type { TicketAttachment } from '@/lib/types/ticket'

interface ActionResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// Get all attachments for a ticket
export async function getTicketAttachments(ticketId: string): Promise<ActionResponse<TicketAttachment[]>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const { data, error } = await supabase
      .from('ticket_attachments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching attachments:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TicketAttachment[] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Get attachments for a specific message
export async function getMessageAttachments(messageId: string): Promise<ActionResponse<TicketAttachment[]>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const { data, error } = await supabase
      .from('ticket_attachments')
      .select('*')
      .eq('message_id', messageId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching message attachments:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TicketAttachment[] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Get attachments without message_id (directly on ticket)
export async function getTicketDirectAttachments(ticketId: string): Promise<ActionResponse<TicketAttachment[]>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const { data, error } = await supabase
      .from('ticket_attachments')
      .select('*')
      .eq('ticket_id', ticketId)
      .is('message_id', null)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching ticket attachments:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TicketAttachment[] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Delete attachment
export async function deleteAttachment(id: string): Promise<ActionResponse> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Get attachment info first
    const { data: attachment, error: fetchError } = await supabase
      .from('ticket_attachments')
      .select('*, ticket:tickets(created_by, assigned_to)')
      .eq('id', id)
      .single()

    if (fetchError || !attachment) {
      return { success: false, error: 'Anhang nicht gefunden' }
    }

    // Check permissions
    const ticket = attachment.ticket as any
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'admin'
    const canDelete =
      attachment.uploaded_by === user.id ||
      ticket?.created_by === user.id ||
      ticket?.assigned_to === user.id ||
      isManagerOrAdmin

    if (!canDelete) {
      return { success: false, error: 'Keine Berechtigung' }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('ticket_attachments')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting attachment from database:', deleteError)
      return { success: false, error: deleteError.message }
    }

    // Delete file from disk
    try {
      const localPath = path.join(process.cwd(), 'uploads', attachment.storage_path)
      if (existsSync(localPath)) {
        await unlink(localPath)
      }
    } catch (fileError) {
      console.error('Error deleting file:', fileError)
      // File deletion error is not critical, attachment is already deleted from DB
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Update attachment to link it to a message
export async function linkAttachmentToMessage(attachmentId: string, messageId: string): Promise<ActionResponse> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const { error } = await supabase
      .from('ticket_attachments')
      .update({ message_id: messageId })
      .eq('id', attachmentId)

    if (error) {
      console.error('Error linking attachment to message:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
