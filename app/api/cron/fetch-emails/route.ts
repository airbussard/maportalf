/**
 * FLIGHTHOUR E-Mail Fetcher (Next.js/TypeScript Port)
 * Läuft als Cronjob alle 5 Minuten
 *
 * Portiert von: /cron/fetch-emails.php
 * Hauptänderung: Anhänge werden jetzt in Supabase Storage hochgeladen
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Imap from 'imap'
import { simpleParser, ParsedMail } from 'mailparser'
import { Readable } from 'stream'
import {
  detectPriority,
  cleanForJson,
  cleanHtmlForStorage,
  plainTextToHtml,
  extractTicketInfo
} from '@/lib/email/imap-helpers'
import { processEmailAttachments } from '@/lib/email/attachment-processor'

export const maxDuration = 300 // 5 minutes
export const dynamic = 'force-dynamic'

interface EmailSettings {
  imap_host: string
  imap_port: number
  imap_username: string
  imap_password: string
  smtp_host: string
  smtp_port: number
  smtp_username: string
  smtp_password: string
}

interface ProcessingStats {
  processed: number
  created: number
  replied: number
  errors: string[]
}

/**
 * GET /api/cron/fetch-emails
 * Fetches unread emails from IMAP and creates/updates tickets
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[Email Fetch] Starting IMAP email fetch...')

    const supabase = createAdminClient()

    // Load email settings from database (like PHP version)
    const { data: emailSettings, error: settingsError } = await supabase
      .from('email_settings')
      .select('*')
      .eq('is_active', true)
      .single()

    if (settingsError || !emailSettings) {
      console.error('[Email Fetch] No active email settings found')
      return NextResponse.json({
        error: 'Email settings not configured',
        processed: 0
      }, { status: 500 })
    }

    console.log('[Email Fetch] Using IMAP:', emailSettings.imap_host)

    // Process emails
    const stats = await fetchAndProcessEmails(emailSettings as EmailSettings, supabase)

    const duration = Date.now() - startTime

    console.log('[Email Fetch] Completed:', {
      processed: stats.processed,
      created: stats.created,
      replied: stats.replied,
      errors: stats.errors.length,
      duration: `${duration}ms`
    })

    return NextResponse.json({
      success: true,
      message: `Processed ${stats.processed} emails`,
      processed: stats.processed,
      created: stats.created,
      replied: stats.replied,
      errors: stats.errors.length > 0 ? stats.errors : undefined,
      duration
    })

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[Email Fetch] Fatal error:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processed: 0,
      duration
    }, { status: 500 })
  }
}

/**
 * Fetch and process emails from IMAP server
 * Core logic ported from PHP
 */
async function fetchAndProcessEmails(
  settings: EmailSettings,
  supabase: ReturnType<typeof createAdminClient>
): Promise<ProcessingStats> {
  const stats: ProcessingStats = {
    processed: 0,
    created: 0,
    replied: 0,
    errors: []
  }

  return new Promise((resolve, reject) => {
    // Create IMAP connection (like PHP imap_open)
    const imap = new Imap({
      user: settings.imap_username,
      password: settings.imap_password,
      host: settings.imap_host,
      port: settings.imap_port,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    })

    imap.once('ready', () => {
      console.log('[IMAP] Connected successfully')

      // Open INBOX
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          console.error('[IMAP] Error opening inbox:', err)
          imap.end()
          return reject(err)
        }

        console.log('[IMAP] Inbox opened, total messages:', box.messages.total)

        // Search for UNSEEN messages (like PHP imap_search)
        imap.search(['UNSEEN'], async (err, results) => {
          if (err) {
            console.error('[IMAP] Search error:', err)
            imap.end()
            return reject(err)
          }

          if (!results || results.length === 0) {
            console.log('[IMAP] No unread emails found')
            imap.end()
            return resolve(stats)
          }

          console.log('[IMAP] Found', results.length, 'unread emails')

          try {
            // Process each email
            for (const uid of results) {
              try {
                await processEmail(uid, imap, supabase, stats)
                stats.processed++
              } catch (emailError) {
                const errorMsg = emailError instanceof Error ? emailError.message : 'Unknown error'
                console.error(`[IMAP] Error processing email ${uid}:`, errorMsg)
                stats.errors.push(`Email ${uid}: ${errorMsg}`)
              }
            }

            imap.end()
            resolve(stats)

          } catch (error) {
            imap.end()
            reject(error)
          }
        })
      })
    })

    imap.once('error', (err: Error) => {
      console.error('[IMAP] Connection error:', err)
      reject(err)
    })

    imap.once('end', () => {
      console.log('[IMAP] Connection closed')
    })

    imap.connect()
  })
}

