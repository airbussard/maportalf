'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface Tag {
  id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

export interface EmailRule {
  id: string
  tag_id: string
  email_address: string
  create_ticket: boolean
  use_reply_to?: boolean
  created_at: string
}

export interface BlacklistEntry {
  id: string
  email_address: string
  reason?: string
  created_at: string
}

// ==================== TAGS ====================

export async function getTags() {
  try {
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

export async function getTagsWithCounts() {
  try {
    const supabase = createAdminClient()

    // Get all tags
    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('*')
      .order('name')

    if (tagsError) {
      return { success: false, error: 'Fehler beim Laden der Tags', data: [] }
    }

    // Get ticket counts per tag
    const { data: ticketTags, error: countError } = await supabase
      .from('ticket_tags')
      .select('tag_id')

    if (countError) {
      return { success: true, data: tags.map(tag => ({ ...tag, ticket_count: 0 })) }
    }

    // Count tickets per tag
    const counts: Record<string, number> = {}
    ticketTags?.forEach(tt => {
      counts[tt.tag_id] = (counts[tt.tag_id] || 0) + 1
    })

    // Add counts to tags
    const tagsWithCounts = tags.map(tag => ({
      ...tag,
      ticket_count: counts[tag.id] || 0
    }))

    return { success: true, data: tagsWithCounts }
  } catch (error) {
    return { success: false, error: 'Ein Fehler ist aufgetreten', data: [] }
  }
}

export async function createTag(data: { name: string; color: string }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht angemeldet' }
    }

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['manager', 'admin'].includes(profile.role)) {
      return { success: false, error: 'Keine Berechtigung' }
    }

    const { data: tag, error } = await supabase
      .from('tags')
      .insert({
        name: data.name.trim(),
        color: data.color
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: 'Fehler beim Erstellen des Tags' }
    }

    revalidatePath('/tags')
    return { success: true, data: tag }
  } catch (error) {
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

export async function updateTag(id: string, data: { name: string; color: string }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht angemeldet' }
    }

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['manager', 'admin'].includes(profile.role)) {
      return { success: false, error: 'Keine Berechtigung' }
    }

    const { error } = await supabase
      .from('tags')
      .update({
        name: data.name.trim(),
        color: data.color,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      return { success: false, error: 'Fehler beim Aktualisieren des Tags' }
    }

    revalidatePath('/tags')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

export async function deleteTag(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht angemeldet' }
    }

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['manager', 'admin'].includes(profile.role)) {
      return { success: false, error: 'Keine Berechtigung' }
    }

    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: 'Fehler beim Löschen des Tags' }
    }

    revalidatePath('/tags')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

// ==================== EMAIL RULES ====================

export async function getEmailRules(tagId: string) {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('tag_email_rules')
      .select('*')
      .eq('tag_id', tagId)
      .order('email_address')

    if (error) {
      return { success: false, error: 'Fehler beim Laden der Regeln', data: [] }
    }

    return { success: true, data: data as EmailRule[] }
  } catch (error) {
    return { success: false, error: 'Ein Fehler ist aufgetreten', data: [] }
  }
}

export async function createEmailRule(data: {
  tag_id: string
  email_address: string
  create_ticket: boolean
  use_reply_to?: boolean
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht angemeldet' }
    }

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['manager', 'admin'].includes(profile.role)) {
      return { success: false, error: 'Keine Berechtigung' }
    }

    const { error } = await supabase
      .from('tag_email_rules')
      .insert({
        tag_id: data.tag_id,
        email_address: data.email_address.toLowerCase().trim(),
        create_ticket: data.create_ticket,
        use_reply_to: data.use_reply_to || false
      })

    if (error) {
      return { success: false, error: 'Fehler beim Erstellen der Regel' }
    }

    revalidatePath('/tags')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

export async function deleteEmailRule(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht angemeldet' }
    }

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['manager', 'admin'].includes(profile.role)) {
      return { success: false, error: 'Keine Berechtigung' }
    }

    const { error } = await supabase
      .from('tag_email_rules')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: 'Fehler beim Löschen der Regel' }
    }

    revalidatePath('/tags')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

// ==================== BLACKLIST ====================

export async function getBlacklist() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('email_blacklist')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: 'Fehler beim Laden der Blacklist', data: [] }
    }

    return { success: true, data: data as BlacklistEntry[] }
  } catch (error) {
    return { success: false, error: 'Ein Fehler ist aufgetreten', data: [] }
  }
}

export async function addToBlacklist(data: { email_address: string; reason?: string }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht angemeldet' }
    }

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['manager', 'admin'].includes(profile.role)) {
      return { success: false, error: 'Keine Berechtigung' }
    }

    const { error } = await supabase
      .from('email_blacklist')
      .insert({
        email_address: data.email_address.toLowerCase().trim(),
        reason: data.reason?.trim() || null
      })

    if (error) {
      return { success: false, error: 'Fehler beim Hinzufügen zur Blacklist' }
    }

    revalidatePath('/tags')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

export async function removeFromBlacklist(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht angemeldet' }
    }

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['manager', 'admin'].includes(profile.role)) {
      return { success: false, error: 'Keine Berechtigung' }
    }

    const { error } = await supabase
      .from('email_blacklist')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: 'Fehler beim Entfernen aus der Blacklist' }
    }

    revalidatePath('/tags')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}
