/**
 * Ticket Email Service
 * Sends emails when tickets are created
 */

import nodemailer from 'nodemailer'
import { createAdminClient } from '@/lib/supabase/admin'

interface EmailAttachment {
  filename: string
  path?: string
  content?: Buffer
  contentType?: string
}

interface TicketEmailOptions {
  to: string
  subject: string
  content: string
  ticketNumber: number
  senderName: string
  senderEmail: string
  attachments?: EmailAttachment[]
}

/**
 * Send ticket creation email
 */
export async function sendTicketEmail(options: TicketEmailOptions): Promise<boolean> {
  let emailSent = false

  try {
    console.log('[Ticket Email] Starting send process for ticket', options.ticketNumber)
    console.log('[Ticket Email] Recipient:', options.to)
    console.log('[Ticket Email] Attachments received:', options.attachments?.length || 0)

    // Get SMTP settings from Supabase (same as PHP system)
    const supabase = createAdminClient()
    const { data: emailSettings, error: settingsError } = await supabase
      .from('email_settings')
      .select('*')
      .eq('is_active', true)
      .single()

    if (settingsError || !emailSettings) {
      console.error('[Ticket Email] Failed to load email settings:', settingsError)
      throw new Error('Email settings not configured')
    }

    console.log('[Ticket Email] Using SMTP:', emailSettings.smtp_host, ':', emailSettings.smtp_port)

    if (options.attachments && options.attachments.length > 0) {
      options.attachments.forEach((att, index) => {
        console.log(`[Ticket Email] - Attachment ${index + 1}:`, {
          filename: att.filename,
          contentType: att.contentType,
          hasContent: !!att.content,
          contentLength: att.content?.length || 0
        })
      })
    }

    // Create transporter with settings from database
    const transporter = nodemailer.createTransport({
      host: emailSettings.smtp_host,
      port: emailSettings.smtp_port,
      secure: emailSettings.smtp_port === 465, // SSL for port 465
      auth: {
        user: emailSettings.smtp_username,
        pass: emailSettings.smtp_password
      },
      // Increase timeouts for large attachments
      connectionTimeout: 300000,  // 5 minutes
      greetingTimeout: 300000,
      socketTimeout: 300000
    })
    console.log('[Ticket Email] Transporter created with credentials from database')

    // Format ticket number with leading zeros
    const formattedTicketNumber = String(options.ticketNumber).padStart(6, '0')
    const emailSubject = `[TICKET-${formattedTicketNumber}] ${options.subject}`

    // Create text content with signature
    const textContent = generateTextContent(options, formattedTicketNumber)

    // Create HTML content with signature
    const htmlContent = generateHtmlContent(options, formattedTicketNumber)

    console.log('[Ticket Email] Content generated, sending via SMTP...')

    // Log attachments being sent to Nodemailer
    if (options.attachments && options.attachments.length > 0) {
      console.log('[Ticket Email] Sending to Nodemailer with attachments:',
        JSON.stringify(options.attachments.map(a => ({
          filename: a.filename,
          contentType: a.contentType,
          contentLength: a.content?.length || 0,
          isBuffer: Buffer.isBuffer(a.content)
        })))
      )
    }

    // Send email
    const info = await transporter.sendMail({
      from: 'FLIGHTHOUR Support <info@flighthour.de>',
      to: options.to,
      replyTo: 'info@flighthour.de',
      subject: emailSubject,
      text: textContent,
      html: htmlContent,
      attachments: options.attachments,
      headers: {
        'X-Ticket-Number': String(options.ticketNumber)
      }
    })

    console.log('[Ticket Email] Nodemailer response accepted:', info.accepted)
    console.log('[Ticket Email] Nodemailer response rejected:', info.rejected)

    emailSent = true // Mark as sent BEFORE any other operations
    console.log('[Ticket Email] ✅ Sent successfully:', info.messageId)
    console.log('[Ticket Email] Response:', info.response)

    return true

  } catch (error) {
    console.error('[Ticket Email] ❌ Failed to send:', error)
    console.error('[Ticket Email] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      emailSent // Log if email was sent before error occurred
    })

    // If email was sent but subsequent operation failed, still return true
    if (emailSent) {
      console.warn('[Ticket Email] ⚠️ Email was sent but post-send operation failed')
      return true
    }

    return false
  }
}

