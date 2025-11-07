/**
 * Type definitions for Response Template System
 * Used for ticket reply templates with file attachments
 */

export type TemplateCategory =
  | 'greeting'   // Begrüßungen
  | 'closing'    // Abschlüsse
  | 'technical'  // Technische Antworten
  | 'booking'    // Buchungs-bezogen
  | 'flight'     // Flug-bezogen
  | 'general'    // Allgemein

export interface ResponseTemplate {
  id: string
  name: string
  content: string
  category: TemplateCategory
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TemplateAttachment {
  id: string
  template_id: string
  filename: string
  original_filename: string
  mime_type: string
  size_bytes: number
  storage_path: string
  uploaded_by: string | null
  created_at: string
}

export interface TemplateWithAttachments extends ResponseTemplate {
  attachments: TemplateAttachment[]
}

export interface TemplatesByCategory {
  category: TemplateCategory
  categoryLabel: string
  templates: TemplateWithAttachments[]
}

export const CategoryLabels: Record<TemplateCategory, string> = {
  greeting: 'Begrüßungen',
  closing: 'Abschlüsse',
  technical: 'Technische Antworten',
  booking: 'Buchungen',
  flight: 'Flüge',
  general: 'Allgemein'
}
