/**
 * Email Queue Processor - Background Job
 * Processes pending emails from the queue
 * Called by external cron service every 5 minutes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTicketEmail, sendTicketCreationEmail, sendTicketAssignmentEmail } from '@/lib/email/ticket-mailer'
import { sendWorkRequestEmail } from '@/lib/email/work-request-mailer'

export const maxDuration = 300 // 5 minutes
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
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
        console.log(`[Email Queue] Processing email ${email.id} (attempt ${email.attempts + 1}/3)`)

        // Mark as processing (prevents duplicate sends if cron runs multiple times)
        await supabase
          .from('email_queue')
          .update({
            status: 'processing',
            last_attempt_at: new Date().toISOString(),
            attempts: email.attempts + 1
          })
          .eq('id', email.id)

        // Send email using appropriate template based on type
        let emailSent = false

        if (email.type === 'work_request') {
          // Work request notification - handle separately (no ticket required)
          console.log('[Email Queue] Sending work request notification')

          try {
            const emailData = JSON.parse(email.content)

            emailSent = await sendWorkRequestEmail({
              requestId: emailData.requestId,
              employeeName: emailData.employeeName,
              requestType: emailData.requestType,
              startDate: emailData.startDate,
              endDate: emailData.endDate,
              reason: emailData.reason,
              approveToken: emailData.approveToken,
              rejectToken: emailData.rejectToken,
              recipientEmail: email.recipient_email,
              recipientName: emailData.recipientName
            })
          } catch (parseError) {
            console.error('[Email Queue] Error parsing work request data:', parseError)
            throw new Error('Invalid work request email data')
          }
        } else {
          // Ticket-related emails - need ticket data
          if (!email.ticket) {
            console.error('[Email Queue] No ticket data for ticket-related email:', email.id)
            throw new Error('Missing ticket data for ticket email')
          }

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
          console.log('[Email Queue] Looking for attachments for ticket_id:', email.ticket_id, 'message_id:', email.message_id || 'null')

          // If message_id is set, get attachments for that specific message (ticket reply)
          // Otherwise get initial ticket attachments (message_id = null)
          let attachmentsQuery = supabase
            .from('ticket_attachments')
            .select('*')
            .eq('ticket_id', email.ticket_id)

          if (email.message_id) {
            // Ticket reply - get attachments for this specific message
            attachmentsQuery = attachmentsQuery.eq('message_id', email.message_id)
          } else {
            // Initial ticket - get attachments without message_id
            attachmentsQuery = attachmentsQuery.is('message_id', null)
          }

          const { data: attachments, error: attachmentsError } = await attachmentsQuery

          if (attachmentsError) {
            console.error('[Email Queue] Error fetching attachments:', attachmentsError)
          }

          console.log('[Email Queue] Found attachments:', attachments?.length || 0)
          if (attachments && attachments.length > 0) {
            console.log('[Email Queue] Attachment details:', attachments.map(a => ({
              filename: a.original_filename,
              storage_path: a.storage_path,
              size: a.size_bytes
            })))
          }

          // Download attachment files from Supabase Storage for email
          const emailAttachments = []

          // Handle ticket attachments (ticket_attachments table)
          if (attachments && attachments.length > 0) {
            for (const att of attachments) {
              try {
                console.log('[Email Queue] Downloading ticket attachment from storage:', att.storage_path)

                const { data: fileData, error: downloadError } = await supabase.storage
                  .from('ticket-attachments')
                  .download(att.storage_path)

                if (downloadError) {
                  console.error('[Email Queue] Storage download error:', downloadError)
                  continue
                }

                if (fileData) {
                  const buffer = Buffer.from(await fileData.arrayBuffer())
                  console.log('[Email Queue] Downloaded successfully:', att.original_filename, buffer.length, 'bytes')

                  emailAttachments.push({
                    filename: att.original_filename,
                    content: buffer,
                    contentType: att.mime_type
                  })
                } else {
                  console.error('[Email Queue] No file data returned for:', att.storage_path)
                }
              } catch (downloadError) {
                console.error('[Email Queue] Attachment download failed:', att.filename, downloadError)
                // Continue without this attachment
              }
            }
          }

          // Handle booking confirmation attachments (Pocket Guide PDF)
          if (email.type === 'booking_confirmation') {
            try {
              console.log('[Email Queue] Attaching Pocket Guide PDF for booking confirmation')
              const fs = await import('fs')
              const path = await import('path')

              // Pocket Guide is always in public/attachments/
              const pocketGuidePath = path.join(process.cwd(), 'public', 'attachments', 'Pocket Guide.pdf')
              const pdfBuffer = fs.readFileSync(pocketGuidePath)

              emailAttachments.push({
                filename: 'FLIGHTHOUR_Pocket_Guide.pdf',
                content: pdfBuffer,
                contentType: 'application/pdf'
              })
              console.log('[Email Queue] Pocket Guide attached:', pdfBuffer.length, 'bytes')
            } catch (pocketError) {
              console.error('[Email Queue] Failed to attach Pocket Guide:', pocketError)
              // Continue without attachment
            }
          }

          // Handle time report attachments (email_queue.attachment_storage_path)
          if (email.type === 'work_request' && email.attachment_storage_path) {
            try {
              console.log('[Email Queue] Downloading time report from storage:', email.attachment_storage_path)

              const { data: fileData, error: downloadError } = await supabase.storage
                .from('time-reports')
                .download(email.attachment_storage_path)

              if (downloadError) {
                console.error('[Email Queue] Storage download error:', downloadError)
              } else if (fileData) {
                const buffer = Buffer.from(await fileData.arrayBuffer())
                console.log('[Email Queue] Downloaded time report:', buffer.length, 'bytes')

                emailAttachments.push({
                  filename: email.attachment_filename || 'zeiterfassung.pdf',
                  content: buffer,
                  contentType: 'application/pdf'
                })
              }
            } catch (downloadError) {
              console.error('[Email Queue] Time report download failed:', downloadError)
              // Continue without this attachment
            }
          }

          console.log('[Email Queue] Total attachments ready for email:', emailAttachments.length)

          if (email.type === 'ticket') {
          // Ticket creation confirmation
          console.log('[Email Queue] Sending ticket creation confirmation')
          emailSent = await sendTicketCreationEmail({
            to: email.recipient_email,
            subject: email.subject,
            content: email.content,
            ticketNumber,
            senderName: 'FLIGHTHOUR Team',
            senderEmail: 'info@flighthour.de',
            attachments: emailAttachments.length > 0 ? emailAttachments : undefined
          })
        } else if (email.type === 'ticket_assignment') {
          // Ticket assignment notification
          console.log('[Email Queue] Sending ticket assignment notification')

          // Parse body to extract assignee name and ticket URL
          // body format: JSON or plain text with name and URL
          let assigneeName = 'Team-Mitglied'
          let ticketUrl = `https://flighthour.getemergence.com/tickets/${email.ticket_id}`

          try {
            // Try to extract name from content field
            const match = email.content?.match(/Hallo (.+?),/)
            if (match) {
              assigneeName = match[1]
            }
          } catch (e) {
            console.log('[Email Queue] Could not parse assignee name, using default')
          }

          emailSent = await sendTicketAssignmentEmail({
            to: email.recipient_email,
            assigneeName,
            ticketNumber,
            ticketSubject: email.subject.replace(/^Neues Ticket zugewiesen: \[TICKET-\d+\] /, ''),
            ticketUrl
          })
          } else {
            // Ticket reply or other types
            console.log('[Email Queue] Sending ticket reply/update')
            emailSent = await sendTicketEmail({
              to: email.recipient_email,
              subject: email.subject,
              content: email.content,
              ticketNumber,
              senderName,
              senderEmail: profile?.email || 'info@flighthour.de',
              attachments: emailAttachments.length > 0 ? emailAttachments : undefined
            })
          }
        }

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
          // Reset to pending for retry, but ONLY if not already sent
          // This prevents duplicate sends if email was sent but logging failed
          const { data: currentEmail } = await supabase
            .from('email_queue')
            .select('sent_at, status')
            .eq('id', email.id)
            .single()

          // Only reset to pending if email was definitely NOT sent
          if (!currentEmail?.sent_at && currentEmail?.status !== 'sent') {
            await supabase
              .from('email_queue')
              .update({
                status: 'pending',
                error_message: errorMessage
              })
              .eq('id', email.id)

            console.log(`[Email Queue] Email ${email.id} will be retried (attempt ${newAttempts}/3)`)
          } else {
            console.log(`[Email Queue] Email ${email.id} was already sent, not retrying`)
          }
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
