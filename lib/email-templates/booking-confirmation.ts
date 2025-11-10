import { formatInTimeZone } from 'date-fns-tz'
import { de } from 'date-fns/locale'
import { join } from 'path'

export interface BookingConfirmationData {
  customer_first_name: string
  customer_last_name: string
  customer_email: string
  start_time: string
  end_time: string
  duration: number
  attendee_count: number
  location: string
  remarks?: string
  has_video_recording?: boolean
  on_site_payment_amount?: number | null
}

export function generateBookingConfirmationEmail(booking: BookingConfirmationData) {
  // Convert UTC times to German timezone (Europe/Berlin)
  const germanTimezone = 'Europe/Berlin'
  const startDate = new Date(booking.start_time)
  const endDate = new Date(booking.end_time)

  const dateStr = formatInTimeZone(startDate, germanTimezone, 'EEEE, dd.MM.yyyy', { locale: de })
  const startTimeStr = formatInTimeZone(startDate, germanTimezone, 'HH:mm', { locale: de })
  const endTimeStr = formatInTimeZone(endDate, germanTimezone, 'HH:mm', { locale: de })

  const customerName = `${booking.customer_first_name} ${booking.customer_last_name}`.trim()

  const plainText = `
Sehr geehrte/r ${customerName},

vielen Dank für Ihre Buchung!

Ihre Buchungsdetails:
• Datum: ${dateStr}
• Beginn: ${startTimeStr} Uhr
• Dauer: ${booking.duration} Minuten
• Ort: ${booking.location}
• Anzahl Personen: ${booking.attendee_count}
${booking.has_video_recording ? '• Video-Aufnahme: Ja' : ''}
${booking.on_site_payment_amount ? `• Zahlbetrag vor Ort: ${booking.on_site_payment_amount}€` : ''}

${booking.remarks ? `Bemerkungen:\n${booking.remarks}\n` : ''}
Im Anhang finden Sie unseren Pocket Guide mit wichtigen Informationen für Ihren Besuch.

Wir freuen uns auf Ihren Besuch!

Mit freundlichen Grüßen
Ihr FLIGHTHOUR Team

---
FLIGHTHOUR Flugsimulator
info@flighthour.de
`.trim()

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
    .booking-box {
      background: #fffbf0;
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
      border: 2px solid #fbb928;
    }
    .booking-box h2 {
      margin: 0 0 15px 0;
      color: #121212;
      font-size: 18px;
      font-weight: 600;
    }
    .booking-box p {
      margin: 8px 0;
      color: #666;
      font-size: 14px;
    }
    .booking-box strong {
      color: #121212;
      font-weight: 500;
    }
    .footer {
      background-color: #121212;
      color: #ffffff;
      text-align: center;
      padding: 20px;
      font-size: 12px;
    }
    .footer a {
      color: #fbb928;
      text-decoration: none;
    }
    .pocket-guide-note {
      background: #e8f4fd;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #1a73e8;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <img src="https://flighthour.getemergence.com/logo.png" alt="FLIGHTHOUR Logo" />
    </div>
    <div class="content">
      <p>Sehr geehrte/r ${customerName},</p>
      <p>vielen Dank für Ihre Buchung!</p>

      <div class="booking-box">
        <h2>Ihre Buchungsdetails</h2>
        <p><strong>Datum:</strong> ${dateStr}</p>
        <p><strong>Beginn:</strong> ${startTimeStr} Uhr</p>
        <p><strong>Dauer:</strong> ${booking.duration} Minuten</p>
        <p><strong>Ort:</strong> ${booking.location}</p>
        <p><strong>Anzahl Personen:</strong> ${booking.attendee_count}</p>
        ${booking.has_video_recording ? '<p><strong>Video-Aufnahme:</strong> Ja</p>' : ''}
        ${booking.on_site_payment_amount ? `<p><strong>Zahlbetrag vor Ort:</strong> ${booking.on_site_payment_amount}€</p>` : ''}
        ${booking.remarks ? `<p style="margin-top: 15px;"><strong>Bemerkungen:</strong><br>${booking.remarks}</p>` : ''}
      </div>

      <div class="pocket-guide-note">
        <p style="margin: 0;"><strong>📎 Wichtig:</strong> Im Anhang finden Sie unseren <strong>Pocket Guide</strong> mit allen wichtigen Informationen für Ihren Besuch.</p>
      </div>

      <p>Wir freuen uns auf Ihren Besuch!</p>

      <p style="margin-top: 25px;">Mit freundlichen Grüßen<br>
      <strong>Ihr FLIGHTHOUR Team</strong></p>
    </div>
    <div class="footer">
      <p style="margin: 0 0 5px 0;"><strong>FLIGHTHOUR Flugsimulator</strong></p>
      <p style="margin: 0;"><a href="mailto:info@flighthour.de">info@flighthour.de</a></p>
    </div>
  </div>
</body>
</html>`.trim()

  return {
    subject: `Buchungsbestätigung - ${dateStr}`,
    plainText,
    htmlContent
  }
}

/**
 * Get Pocket Guide PDF path (server-side only)
 * Returns absolute path to the PDF file
 */
export function getPocketGuidePath(): string {
  return join(process.cwd(), 'public', 'attachments', 'Pocket Guide.pdf')
}
