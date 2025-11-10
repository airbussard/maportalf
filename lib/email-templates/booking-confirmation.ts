import { format } from 'date-fns'
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
  const startDate = new Date(booking.start_time)
  const endDate = new Date(booking.end_time)

  const dateStr = format(startDate, 'EEEE, dd.MM.yyyy', { locale: de })
  const startTimeStr = format(startDate, 'HH:mm', { locale: de })
  const endTimeStr = format(endDate, 'HH:mm', { locale: de })

  const customerName = `${booking.customer_first_name} ${booking.customer_last_name}`.trim()

  const plainText = `
Sehr geehrte/r ${customerName},

vielen Dank für Ihre Buchung!

Ihre Buchungsdetails:
• Datum: ${dateStr}
• Zeit: ${startTimeStr} - ${endTimeStr} Uhr
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

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a73e8; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .details { background: white; padding: 15px; border-left: 4px solid #1a73e8; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    ul { list-style: none; padding: 0; }
    li { padding: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Buchungsbestätigung</h1>
    </div>
    <div class="content">
      <p>Sehr geehrte/r ${customerName},</p>
      <p>vielen Dank für Ihre Buchung!</p>

      <div class="details">
        <h3>Ihre Buchungsdetails:</h3>
        <ul>
          <li><strong>Datum:</strong> ${dateStr}</li>
          <li><strong>Zeit:</strong> ${startTimeStr} - ${endTimeStr} Uhr</li>
          <li><strong>Dauer:</strong> ${booking.duration} Minuten</li>
          <li><strong>Ort:</strong> ${booking.location}</li>
          <li><strong>Anzahl Personen:</strong> ${booking.attendee_count}</li>
          ${booking.has_video_recording ? '<li><strong>Video-Aufnahme:</strong> Ja</li>' : ''}
          ${booking.on_site_payment_amount ? `<li><strong>Zahlbetrag vor Ort:</strong> ${booking.on_site_payment_amount}€</li>` : ''}
        </ul>
        ${booking.remarks ? `<p><strong>Bemerkungen:</strong><br>${booking.remarks}</p>` : ''}
      </div>

      <p>Im Anhang finden Sie unseren <strong>Pocket Guide</strong> mit wichtigen Informationen für Ihren Besuch.</p>

      <p>Wir freuen uns auf Ihren Besuch!</p>

      <p>Mit freundlichen Grüßen<br>
      <strong>Ihr FLIGHTHOUR Team</strong></p>
    </div>
    <div class="footer">
      FLIGHTHOUR Flugsimulator<br>
      info@flighthour.de
    </div>
  </div>
</body>
</html>
`.trim()

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
