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
      background: #ffffff;
      padding: 30px 20px;
      text-align: center;
      border-bottom: 3px solid #fbb928;
    }
    .header img {
      max-width: 200px;
      height: auto;
    }
    .content {
      padding: 30px 20px;
    }
    .content p {
      margin: 0 0 15px 0;
      color: #333;
    }
    .ticket-info {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      border-left: 3px solid #fbb928;
      font-size: 13px;
      color: #666;
    }
    .ticket-info strong {
      color: #121212;
      font-weight: 500;
    }
    .ticket-info-row {
      margin: 6px 0;
      font-size: 13px;
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
      color: #121212;
      border-top: 1px solid #e0e0e0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <img src="https://flighthour.getemergence.com/logo.png" alt="FLIGHTHOUR Logo">
    </div>

    <div class="content">
      <p>Sehr geehrte Damen und Herren,</p>

      ${options.content.split('\n').map(line => `<p>${line}</p>`).join('')}

      <div class="signature">
        ${generateHtmlSignature(options)}
      </div>
    </div>

    <div class="footer">
      <strong>FLIGHTHOUR Flugsimulator</strong> • Ticket-System
    </div>

    <div class="ticket-info">
      <div class="ticket-info-row">
        <strong>Ticket-Nummer:</strong> ${ticketNumber}
      </div>
      <div class="ticket-info-row">
        <strong>Status:</strong> Offen
      </div>
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

/**
 * Send ticket creation confirmation email
 */
export async function sendTicketCreationEmail(options: TicketEmailOptions): Promise<boolean> {
  let emailSent = false

  try {
    console.log('[Ticket Creation Email] Starting send process for ticket', options.ticketNumber)
    console.log('[Ticket Creation Email] Recipient:', options.to)
    console.log('[Ticket Creation Email] Attachments received:', options.attachments?.length || 0)

    // Get SMTP settings from Supabase
    const supabase = createAdminClient()
    const { data: emailSettings, error: settingsError } = await supabase
      .from('email_settings')
      .select('*')
      .eq('is_active', true)
      .single()

    if (settingsError || !emailSettings) {
      console.error('[Ticket Creation Email] Failed to load email settings:', settingsError)
      throw new Error('Email settings not configured')
    }

    console.log('[Ticket Creation Email] Using SMTP:', emailSettings.smtp_host, ':', emailSettings.smtp_port)

    if (options.attachments && options.attachments.length > 0) {
      options.attachments.forEach((att, index) => {
        console.log(`[Ticket Creation Email] - Attachment ${index + 1}:`, {
          filename: att.filename,
          contentType: att.contentType,
          hasContent: !!att.content,
          contentLength: att.content?.length || 0
        })
      })
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailSettings.smtp_host,
      port: emailSettings.smtp_port,
      secure: emailSettings.smtp_port === 465,
      auth: {
        user: emailSettings.smtp_username,
        pass: emailSettings.smtp_password
      },
      connectionTimeout: 300000,
      greetingTimeout: 300000,
      socketTimeout: 300000
    })

    // Format ticket number with leading zeros
    const formattedTicketNumber = String(options.ticketNumber).padStart(6, '0')
    const emailSubject = `[TICKET-${formattedTicketNumber}] ${options.subject}`

    // Create text content
    const textContent = generateCreationTextContent(options, formattedTicketNumber)

    // Create HTML content
    const htmlContent = generateCreationHtmlContent(options, formattedTicketNumber)

    console.log('[Ticket Creation Email] Content generated, sending via SMTP...')

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

    console.log('[Ticket Creation Email] Nodemailer response accepted:', info.accepted)
    console.log('[Ticket Creation Email] Nodemailer response rejected:', info.rejected)

    emailSent = true
    console.log('[Ticket Creation Email] ✅ Sent successfully:', info.messageId)
    console.log('[Ticket Creation Email] Response:', info.response)

    return true

  } catch (error) {
    console.error('[Ticket Creation Email] ❌ Failed to send:', error)
    console.error('[Ticket Creation Email] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      emailSent
    })

    if (emailSent) {
      console.warn('[Ticket Creation Email] ⚠️ Email was sent but post-send operation failed')
      return true
    }

    return false
  }
}

