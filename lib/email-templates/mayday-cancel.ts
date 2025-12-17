/**
 * MAYDAY Cancellation Notification Email Template
 *
 * Sent when appointments are cancelled with optional rebooking option
 * Design: Friendly, apologetic, professional with clear CTA
 */

import { formatInTimeZone } from 'date-fns-tz'
import { de } from 'date-fns/locale'

const germanTimezone = 'Europe/Berlin'

export interface MaydayCancelEmailData {
  customerFirstName: string
  customerLastName: string
  originalStartTime: string
  originalEndTime: string
  reason: string
  reasonNote?: string
  location: string
  offerRebooking: boolean
  rebookUrl?: string
  confirmUrl?: string  // URL for "Verstanden" button
}

export function generateMaydayCancelEmail(data: MaydayCancelEmailData) {
  const {
    customerFirstName,
    customerLastName,
    originalStartTime,
    originalEndTime,
    reason,
    location,
    offerRebooking,
    rebookUrl,
    confirmUrl
  } = data

  const customerName = customerFirstName || customerLastName || 'Kunde'

  // Format dates in German timezone
  const originalDate = formatInTimeZone(new Date(originalStartTime), germanTimezone, 'EEEE, dd. MMMM yyyy', { locale: de })
  const originalTime = formatInTimeZone(new Date(originalStartTime), germanTimezone, 'HH:mm', { locale: de })
  const originalEndTimeFormatted = formatInTimeZone(new Date(originalEndTime), germanTimezone, 'HH:mm', { locale: de })
  const shortDate = formatInTimeZone(new Date(originalStartTime), germanTimezone, 'dd.MM.', { locale: de })

  const subject = `Ihr Termin am ${shortDate} - Wir müssen leider absagen`

  const rebookingText = offerRebooking
    ? `\n\nSie können ganz einfach einen neuen Termin buchen:\n${rebookUrl || 'https://flighthour.de/buchen'}`
    : ''

  const plainText = `
Liebe/r ${customerName},

es tut uns wirklich leid, aber wir müssen Ihren Termin ${reason.toLowerCase()} absagen.

Ihr Termin:
${originalDate}
${originalTime} - ${originalEndTimeFormatted} Uhr
Ort: ${location}

Wir entschuldigen uns aufrichtig für die Unannehmlichkeiten.${rebookingText}
${confirmUrl ? `\nBestätigen Sie den Erhalt dieser Nachricht: ${confirmUrl}` : ''}

Herzliche Grüße,
Ihr FLIGHTHOUR Team

--
FLIGHTHOUR GmbH
info@flighthour.de
www.flighthour.de
  `.trim()

  const rebookButtonHtml = offerRebooking ? `
              <!-- Rebook Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${rebookUrl || 'https://flighthour.de/buchen'}" style="display: inline-block; background: linear-gradient(135deg, #fbb928 0%, #f59e0b 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 16px 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(251, 185, 40, 0.4);">
                  Neuen Termin buchen
                </a>
              </div>
  ` : ''

  const rebookInfoHtml = offerRebooking ? `
              <p style="margin: 0 0 8px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Sie können ganz einfach einen neuen Termin buchen - wir würden uns freuen, Sie bald begrüßen zu dürfen!
              </p>
  ` : ''

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
                es tut uns wirklich leid, aber wir müssen Ihren Termin ${reason.toLowerCase()} leider absagen.
              </p>

              <!-- Cancelled Appointment (red box) -->
              <div style="background: #fee2e2; border: 2px solid #fecaca; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #991b1b; text-transform: uppercase; letter-spacing: 1px;">
                  Abgesagter Termin
                </p>
                <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #991b1b; text-decoration: line-through;">
                  ${originalDate}
                </p>
                <p style="margin: 0 0 8px 0; font-size: 16px; color: #991b1b; text-decoration: line-through;">
                  ${originalTime} - ${originalEndTimeFormatted} Uhr
                </p>
                <p style="margin: 0; font-size: 14px; color: #b91c1c;">
                  ${location}
                </p>
              </div>

              <!-- Apology -->
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Wir entschuldigen uns aufrichtig für die Unannehmlichkeiten.
              </p>

              ${rebookInfoHtml}
              ${rebookButtonHtml}

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
              <p style="margin: 32px 0 0 0; font-size: 16px; color: #333333;">
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
