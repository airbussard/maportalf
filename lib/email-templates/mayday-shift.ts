/**
 * MAYDAY Shift Notification Email Template
 *
 * Sent when appointments are shifted to a new time
 * Design: Friendly, apologetic, professional
 */

import { formatInTimeZone } from 'date-fns-tz'
import { de } from 'date-fns/locale'

const germanTimezone = 'Europe/Berlin'

export interface MaydayShiftEmailData {
  customerFirstName: string
  customerLastName: string
  oldStartTime: string
  oldEndTime: string
  newStartTime: string
  newEndTime: string
  reason: string
  reasonNote?: string
  location: string
  confirmUrl?: string  // URL for "Verstanden" button
}

export function generateMaydayShiftEmail(data: MaydayShiftEmailData) {
  const {
    customerFirstName,
    customerLastName,
    oldStartTime,
    oldEndTime,
    newStartTime,
    newEndTime,
    reason,
    location,
    confirmUrl
  } = data

  const customerName = customerFirstName || customerLastName || 'Kunde'

  // Format dates in German timezone
  const oldDate = formatInTimeZone(new Date(oldStartTime), germanTimezone, 'EEEE, dd. MMMM yyyy', { locale: de })
  const oldTime = formatInTimeZone(new Date(oldStartTime), germanTimezone, 'HH:mm', { locale: de })
  const newDate = formatInTimeZone(new Date(newStartTime), germanTimezone, 'EEEE, dd. MMMM yyyy', { locale: de })
  const newTime = formatInTimeZone(new Date(newStartTime), germanTimezone, 'HH:mm', { locale: de })
  const newEndTimeFormatted = formatInTimeZone(new Date(newEndTime), germanTimezone, 'HH:mm', { locale: de })

  const subject = `Wichtige Info zu Ihrem Termin am ${formatInTimeZone(new Date(oldStartTime), germanTimezone, 'dd.MM.', { locale: de })}`

  const plainText = `
Liebe/r ${customerName},

wir müssen Ihnen leider mitteilen, dass sich Ihr Simulator-Termin ${reason.toLowerCase()} verschiebt.

Ursprünglicher Termin:
${oldDate} um ${oldTime} Uhr

Ihr neuer Termin:
${newDate} um ${newTime} - ${newEndTimeFormatted} Uhr

Ort: ${location}

Wir entschuldigen uns für die Unannehmlichkeiten und freuen uns auf Ihren Besuch!
${confirmUrl ? `\nBestätigen Sie den Erhalt dieser Nachricht: ${confirmUrl}` : ''}

Herzliche Grüße,
Ihr FLIGHTHOUR Team

--
FLIGHTHOUR GmbH
info@flighthour.de
www.flighthour.de
  `.trim()

  const htmlContent = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px 40px; text-align: center; border-bottom: 1px solid #eee;">
              <img src="https://flighthour.getemergence.com/logo.png" alt="FLIGHTHOUR" style="height: 40px; width: auto;">
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">
                Liebe/r ${customerName},
              </p>

              <!-- Message -->
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                wir müssen Ihnen leider mitteilen, dass sich Ihr Simulator-Termin ${reason.toLowerCase()} verschiebt.
              </p>

              <!-- Old Time (crossed out) -->
              <div style="background: #fee2e2; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #991b1b; text-transform: uppercase; letter-spacing: 1px;">
                  Ursprünglicher Termin
                </p>
                <p style="margin: 0; font-size: 16px; color: #991b1b; text-decoration: line-through;">
                  ${oldDate}<br>
                  ${oldTime} Uhr
                </p>
              </div>

              <!-- New Time (highlighted) -->
              <div style="background: linear-gradient(135deg, #fbb928 0%, #f59e0b 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 1px;">
                  Ihr neuer Termin
                </p>
                <p style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #ffffff;">
                  ${newDate}
                </p>
                <p style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">
                  ${newTime} - ${newEndTimeFormatted} Uhr
                </p>
              </div>

              <!-- Location -->
              <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; color: #666666;">
                  <strong>Ort:</strong> ${location}
                </p>
              </div>

              <!-- Apology -->
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Wir entschuldigen uns für die Unannehmlichkeiten und freuen uns auf Ihren Besuch!
              </p>

              ${confirmUrl ? `
              <!-- Confirm Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${confirmUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 16px 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);">
                  Verstanden
                </a>
              </div>
              <p style="margin: 0 0 24px 0; font-size: 12px; text-align: center; color: #999999;">
                Mit Klick auf "Verstanden" bestätigen Sie den Erhalt dieser Nachricht.
              </p>
              ` : ''}

              <!-- Signature -->
              <p style="margin: 0; font-size: 16px; color: #333333;">
                Herzliche Grüße,<br>
                <strong>Ihr FLIGHTHOUR Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #121212; border-radius: 0 0 16px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #ffffff;">
                      FLIGHTHOUR GmbH
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #999999;">
                      <a href="mailto:info@flighthour.de" style="color: #fbb928; text-decoration: none;">info@flighthour.de</a>
                      &nbsp;|&nbsp;
                      <a href="https://www.flighthour.de" style="color: #fbb928; text-decoration: none;">www.flighthour.de</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  return { subject, plainText, htmlContent }
}