/**
 * Generate plain text confirmation content
 */
function generateCreationTextContent(options: TicketEmailOptions, ticketNumber: string): string {
  let text = 'Sehr geehrte Damen und Herren,\n\n'
  text += 'vielen Dank für Ihre Anfrage!\n\n'
  text += `Wir haben Ihr Ticket [TICKET-${ticketNumber}] erhalten und werden uns schnellstmöglich um Ihr Anliegen kümmern.\n\n`
  text += 'Ihre Nachricht:\n'
  text += options.content + '\n\n'
  text += 'Sie erhalten eine E-Mail, sobald wir eine Antwort für Sie haben.\n\n'
  text += '---\n'
  text += generateCreationTextSignature(ticketNumber)
  return text
}

/**
 * Generate HTML confirmation content
 */
function generateCreationHtmlContent(options: TicketEmailOptions, ticketNumber: string): string {
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
      background: #ffffff;
      padding: 30px 20px;
      text-align: center;
      border-bottom: 3px solid #fbb928;
    }
    .header img {
      max-width: 200px;
      height: auto;
    }
    .content {
      padding: 30px 20px;
    }
    .content p {
      margin: 0 0 15px 0;
      color: #333;
    }
    .confirmation-box {
      background: #fffbf0;
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
      border: 2px solid #fbb928;
      text-align: center;
    }
    .confirmation-box h2 {
      margin: 0 0 10px 0;
      color: #121212;
      font-size: 20px;
      font-weight: 600;
    }
    .confirmation-box p {
      margin: 5px 0;
      color: #666;
      font-size: 14px;
    }
    .message-box {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
      border-left: 3px solid #fbb928;
    }
    .message-box h3 {
      margin: 0 0 10px 0;
      color: #121212;
      font-size: 15px;
      font-weight: 600;
    }
    .message-box p {
      margin: 0;
      color: #333;
      font-size: 14px;
    }
    .ticket-info {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      border-left: 3px solid #fbb928;
      font-size: 13px;
      color: #666;
    }
    .ticket-info strong {
      color: #121212;
      font-weight: 500;
    }
    .ticket-info-row {
      margin: 6px 0;
      font-size: 13px;
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
      color: #121212;
      border-top: 1px solid #e0e0e0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <img src="https://flighthour.getemergence.com/logo.png" alt="FLIGHTHOUR Logo">
    </div>

    <div class="content">
      <p>Sehr geehrte Damen und Herren,</p>

      <div class="confirmation-box">
        <h2>✓ Ticket erfolgreich erstellt</h2>
        <p>Wir haben Ihre Anfrage erhalten und werden uns schnellstmöglich darum kümmern.</p>
      </div>

      <div class="message-box">
        <h3>Ihre Nachricht:</h3>
        ${options.content.split('\n').map(line => `<p>${line}</p>`).join('')}
      </div>

      <p style="color: #666; font-size: 14px;">
        Sie erhalten eine E-Mail, sobald wir eine Antwort für Sie haben.
        Sie können auf diese E-Mail antworten, um weitere Informationen zu Ihrem Ticket hinzuzufügen.
      </p>

      <div class="signature">
        ${generateCreationHtmlSignature()}
      </div>
    </div>

    <div class="footer">
      <strong>FLIGHTHOUR Flugsimulator</strong> • Ticket-System
    </div>

    <div class="ticket-info">
      <div class="ticket-info-row">
        <strong>Ticket-Nummer:</strong> ${ticketNumber}
      </div>
      <div class="ticket-info-row">
        <strong>Status:</strong> Offen
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Generate plain text signature for creation confirmation
 */
function generateCreationTextSignature(ticketNumber: string): string {
  return `Mit freundlichen Grüßen
Ihr FLIGHTHOUR Team

FLIGHTHOUR Flugsimulator
Ticket-Nummer: ${ticketNumber}

Kontakt:
E-Mail: info@flighthour.de
Web: https://flighthour.de`
}

/**
 * Generate HTML signature for creation confirmation
 */
function generateCreationHtmlSignature(): string {
  return `<p style="margin-bottom: 5px;">Mit freundlichen Grüßen</p>
<p style="margin: 0; font-weight: 600; color: #121212;">Ihr FLIGHTHOUR Team</p>

<p style="color: #fbb928; font-weight: 700; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">
FLIGHTHOUR Flugsimulator
</p>

<p style="font-size: 13px; color: #666; line-height: 1.8;">
<strong style="color: #121212;">Kontakt:</strong><br>
E-Mail: <a href="mailto:info@flighthour.de" style="color: #fbb928; text-decoration: none;">info@flighthour.de</a><br>
Web: <a href="https://flighthour.de" style="color: #fbb928; text-decoration: none;">flighthour.de</a>
</p>`
}

interface TicketAssignmentEmailOptions {
  to: string
  assigneeName: string
  ticketNumber: number
  ticketSubject: string
  ticketUrl: string
}

/**
 * Send ticket assignment notification email
 */
export async function sendTicketAssignmentEmail(options: TicketAssignmentEmailOptions): Promise<boolean> {
  let emailSent = false

  try {
    console.log('[Ticket Assignment Email] Starting send process for ticket', options.ticketNumber)
    console.log('[Ticket Assignment Email] Recipient:', options.to)

    // Get SMTP settings from Supabase
    const supabase = createAdminClient()
    const { data: emailSettings, error: settingsError } = await supabase
      .from('email_settings')
      .select('*')
      .eq('is_active', true)
      .single()

    if (settingsError || !emailSettings) {
      console.error('[Ticket Assignment Email] Failed to load email settings:', settingsError)
      throw new Error('Email settings not configured')
    }

    console.log('[Ticket Assignment Email] Using SMTP:', emailSettings.smtp_host, ':', emailSettings.smtp_port)

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailSettings.smtp_host,
      port: emailSettings.smtp_port,
      secure: emailSettings.smtp_port === 465,
      auth: {
        user: emailSettings.smtp_username,
        pass: emailSettings.smtp_password
      },
      connectionTimeout: 300000,
      greetingTimeout: 300000,
      socketTimeout: 300000
    })

    // Format ticket number with leading zeros
    const formattedTicketNumber = String(options.ticketNumber).padStart(6, '0')
    const emailSubject = `Neues Ticket zugewiesen: [TICKET-${formattedTicketNumber}] ${options.ticketSubject}`

    // Create text content
    const textContent = `Hallo ${options.assigneeName},

Ihnen wurde ein neues Ticket zugewiesen:

Ticket-Nummer: ${formattedTicketNumber}
Betreff: ${options.ticketSubject}

Bitte öffnen Sie das Ticket über folgenden Link:
${options.ticketUrl}

---
Mit freundlichen Grüßen
Ihr FLIGHTHOUR Team

FLIGHTHOUR Flugsimulator
Ticket-Nummer: ${formattedTicketNumber}

Kontakt:
E-Mail: info@flighthour.de
Web: https://flighthour.de`

    // Create HTML content
    const htmlContent = `<!DOCTYPE html>
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
      background: #ffffff;
      padding: 30px 20px;
      text-align: center;
      border-bottom: 3px solid #fbb928;
    }
    .header img {
      max-width: 200px;
      height: auto;
    }
    .content {
      padding: 30px 20px;
    }
    .content p {
      margin: 0 0 15px 0;
      color: #333;
    }
    .assignment-box {
      background: #fffbf0;
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
      border: 2px solid #fbb928;
    }
    .assignment-box h2 {
      margin: 0 0 15px 0;
      color: #121212;
      font-size: 18px;
      font-weight: 600;
    }
    .assignment-box p {
      margin: 8px 0;
      color: #666;
      font-size: 14px;
    }
    .assignment-box strong {
      color: #121212;
      font-weight: 500;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      background-color: #fbb928;
      color: #121212;
      padding: 14px 40px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      transition: background-color 0.3s;
    }
    .button:hover {
      background-color: #e5a520;
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
      color: #121212;
      border-top: 1px solid #e0e0e0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <img src="https://flighthour.getemergence.com/logo.png" alt="FLIGHTHOUR Logo">
    </div>

    <div class="content">
      <p>Hallo ${options.assigneeName},</p>

      <p style="font-size: 15px; color: #555;">
        Ihnen wurde ein neues Ticket zugewiesen:
      </p>

      <div class="assignment-box">
        <h2>Ticket-Details</h2>
        <p><strong>Ticket-Nummer:</strong> ${formattedTicketNumber}</p>
        <p><strong>Betreff:</strong> ${options.ticketSubject}</p>
      </div>

      <div class="button-container">
        <a href="${options.ticketUrl}" class="button">Ticket öffnen</a>
      </div>

      <p style="color: #666; font-size: 14px;">
        Bitte loggen Sie sich ein, um das Ticket anzusehen und zu bearbeiten.
      </p>

      <div class="signature">
        ${generateCreationHtmlSignature()}
      </div>
    </div>

    <div class="footer">
      <strong>FLIGHTHOUR Flugsimulator</strong> • Ticket-System
    </div>
  </div>
</body>
</html>`

    console.log('[Ticket Assignment Email] Content generated, sending via SMTP...')

    // Send email
    const info = await transporter.sendMail({
      from: 'FLIGHTHOUR Support <info@flighthour.de>',
      to: options.to,
      replyTo: 'info@flighthour.de',
      subject: emailSubject,
      text: textContent,
      html: htmlContent,
      headers: {
        'X-Ticket-Number': String(options.ticketNumber)
      }
    })

    console.log('[Ticket Assignment Email] Nodemailer response accepted:', info.accepted)
    console.log('[Ticket Assignment Email] Nodemailer response rejected:', info.rejected)

    emailSent = true
    console.log('[Ticket Assignment Email] ✅ Sent successfully:', info.messageId)
    console.log('[Ticket Assignment Email] Response:', info.response)

    return true

  } catch (error) {
    console.error('[Ticket Assignment Email] ❌ Failed to send:', error)
    console.error('[Ticket Assignment Email] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      emailSent
    })

    if (emailSent) {
      console.warn('[Ticket Assignment Email] ⚠️ Email was sent but post-send operation failed')
      return true
    }

    return false
  }
}