/**
 * Process a single email
 * Ported from PHP main loop
 */
async function processEmail(
  uid: number,
  imap: Imap,
  supabase: ReturnType<typeof createAdminClient>,
  stats: ProcessingStats
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fetch = imap.fetch([uid], {
      bodies: '',
      markSeen: true // Mark as read (like PHP imap_setflag_full)
    })

    fetch.on('message', (msg) => {
      msg.on('body', async (stream: Readable) => {
        try {
          // Parse email with mailparser (replaces PHP imap_headerinfo + imap_fetchbody)
          const mail = await simpleParser(stream)

          console.log('[Email] Processing:', mail.subject)
          console.log('[Email] From:', mail.from?.text)

          // Extract sender info (with Reply-To priority, like PHP)
          const originalFromEmail = mail.from?.value?.[0]?.address || 'unknown@example.com'
          const originalFromName = mail.from?.value?.[0]?.name || originalFromEmail

          // Check for Reply-To and use it as primary (SAME AS PHP!)
          let fromEmail = originalFromEmail
          let fromName = originalFromName

          if (mail.replyTo && mail.replyTo.value.length > 0) {
            fromEmail = mail.replyTo.value[0].address || fromEmail
            fromName = mail.replyTo.value[0].name || fromEmail
            console.log('[Email] Using Reply-To address:', fromEmail)
          }

          // Extract ticket info from subject (SAME AS PHP!)
          const { ticketId: existingTicketId, ticketNumber: existingTicketNumber } =
            extractTicketInfo(mail.subject || '')

          // Check email rules for auto-tagging (SAME AS PHP!)
          const { data: emailRules } = await supabase
            .from('tag_email_rules')
            .select('*')
            .eq('email_address', fromEmail)

          const shouldSendConfirmation = !emailRules?.some(rule => !rule.create_ticket)
          const autoTagIds = emailRules?.map(rule => rule.tag_id) || []

          // Extract email body (HTML or plain text)
          let body = ''
          if (mail.html) {
            body = cleanHtmlForStorage(mail.html.toString())
          } else if (mail.text) {
            body = plainTextToHtml(mail.text.toString())
          } else {
            body = '<p><em>[Kein Textinhalt verfügbar]</em></p>'
          }

          body = cleanForJson(body)

          // Determine ticket ID
          let ticketId = existingTicketId

          // If numeric ticket number, look up ID
          if (!ticketId && existingTicketNumber) {
            const { data: ticket } = await supabase
              .from('tickets')
              .select('id')
              .eq('ticket_number', existingTicketNumber)
              .single()

            ticketId = ticket?.id || null
          }

          if (ticketId) {
            // ===== REPLY TO EXISTING TICKET (SAME AS PHP!) =====
            console.log('[Email] Adding message to existing ticket:', ticketId)

            // Create ticket message
            const { data: messageData, error: messageError } = await supabase
              .from('ticket_messages')
              .insert({
                ticket_id: ticketId,
                content: body,
                sender_id: null, // External message
                is_internal: false
              })
              .select()
              .single()

            if (messageError) {
              throw new Error(`Failed to create message: ${messageError.message}`)
            }

            // Process attachments with message_id
            if (mail.attachments && mail.attachments.length > 0) {
              const attachmentCount = await processEmailAttachments(mail, ticketId, messageData.id)
              console.log('[Email] Processed', attachmentCount, 'attachments for reply')
            }

            // Reopen ticket if closed (SAME AS PHP!)
            await supabase
              .from('tickets')
              .update({
                status: 'open',
                updated_at: new Date().toISOString()
              })
              .eq('id', ticketId)

            stats.replied++

          } else {
            // ===== CREATE NEW TICKET (SAME AS PHP!) =====
            console.log('[Email] Creating new ticket from:', fromEmail)

            const priority = detectPriority(mail.subject || '', body)
            const cleanSubject = cleanForJson((mail.subject || 'Kein Betreff').substring(0, 255))

            const { data: newTicket, error: ticketError } = await supabase
              .from('tickets')
              .insert({
                subject: cleanSubject,
                description: body,
                status: 'open',
                priority,
                created_from_email: fromEmail,
                created_by: null,
                auto_tagged: autoTagIds.length > 0
              })
              .select()
              .single()

            if (ticketError) {
              throw new Error(`Failed to create ticket: ${ticketError.message}`)
            }

            console.log('[Email] Created ticket:', newTicket.id, 'Number:', newTicket.ticket_number)

            // Process attachments (WICHTIG: Jetzt mit Supabase Storage Upload!)
            if (mail.attachments && mail.attachments.length > 0) {
              const attachmentCount = await processEmailAttachments(mail, newTicket.id)
              console.log('[Email] Processed', attachmentCount, 'attachments for new ticket')
            }

            // Apply auto tags (SAME AS PHP!)
            if (autoTagIds.length > 0) {
              for (const tagId of autoTagIds) {
                await supabase
                  .from('ticket_tags')
                  .insert({
                    ticket_id: newTicket.id,
                    tag_id: tagId
                  })
              }
              console.log('[Email] Applied', autoTagIds.length, 'auto tags')
            }

            // Send confirmation email (SAME AS PHP!)
            if (shouldSendConfirmation) {
              await sendTicketConfirmation(
                fromEmail,
                fromName,
                cleanSubject,
                newTicket.ticket_number,
                supabase
              )
              console.log('[Email] Confirmation email sent to:', fromEmail)
            } else {
              console.log('[Email] Skipping confirmation due to email rule')
            }

            stats.created++
          }

          resolve()

        } catch (error) {
          reject(error)
        }
      })
    })

    fetch.once('error', reject)
  })
}

