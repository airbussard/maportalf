import { formatInTimeZone } from 'date-fns-tz'
import { de } from 'date-fns/locale'

export interface CancellationNotificationData {
  customer_first_name: string
  customer_last_name: string
  start_time: string
  end_time: string
  duration: number
  attendee_count: number
  location: string
}

export function generateCancellationNotificationEmail(data: CancellationNotificationData) {
  // Convert UTC times to German timezone (Europe/Berlin)
  const germanTimezone = 'Europe/Berlin'
  const startDate = new Date(data.start_time)

  const dateStr = formatInTimeZone(startDate, germanTimezone, 'EEEE, dd.MM.yyyy', { locale: de })
  const startTimeStr = formatInTimeZone(startDate, germanTimezone, 'HH:mm', { locale: de })

  const customerName = `${data.customer_first_name} ${data.customer_last_name}`.trim()

  const plainText = `
Sehr geehrte/r ${customerName},

hiermit bestätigen wir Ihnen, dass Ihr Termin am ${dateStr} um ${startTimeStr} Uhr abgesagt wurde.

Ursprüngliche Termindetails:
- Datum: ${dateStr}
- Uhrzeit: ${startTimeStr} Uhr
- Dauer: ${data.duration} Minuten
- Ort: ${data.location}
- Anzahl Personen: ${data.attendee_count}

Sollten Sie Fragen haben oder einen neuen Termin vereinbaren wollen, stehen wir Ihnen gerne zur Verfügung.

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
    .cancellation-box {
      background: #fff5f5;
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
      border: 2px solid #ef4444;
    }
    .cancellation-box h2 {
      margin: 0 0 15px 0;
      color: #dc2626;
      font-size: 18px;
      font-weight: 600;
    }
    .details-box {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
      border: 1px solid #e5e5e5;
    }
    .details-box h3 {
      margin: 0 0 15px 0;
      color: #121212;
      font-size: 16px;
      font-weight: 600;
    }
    .details-box p {
      margin: 8px 0;
      color: #666;
      font-size: 14px;
    }
    .details-box strong {
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
    .contact-note {
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

      <div class="cancellation-box">
        <h2>Terminabsage</h2>
        <p style="margin: 0; color: #666;">Hiermit bestätigen wir Ihnen, dass Ihr Termin am <strong>${dateStr}</strong> um <strong>${startTimeStr} Uhr</strong> abgesagt wurde.</p>
      </div>

      <div class="details-box">
        <h3>Ursprüngliche Termindetails</h3>
        <p><strong>Datum:</strong> ${dateStr}</p>
        <p><strong>Uhrzeit:</strong> ${startTimeStr} Uhr</p>
        <p><strong>Dauer:</strong> ${data.duration} Minuten</p>
        <p><strong>Ort:</strong> ${data.location}</p>
        <p><strong>Anzahl Personen:</strong> ${data.attendee_count}</p>
      </div>

      <div class="contact-note">
        <p style="margin: 0;">Sollten Sie Fragen haben oder einen neuen Termin vereinbaren wollen, stehen wir Ihnen gerne zur Verfügung.</p>
      </div>

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
    subject: `Terminabsage - ${dateStr}`,
    plainText,
    htmlContent
  }
}
