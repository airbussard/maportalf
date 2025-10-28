import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

    // Download file from Supabase Storage
    console.log('[Attachment Download] Downloading from storage:', attachment.storage_path)

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('ticket-attachments')
      .download(attachment.storage_path)

    if (downloadError || !fileData) {
      console.error('[Attachment Download] Error:', downloadError)
      return NextResponse.json({ error: 'Datei nicht gefunden' }, { status: 404 })
    }

    // Convert Blob to Buffer
    const buffer = Buffer.from(await fileData.arrayBuffer())

    console.log('[Attachment Download] Successfully downloaded:', attachment.original_filename, buffer.length, 'bytes')

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': attachment.mime_type,
        'Content-Disposition': `attachment; filename="${attachment.original_filename}"`,
        'Content-Length': buffer.length.toString(),
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