/**
 * Send ticket confirmation email
 * Ported from PHP sendTicketConfirmation()
 */
async function sendTicketConfirmation(
  toEmail: string,
  toName: string,
  originalSubject: string,
  ticketNumber: number,
  supabase: ReturnType<typeof createAdminClient>
): Promise<void> {
  try {
    // Format ticket reference with leading zeros (SAME AS PHP!)
    const ticketRef = 'TICKET-' + String(ticketNumber).padStart(6, '0')
    const subject = `[${ticketRef}] Ihre Anfrage: ${originalSubject}`

    const message = `Sehr geehrte(r) ${toName},

vielen Dank für Ihre Anfrage. Wir haben Ihr Ticket erfolgreich erfasst.

Ticket-Nummer: ${ticketRef}
Betreff: ${originalSubject}

Wir werden Ihre Anfrage schnellstmöglich bearbeiten.

Bei Rückfragen antworten Sie bitte auf diese E-Mail und behalten Sie die Ticket-Nummer [${ticketRef}] im Betreff.

Mit freundlichen Grüßen
Ihr FLIGHTHOUR Team

---
FLIGHTHOUR A320 Flugsimulator
Web: https://flighthour.de
E-Mail: info@flighthour.de`

    // Queue email for sending (using existing email queue system)
    await supabase
      .from('email_queue')
      .insert({
        ticket_id: null, // Confirmation email, not tied to specific ticket action
        recipient_email: toEmail,
        subject,
        content: message,
        status: 'pending',
        attempts: 0
      })

    console.log('[Email] Confirmation queued for:', toEmail)

  } catch (error) {
    console.error('[Email] Failed to queue confirmation:', error)
    // Don't throw - confirmation failure shouldn't break ticket creation
  }
}
