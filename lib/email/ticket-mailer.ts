/**
 * Ticket Email Service
 * Sends emails when tickets are created
 */

import nodemailer from 'nodemailer'

// IONOS SMTP Configuration
const SMTP_CONFIG = {
  host: 'ionos.de',
  port: 465,
  secure: true, // SSL
  auth: {
    user: 'm0716be75',
    pass: 'centr0@LL33'
  }
}

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
    console.log('[Ticket Email] Attachments:', options.attachments?.length || 0)

    // Create transporter
    const transporter = nodemailer.createTransport(SMTP_CONFIG)
    console.log('[Ticket Email] Transporter created')

    // Format ticket number with leading zeros
    const formattedTicketNumber = String(options.ticketNumber).padStart(6, '0')
    const emailSubject = `[TICKET-${formattedTicketNumber}] ${options.subject}`

    // Create text content with signature
    const textContent = generateTextContent(options, formattedTicketNumber)

    // Create HTML content with signature
    const htmlContent = generateHtmlContent(options, formattedTicketNumber)

    console.log('[Ticket Email] Content generated, sending via SMTP...')

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
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .content {
      background: #ffffff;
      padding: 20px;
      border-radius: 5px;
    }
    .signature {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      color: #666;
      font-size: 14px;
    }
    .signature strong {
      color: #333;
    }
    .ticket-info {
      background: #f5f5f5;
      padding: 10px;
      border-left: 4px solid #0066cc;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="content">
    <p>Sehr geehrte Damen und Herren,</p>

    ${options.content.split('\n').map(line => `<p>${line}</p>`).join('')}

    <div class="ticket-info">
      <strong>Ticket-Nummer:</strong> ${ticketNumber}<br>
      <strong>Status:</strong> Offen
    </div>

    <div class="signature">
      ${generateHtmlSignature(options)}
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
  return `<p>Mit freundlichen Grüßen<br>
<strong>${options.senderName}</strong></p>

<p style="color: #0066cc; font-weight: bold; margin-top: 20px;">
FLIGHTHOUR Flugsimulator
</p>

<p style="font-size: 12px; color: #666;">
<strong>Kontakt:</strong><br>
E-Mail: <a href="mailto:info@flighthour.de">info@flighthour.de</a><br>
Web: <a href="https://flighthour.de">https://flighthour.de</a>
</p>`
}
