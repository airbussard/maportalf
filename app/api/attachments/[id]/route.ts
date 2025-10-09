import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Fetch attachment with ticket information
    const { data: attachment, error: attachmentError } = await supabase
      .from('ticket_attachments')
      .select(`
        *,
        ticket:tickets(id, created_by, assigned_to)
      `)
      .eq('id', id)
      .single()

    if (attachmentError || !attachment) {
      return NextResponse.json({ error: 'Anhang nicht gefunden' }, { status: 404 })
    }

    // Check permissions
    const ticket = attachment.ticket as any
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'admin'
    const canAccess =
      ticket.created_by === user.id ||
      ticket.assigned_to === user.id ||
      isManagerOrAdmin

    if (!canAccess) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Read file from disk
    const localPath = path.join(process.cwd(), 'uploads', attachment.storage_path)

    if (!existsSync(localPath)) {
      return NextResponse.json({ error: 'Datei nicht gefunden' }, { status: 404 })
    }

    // Security check: Verify path is within uploads directory
    const realPath = path.resolve(localPath)
    const uploadsPath = path.resolve(process.cwd(), 'uploads')
    if (!realPath.startsWith(uploadsPath)) {
      return NextResponse.json({ error: 'Ungültiger Dateipfad' }, { status: 403 })
    }

    // Read file
    const fileBuffer = await readFile(localPath)

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(fileBuffer)

    // Return file with appropriate headers
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': attachment.mime_type,
        'Content-Disposition': `attachment; filename="${attachment.original_filename}"`,
        'Content-Length': attachment.size_bytes.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error: any) {
    console.error('Download error:', error)
    return NextResponse.json({ error: error.message || 'Fehler beim Download' }, { status: 500 })
  }
}
