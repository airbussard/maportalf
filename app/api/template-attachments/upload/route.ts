/**
 * Template Attachment Upload API
 * Handles file uploads for response templates
 * Only accessible by managers and admins
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// File size limit: 25 MB
const MAX_FILE_SIZE = 25 * 1024 * 1024

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Documents
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  // Text
  'text/plain',
  'text/csv',
  // Archives
  'application/zip'
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    }

    // Check if user is manager or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['manager', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung. Nur Manager und Administratoren können Anhänge hochladen.' },
        { status: 403 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const templateId = formData.get('templateId') as string

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei ausgewählt' }, { status: 400 })
    }

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID fehlt' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Datei zu groß. Maximum: ${MAX_FILE_SIZE / 1024 / 1024} MB` },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Dateityp nicht erlaubt' },
        { status: 400 }
      )
    }

    // Verify template exists
    const { data: template, error: templateError } = await supabase
      .from('ticket_response_templates')
      .select('id')
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Vorlage nicht gefunden' }, { status: 404 })
    }

    // Generate safe filename
    const originalFilename = file.name
    const extension = originalFilename.split('.').pop()
    const safeFilename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`
    const storagePath = `${templateId}/${safeFilename}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('template-attachments')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Fehler beim Hochladen der Datei' },
        { status: 500 }
      )
    }

    // Save attachment metadata to database
    const { data: attachment, error: dbError } = await supabase
      .from('template_attachments')
      .insert({
        template_id: templateId,
        filename: safeFilename,
        original_filename: originalFilename,
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: storagePath,
        uploaded_by: user.id
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)

      // Try to clean up uploaded file
      await supabase.storage
        .from('template-attachments')
        .remove([storagePath])

      return NextResponse.json(
        { error: 'Fehler beim Speichern der Anhang-Informationen' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      attachment: {
        id: attachment.id,
        filename: attachment.original_filename,
        size: attachment.size_bytes,
        mimeType: attachment.mime_type
      }
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}
