'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type {
  ResponseTemplate,
  TemplateCategory,
  TemplateWithAttachments,
  TemplatesByCategory,
  TemplateAttachment,
  CategoryLabels
} from '@/lib/types/template'

/**
 * Helper: Check if user is manager or admin
 */
async function checkManagerOrAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { authorized: false, error: 'Nicht angemeldet' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['manager', 'admin'].includes(profile.role)) {
    return { authorized: false, error: 'Keine Berechtigung. Nur Manager und Administratoren können Vorlagen verwalten.' }
  }

  return { authorized: true, user }
}

/**
 * Get all templates (without attachments)
 */
export async function getTemplates(): Promise<{ success: boolean; data: ResponseTemplate[]; error?: string }> {
  try {
    const auth = await checkManagerOrAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error, data: [] }
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('ticket_response_templates')
      .select('*')
      .order('category')
      .order('name')

    if (error) {
      console.error('Get templates error:', error)
      return { success: false, error: 'Fehler beim Laden der Vorlagen', data: [] }
    }

    return { success: true, data: data as ResponseTemplate[] }
  } catch (error) {
    console.error('Get templates exception:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten', data: [] }
  }
}

/**
 * Get all templates with their attachments
 */
export async function getTemplatesWithAttachments(): Promise<{ success: boolean; data: TemplateWithAttachments[]; error?: string }> {
  try {
    const auth = await checkManagerOrAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error, data: [] }
    }

    const supabase = createAdminClient()

    // Get templates
    const { data: templates, error: templatesError } = await supabase
      .from('ticket_response_templates')
      .select('*')
      .order('category')
      .order('name')

    if (templatesError) {
      console.error('Get templates error:', templatesError)
      return { success: false, error: 'Fehler beim Laden der Vorlagen', data: [] }
    }

    if (!templates || templates.length === 0) {
      return { success: true, data: [] }
    }

    // Get all attachments for these templates
    const templateIds = templates.map(t => t.id)
    const { data: attachments, error: attachmentsError } = await supabase
      .from('template_attachments')
      .select('*')
      .in('template_id', templateIds)

    if (attachmentsError) {
      console.error('Get attachments error:', attachmentsError)
      // Continue without attachments rather than failing
    }

    // Map attachments to templates
    const templatesWithAttachments: TemplateWithAttachments[] = templates.map(template => ({
      ...template,
      attachments: attachments?.filter(att => att.template_id === template.id) || []
    }))

    return { success: true, data: templatesWithAttachments }
  } catch (error) {
    console.error('Get templates with attachments exception:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten', data: [] }
  }
}

/**
 * Get templates grouped by category
 */
export async function getTemplatesByCategory(): Promise<{ success: boolean; data: TemplatesByCategory[]; error?: string }> {
  try {
    const result = await getTemplatesWithAttachments()
    if (!result.success) {
      return { success: false, error: result.error || 'Ein Fehler ist aufgetreten', data: [] }
    }

    const categoryLabels: Record<TemplateCategory, string> = {
      greeting: 'Begrüßungen',
      closing: 'Abschlüsse',
      technical: 'Technische Antworten',
      booking: 'Buchungen',
      flight: 'Flüge',
      general: 'Allgemein'
    }

    // Group by category
    const grouped = result.data.reduce((acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = []
      }
      acc[template.category].push(template)
      return acc
    }, {} as Record<TemplateCategory, TemplateWithAttachments[]>)

    // Convert to array format
    const categorized: TemplatesByCategory[] = Object.entries(grouped).map(([category, templates]) => ({
      category: category as TemplateCategory,
      categoryLabel: categoryLabels[category as TemplateCategory],
      templates
    }))

    return { success: true, data: categorized }
  } catch (error) {
    console.error('Get templates by category exception:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten', data: [] }
  }
}

/**
 * Get single template with attachments
 */
export async function getTemplate(id: string): Promise<{ success: boolean; data: TemplateWithAttachments | null; error?: string }> {
  try {
    const auth = await checkManagerOrAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error, data: null }
    }

    const supabase = createAdminClient()

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('ticket_response_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (templateError) {
      console.error('Get template error:', templateError)
      return { success: false, error: 'Vorlage nicht gefunden', data: null }
    }

    // Get attachments
    const { data: attachments, error: attachmentsError } = await supabase
      .from('template_attachments')
      .select('*')
      .eq('template_id', id)

    if (attachmentsError) {
      console.error('Get attachments error:', attachmentsError)
    }

    const templateWithAttachments: TemplateWithAttachments = {
      ...template,
      attachments: attachments || []
    }

    return { success: true, data: templateWithAttachments }
  } catch (error) {
    console.error('Get template exception:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten', data: null }
  }
}

