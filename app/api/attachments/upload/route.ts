import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed'
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('attachment') as File
    const ticketId = formData.get('ticket_id') as string
    const messageId = formData.get('message_id') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 })
    }

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID fehlt' }, { status: 400 })
    }

    // Check ticket access
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, created_by, assigned_to')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 })
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'admin'
    const canUpload =
      ticket.created_by === user.id ||
      ticket.assigned_to === user.id ||
      isManagerOrAdmin

    if (!canUpload) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Datei zu groß (max. 25 MB)' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Dateityp nicht erlaubt' }, { status: 400 })
    }

    // Generate unique filename
    const extension = path.extname(file.name)
    const safeFilename = `${Date.now()}_${Math.random().toString(36).substring(7)}${extension}`
    const storagePath = `tickets/${ticketId}/${safeFilename}`

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', 'tickets', ticketId)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save file to disk
    const localPath = path.join(uploadDir, safeFilename)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(localPath, buffer)

    // Create database entry
    const { data: attachment, error: dbError } = await supabase
      .from('ticket_attachments')
      .insert({
        ticket_id: ticketId,
        message_id: messageId || null,
        filename: safeFilename,
        original_filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: storagePath,
        uploaded_by: user.id
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Fehler beim Speichern in Datenbank' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      attachment
    })

  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message || 'Fehler beim Hochladen' }, { status: 500 })
  }
}