/**
 * Generate plain text email content
 */
function generateTextContent(options: TicketEmailOptions, ticketNumber: string): string {
  let text = 'Sehr geehrte Damen und Herren,\n\n'
  text += options.content + '\n\n'
  text += '---\n'
  text += generateTextSignature(options, ticketNumber)
  return text
}

/**
 * Generate HTML email content
 */
function generateHtmlContent(options: TicketEmailOptions, ticketNumber: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;500;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Poppins', Arial, sans-serif;
      line-height: 1.6;
      color: #121212;
      max-width: 600px;
      margin: 0 auto;
      padding: 0;
      background-color: #f5f5f5;
    }
    .email-container {
      background: #ffffff;
      margin: 20px auto;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: #121212;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      color: #fbb928;
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .content {
      padding: 30px 20px;
    }
    .content p {
      margin: 0 0 15px 0;
      color: #333;
    }
    .ticket-info {
      background: linear-gradient(135deg, #fbb928 0%, #f9a825 100%);
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
      box-shadow: 0 2px 4px rgba(251, 185, 40, 0.2);
    }
    .ticket-info strong {
      color: #121212;
      font-weight: 600;
    }
    .ticket-info-row {
      margin: 8px 0;
      font-size: 15px;
    }
    .signature {
      margin-top: 30px;
      padding-top: 25px;
      border-top: 2px solid #f0f0f0;
      color: #666;
      font-size: 14px;
    }
    .signature strong {
      color: #121212;
      font-weight: 600;
    }
    .footer {
      background: #f9f9f9;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>FLIGHTHOUR</h1>
    </div>

    <div class="content">
      <p>Sehr geehrte Damen und Herren,</p>

      ${options.content.split('\n').map(line => `<p>${line}</p>`).join('')}

      <div class="ticket-info">
        <div class="ticket-info-row">
          <strong>📋 Ticket-Nummer:</strong> ${ticketNumber}
        </div>
        <div class="ticket-info-row">
          <strong>🔄 Status:</strong> Offen
        </div>
      </div>

      <div class="signature">
        ${generateHtmlSignature(options)}
      </div>
    </div>

    <div class="footer">
      FLIGHTHOUR Flugsimulator • Ticket-System<br>
      Diese E-Mail wurde automatisch generiert.
    </div>
  </div>
</body>
</html>`
}

/**
 * Generate plain text signature
 */
function generateTextSignature(options: TicketEmailOptions, ticketNumber: string): string {
  return `Mit freundlichen Grüßen
${options.senderName}

FLIGHTHOUR Flugsimulator
Ticket-Nummer: ${ticketNumber}

Kontakt:
E-Mail: info@flighthour.de
Web: https://flighthour.de`
}

/**
 * Generate HTML signature
 */
function generateHtmlSignature(options: TicketEmailOptions): string {
  return `<p style="margin-bottom: 5px;">Mit freundlichen Grüßen</p>
<p style="margin: 0; font-weight: 600; color: #121212;">${options.senderName}</p>

<p style="color: #fbb928; font-weight: 700; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">
FLIGHTHOUR Flugsimulator
</p>

<p style="font-size: 13px; color: #666; line-height: 1.8;">
<strong style="color: #121212;">Kontakt:</strong><br>
E-Mail: <a href="mailto:info@flighthour.de" style="color: #fbb928; text-decoration: none;">info@flighthour.de</a><br>
Web: <a href="https://flighthour.de" style="color: #fbb928; text-decoration: none;">flighthour.de</a>
</p>`
}
