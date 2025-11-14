import nodemailer from 'nodemailer'
import { createAdminClient } from '@/lib/supabase/admin'

interface WorkRequestEmailOptions {
  requestId: string
  employeeName: string
  requestType: 'urlaub' | 'krank' | 'sonstiges'
  startDate: string
  endDate: string
  reason?: string
  approveToken: string
  rejectToken: string
  recipientEmail: string
  recipientName: string
}

/**
 * Send work request notification email to Manager/Admin with approve/reject buttons
 */
export async function sendWorkRequestEmail(options: WorkRequestEmailOptions): Promise<boolean> {
  try {
    const supabase = createAdminClient()

    // Fetch SMTP settings from database
    const { data: settings } = await supabase
      .from('email_settings')
      .select('*')
      .eq('is_active', true)
      .single()

    if (!settings) {
      console.error('No email settings found in database')
      return false
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: settings.smtp_port === 465,
      auth: {
        user: settings.smtp_username,
        pass: settings.smtp_password,
      },
    })

    // Format request type in German
    const requestTypeLabel = {
      urlaub: 'Urlaubsantrag',
      krank: 'Krankmeldung',
      sonstiges: 'Sonstiger Antrag'
    }[options.requestType] || 'Arbeitsantrag'

    // Format dates
    const formattedStartDate = new Date(options.startDate).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    const formattedEndDate = new Date(options.endDate).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })

    // Build approve/reject URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flighthour.getemergence.com'
    const approveUrl = `${baseUrl}/api/work-requests/action/${options.approveToken}`
    const rejectUrl = `${baseUrl}/api/work-requests/action/${options.rejectToken}`

    const htmlContent = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neuer Arbeitsantrag</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #fff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background-color: #000;
      color: #fbb928;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px 20px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 20px;
    }
    .request-box {
      background-color: #fbb928;
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
    }
    .request-box h2 {
      margin: 0 0 15px 0;
      font-size: 18px;
      color: #000;
    }
    .request-box p {
      margin: 8px 0;
      color: #000;
    }
    .request-box strong {
      font-weight: 600;
    }
    .reason-box {
      background-color: #f9f9f9;
      border-left: 4px solid #fbb928;
      padding: 15px;
      margin: 20px 0;
    }
    .reason-box h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      font-weight: 600;
      color: #666;
    }
    .reason-box p {
      margin: 0;
      color: #333;
      white-space: pre-wrap;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
      display: flex;
      gap: 15px;
      justify-content: center;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      transition: all 0.2s;
    }
    .button-approve {
      background-color: #10b981;
      color: #fff;
    }
    .button-approve:hover {
      background-color: #059669;
    }
    .button-reject {
      background-color: #ef4444;
      color: #fff;
    }
    .button-reject:hover {
      background-color: #dc2626;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #e5e5e5;
    }
    .signature {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      font-size: 14px;
      color: #666;
    }
    .expiry-notice {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 20px 0;
      font-size: 14px;
      color: #92400e;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Neuer Arbeitsantrag</h1>
    </div>

    <div class="content">
      <div class="greeting">
        Hallo ${options.recipientName},
      </div>

      <p>ein neuer Arbeitsantrag ist eingegangen und wartet auf Ihre Genehmigung.</p>

      <div class="request-box">
        <h2>Antragsdetails</h2>
        <p><strong>Mitarbeiter:</strong> ${options.employeeName}</p>
        <p><strong>Art:</strong> ${requestTypeLabel}</p>
        <p><strong>Von:</strong> ${formattedStartDate}</p>
        <p><strong>Bis:</strong> ${formattedEndDate}</p>
      </div>

      ${options.reason ? `
      <div class="reason-box">
        <h3>Begründung:</h3>
        <p>${options.reason}</p>
      </div>
      ` : ''}

      <div class="expiry-notice">
        ⚠️ Diese Links sind 7 Tage gültig. Danach müssen Sie den Antrag im System bearbeiten.
      </div>

      <div class="button-container">
        <a href="${approveUrl}" class="button button-approve">✓ Annehmen</a>
        <a href="${rejectUrl}" class="button button-reject">✗ Ablehnen</a>
      </div>

      <div class="signature">
        Mit freundlichen Grüßen<br>
        <strong>Ihr FLIGHTHOUR Team</strong>
      </div>
    </div>

    <div class="footer">
      <p>FLIGHTHOUR Employee Portal</p>
      <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht direkt auf diese E-Mail.</p>
    </div>
  </div>
</body>
</html>
`

    const textContent = `
Neuer Arbeitsantrag

Hallo ${options.recipientName},

ein neuer Arbeitsantrag ist eingegangen und wartet auf Ihre Genehmigung.

ANTRAGSDETAILS
Mitarbeiter: ${options.employeeName}
Art: ${requestTypeLabel}
Von: ${formattedStartDate}
Bis: ${formattedEndDate}

${options.reason ? `BEGRÜNDUNG:\n${options.reason}\n` : ''}

AKTIONEN
Annehmen: ${approveUrl}
Ablehnen: ${rejectUrl}

⚠️ Diese Links sind 7 Tage gültig. Danach müssen Sie den Antrag im System bearbeiten.

Mit freundlichen Grüßen
Ihr FLIGHTHOUR Team

---
FLIGHTHOUR Employee Portal
Diese E-Mail wurde automatisch generiert.
`

    const mailOptions = {
      from: `"FLIGHTHOUR" <${settings.smtp_username}>`,
      to: options.recipientEmail,
      subject: `Neuer ${requestTypeLabel} von ${options.employeeName}`,
      text: textContent,
      html: htmlContent,
    }

    await transporter.sendMail(mailOptions)
    console.log(`Work request email sent to ${options.recipientEmail}`)
    return true

  } catch (error) {
    console.error('Error sending work request email:', error)
    return false
  }
}
