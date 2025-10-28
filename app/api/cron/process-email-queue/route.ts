/**
 * Email Queue Processor - Background Job
 * Processes pending emails from the queue
 * Called by external cron service every 5 minutes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTicketEmail } from '@/lib/email/ticket-mailer'

export const maxDuration = 300 // 5 minutes
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || key !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get pending emails (oldest first, limit to 10 per run)
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_queue')
      .select(`
        *,
        ticket:tickets(
          ticket_number,
          created_by
        )
      `)
      .eq('status', 'pending')
      .lt('attempts', 3) // Only try max 3 times
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) {
      console.error('[Email Queue] Fetch error:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending emails',
        processed: 0
      })
    }

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process each email
    for (const email of pendingEmails) {
      try {
        // Mark as processing
        await supabase
          .from('email_queue')
          .update({
            status: 'processing',
            last_attempt_at: new Date().toISOString(),
            attempts: email.attempts + 1
          })
          .eq('id', email.id)

        // Get user profile for sender info
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', email.ticket.created_by)
          .single()

        const senderName = profile
          ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email
          : 'FLIGHTHOUR Team'

        // Get ticket number
        const ticketNumber = email.ticket.ticket_number ||
          parseInt(email.ticket_id.split('-')[0], 16) % 1000000

        // Get attachments from ticket_attachments table
        const { data: attachments } = await supabase
          .from('ticket_attachments')
          .select('*')
          .eq('ticket_id', email.ticket_id)
          .is('message_id', null) // Only initial ticket attachments

        // Download attachment files from Supabase Storage for email
        const emailAttachments = []
        if (attachments && attachments.length > 0) {
          for (const att of attachments) {
            try {
              const { data: fileData } = await supabase.storage
                .from('ticket-attachments')
                .download(att.storage_path)

              if (fileData) {
                const buffer = Buffer.from(await fileData.arrayBuffer())
                emailAttachments.push({
                  filename: att.original_filename,
                  content: buffer,
                  contentType: att.mime_type
                })
              }
            } catch (downloadError) {
              console.error('[Email Queue] Attachment download failed:', att.filename, downloadError)
              // Continue without this attachment
            }
          }
        }

        // Send email
        const emailSent = await sendTicketEmail({
          to: email.recipient_email,
          subject: email.subject,
          content: email.content,
          ticketNumber,
          senderName,
          senderEmail: profile?.email || 'info@flighthour.de',
          attachments: emailAttachments.length > 0 ? emailAttachments : undefined
        })

        if (emailSent) {
          // Mark as sent
          await supabase
            .from('email_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              error_message: null
            })
            .eq('id', email.id)

          results.succeeded++
          console.log(`[Email Queue] Sent email ${email.id} successfully`)
        } else {
          throw new Error('Email sending returned false')
        }

        results.processed++

      } catch (emailError) {
        console.error(`[Email Queue] Error processing email ${email.id}:`, emailError)

        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error'
        const newAttempts = email.attempts + 1

        // Check if max attempts reached
        if (newAttempts >= 3) {
          // Mark as failed
          await supabase
            .from('email_queue')
            .update({
              status: 'failed',
              error_message: errorMessage
            })
            .eq('id', email.id)

          console.log(`[Email Queue] Email ${email.id} marked as failed after ${newAttempts} attempts`)
        } else {
          // Reset to pending for retry
          await supabase
            .from('email_queue')
            .update({
              status: 'pending',
              error_message: errorMessage
            })
            .eq('id', email.id)

          console.log(`[Email Queue] Email ${email.id} will be retried (attempt ${newAttempts}/3)`)
        }

        results.failed++
        results.errors.push(`Email ${email.id}: ${errorMessage}`)
      }
    }

    return NextResponse.json({
      success: true,
      ...results
    })

  } catch (error) {
    console.error('[Email Queue] Fatal error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
