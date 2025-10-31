/**
 * Email Attachment Processing for IMAP
 * Handles attachment extraction and upload to Supabase Storage
 * Ported from PHP cron/fetch-emails.php
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeFilename } from './imap-helpers'
import type { ParsedMail, Attachment as MailparserAttachment } from 'mailparser'

export interface ProcessedAttachment {
  filename: string
  originalFilename: string
  data: Buffer
  size: number
  mimeType: string
  contentId?: string
  isInline: boolean
}

/**
 * Process all attachments from a parsed email
 * Identisch zur PHP-Funktion processEmailAttachments()
 */
export async function processEmailAttachments(
  mail: ParsedMail,
  ticketId: string,
  messageId?: string
): Promise<number> {
  const attachments: ProcessedAttachment[] = []

  console.log('[ATTACHMENTS] Starting attachment processing for ticket:', ticketId)

  // Extract attachments from mailparser
  if (mail.attachments && mail.attachments.length > 0) {
    console.log('[ATTACHMENTS] Found', mail.attachments.length, 'attachments')

    for (const att of mail.attachments) {
      const processed = processMailparserAttachment(att)
      if (processed) {
        attachments.push(processed)
        console.log('[ATTACHMENTS] Processed:', processed.originalFilename, `(${processed.size} bytes)`)
      }
    }
  } else {
    console.log('[ATTACHMENTS] No attachments found in email')
  }

  console.log('[ATTACHMENTS] Total attachments to save:', attachments.length)

  // Save each attachment to Supabase Storage
  let savedCount = 0
  for (const [idx, attachment] of attachments.entries()) {
    console.log(`[ATTACHMENTS] Saving attachment ${idx + 1}/${attachments.length}:`, attachment.originalFilename)

    const saved = await uploadToSupabaseStorage(attachment, ticketId, messageId)
    if (saved) {
      savedCount++
      console.log('[ATTACHMENTS] ✅ Saved successfully:', attachment.originalFilename)
    } else {
      console.error('[ATTACHMENTS] ❌ Failed to save:', attachment.originalFilename)
    }
  }

  console.log(`[ATTACHMENTS] Completed: ${savedCount}/${attachments.length} attachments saved`)
  return savedCount
}

/**
 * Convert mailparser attachment to our format
 */
function processMailparserAttachment(att: MailparserAttachment): ProcessedAttachment | null {
  try {
    // Skip if no filename (shouldn't happen with mailparser)
    if (!att.filename) {
      console.warn('[ATTACHMENTS] Skipping attachment without filename')
      return null
    }

    // Determine if inline
    const isInline = att.contentDisposition === 'inline'

    // Get content-id if present (for inline images)
    const contentId = att.contentId ? att.contentId.replace(/^<|>$/g, '') : undefined

    return {
      filename: sanitizeFilename(att.filename),
      originalFilename: att.filename,
      data: att.content,
      size: att.size || att.content.length,
      mimeType: att.contentType || 'application/octet-stream',
      contentId,
      isInline
    }
  } catch (error) {
    console.error('[ATTACHMENTS] Error processing attachment:', error)
    return null
  }
}

/**
 * Upload attachment to Supabase Storage and create database entry
 * Ersetzt PHP-Funktion saveAttachmentToSupabase() - WICHTIGSTE ÄNDERUNG!
 */
async function uploadToSupabaseStorage(
  attachment: ProcessedAttachment,
  ticketId: string,
  messageId?: string
): Promise<boolean> {
  try {
    const supabase = createAdminClient()

    // Generate unique filename with timestamp
    const extension = attachment.originalFilename.split('.').pop() || 'dat'
    const uniqueFilename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`
    const storagePath = `tickets/${ticketId}/${uniqueFilename}`

    console.log('[ATTACHMENTS] Uploading to Supabase Storage:', storagePath)

    // ===== KRITISCHE ÄNDERUNG: Echter Upload zu Supabase Storage =====
    // PHP hat nur lokal gespeichert, wir laden jetzt in den Bucket hoch!
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ticket-attachments')
      .upload(storagePath, attachment.data, {
        contentType: attachment.mimeType,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('[ATTACHMENTS] Storage upload error:', uploadError)
      return false
    }

    console.log('[ATTACHMENTS] File uploaded to storage:', uploadData.path)

    // Create database entry in ticket_attachments
    const attachmentData = {
      ticket_id: ticketId,
      message_id: messageId || null,
      filename: uniqueFilename,
      original_filename: attachment.originalFilename,
      mime_type: attachment.mimeType,
      size_bytes: attachment.size,
      storage_path: storagePath,
      is_inline: attachment.isInline,
      content_id: attachment.contentId || null
    }

    const { data: dbData, error: dbError } = await supabase
      .from('ticket_attachments')
      .insert(attachmentData)
      .select()
      .single()

    if (dbError) {
      console.error('[ATTACHMENTS] Database insert error:', dbError)

      // Clean up uploaded file if database insert failed
      console.log('[ATTACHMENTS] Cleaning up uploaded file due to DB error')
      await supabase.storage
        .from('ticket-attachments')
        .remove([storagePath])

      return false
    }

    console.log('[ATTACHMENTS] Database entry created:', dbData.id)
    return true

  } catch (error) {
    console.error('[ATTACHMENTS] Exception in uploadToSupabaseStorage:', error)
    return false
  }
}

/**
 * Get public URL for an attachment (for email notifications)
 */
export async function getAttachmentPublicUrl(storagePath: string): Promise<string | null> {
  try {
    const supabase = createAdminClient()

    const { data } = supabase.storage
      .from('ticket-attachments')
      .getPublicUrl(storagePath)

    return data.publicUrl
  } catch (error) {
    console.error('[ATTACHMENTS] Error getting public URL:', error)
    return null
  }
}