/**
 * Create new template
 */
export async function createTemplate(data: {
  name: string
  content: string
  category: TemplateCategory
}) {
  try {
    const auth = await checkManagerOrAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

    // Validate input
    if (!data.name || data.name.trim().length === 0) {
      return { success: false, error: 'Name ist erforderlich' }
    }

    if (!data.content || data.content.trim().length === 0) {
      return { success: false, error: 'Inhalt ist erforderlich' }
    }

    if (!data.category) {
      return { success: false, error: 'Kategorie ist erforderlich' }
    }

    const supabase = await createClient()
    const { data: template, error } = await supabase
      .from('ticket_response_templates')
      .insert({
        name: data.name.trim(),
        content: data.content.trim(),
        category: data.category,
        created_by: auth.user?.id
      })
      .select()
      .single()

    if (error) {
      console.error('Create template error:', error)
      return { success: false, error: 'Fehler beim Erstellen der Vorlage' }
    }

    revalidatePath('/templates')
    revalidatePath('/tickets')
    return { success: true, data: template }
  } catch (error) {
    console.error('Create template exception:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

/**
 * Update existing template
 */
export async function updateTemplate(
  id: string,
  data: {
    name: string
    content: string
    category: TemplateCategory
  }
) {
  try {
    const auth = await checkManagerOrAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

    // Validate input
    if (!data.name || data.name.trim().length === 0) {
      return { success: false, error: 'Name ist erforderlich' }
    }

    if (!data.content || data.content.trim().length === 0) {
      return { success: false, error: 'Inhalt ist erforderlich' }
    }

    if (!data.category) {
      return { success: false, error: 'Kategorie ist erforderlich' }
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('ticket_response_templates')
      .update({
        name: data.name.trim(),
        content: data.content.trim(),
        category: data.category,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Update template error:', error)
      return { success: false, error: 'Fehler beim Aktualisieren der Vorlage' }
    }

    revalidatePath('/templates')
    revalidatePath('/tickets')
    return { success: true }
  } catch (error) {
    console.error('Update template exception:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

/**
 * Delete template and all its attachments
 */
export async function deleteTemplate(id: string) {
  try {
    const auth = await checkManagerOrAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

    const supabase = await createClient()

    // Get attachments before deleting template
    const { data: attachments } = await supabase
      .from('template_attachments')
      .select('storage_path')
      .eq('template_id', id)

    // Delete from storage
    if (attachments && attachments.length > 0) {
      const paths = attachments.map(att => att.storage_path)
      const { error: storageError } = await supabase.storage
        .from('template-attachments')
        .remove(paths)

      if (storageError) {
        console.error('Delete storage files error:', storageError)
        // Continue anyway - CASCADE will clean up database
      }
    }

    // Delete template (CASCADE will delete attachments from database)
    const { error } = await supabase
      .from('ticket_response_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete template error:', error)
      return { success: false, error: 'Fehler beim Löschen der Vorlage' }
    }

    revalidatePath('/templates')
    revalidatePath('/tickets')
    return { success: true }
  } catch (error) {
    console.error('Delete template exception:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

/**
 * Get attachments for a template
 */
export async function getTemplateAttachments(templateId: string) {
  try {
    const auth = await checkManagerOrAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error, data: [] }
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('template_attachments')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at')

    if (error) {
      console.error('Get template attachments error:', error)
      return { success: false, error: 'Fehler beim Laden der Anhänge', data: [] }
    }

    return { success: true, data: data as TemplateAttachment[] }
  } catch (error) {
    console.error('Get template attachments exception:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten', data: [] }
  }
}

/**
 * Delete a single attachment
 */
export async function deleteTemplateAttachment(id: string) {
  try {
    const auth = await checkManagerOrAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

    const supabase = await createClient()

    // Get attachment info for storage deletion
    const { data: attachment } = await supabase
      .from('template_attachments')
      .select('storage_path, template_id')
      .eq('id', id)
      .single()

    if (!attachment) {
      return { success: false, error: 'Anhang nicht gefunden' }
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('template-attachments')
      .remove([attachment.storage_path])

    if (storageError) {
      console.error('Delete storage file error:', storageError)
      // Continue anyway
    }

    // Delete from database
    const { error } = await supabase
      .from('template_attachments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete attachment error:', error)
      return { success: false, error: 'Fehler beim Löschen des Anhangs' }
    }

    revalidatePath('/templates')
    return { success: true }
  } catch (error) {
    console.error('Delete template attachment exception:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}