interface BookingConfirmationEmailOptions {
  to: string
  subject: string
  htmlContent: string
  plainTextContent: string
  attachments?: EmailAttachment[]
}

/**
 * Send booking confirmation email
 */
export async function sendBookingConfirmationEmail(options: BookingConfirmationEmailOptions): Promise<boolean> {
  let emailSent = false

  try {
    console.log('[Booking Confirmation Email] Starting send process')
    console.log('[Booking Confirmation Email] Recipient:', options.to)
    console.log('[Booking Confirmation Email] Attachments:', options.attachments?.length || 0)

    // Get SMTP settings from Supabase
    const supabase = createAdminClient()
    const { data: emailSettings, error: settingsError } = await supabase
      .from('email_settings')
      .select('*')
      .eq('is_active', true)
      .single()

    if (settingsError || !emailSettings) {
      console.error('[Booking Confirmation Email] Failed to load email settings:', settingsError)
      throw new Error('Email settings not configured')
    }

    console.log('[Booking Confirmation Email] Using SMTP:', emailSettings.smtp_host, ':', emailSettings.smtp_port)

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailSettings.smtp_host,
      port: emailSettings.smtp_port,
      secure: emailSettings.smtp_use_ssl,
      auth: {
        user: emailSettings.smtp_username,
        pass: emailSettings.smtp_password
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    // Send email
    const info = await transporter.sendMail({
      from: `"FLIGHTHOUR" <${emailSettings.from_email}>`,
      to: options.to,
      subject: options.subject,
      text: options.plainTextContent,
      html: options.htmlContent,
      attachments: options.attachments,
      headers: {
        'X-Email-Type': 'booking-confirmation'
      }
    })

    console.log('[Booking Confirmation Email] Nodemailer response accepted:', info.accepted)
    console.log('[Booking Confirmation Email] Nodemailer response rejected:', info.rejected)

    emailSent = true
    console.log('[Booking Confirmation Email] ✅ Sent successfully:', info.messageId)
    console.log('[Booking Confirmation Email] Response:', info.response)

    return true

  } catch (error) {
    console.error('[Booking Confirmation Email] ❌ Failed to send:', error)
    console.error('[Booking Confirmation Email] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      emailSent
    })

    if (emailSent) {
      console.warn('[Booking Confirmation Email] ⚠️ Email was sent but post-send operation failed')
      return true
    }

    return false
  }
}
