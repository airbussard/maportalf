/**
 * Shift Coverage Request Email Template
 *
 * Sent to employees when a manager requests coverage for an unfilled shift
 * Design: Friendly, urgent but not alarming, clear call-to-action
 */

import { formatInTimeZone } from 'date-fns-tz'
import { de } from 'date-fns/locale'

const germanTimezone = 'Europe/Berlin'

export interface ShiftCoverageEmailData {
  employeeFirstName: string
  requestDate: string // YYYY-MM-DD
  isFullDay: boolean
  startTime?: string // HH:MM
  endTime?: string // HH:MM
  reason?: string
  acceptUrl: string
}

export function generateShiftCoverageEmail(data: ShiftCoverageEmailData) {
  const {
    employeeFirstName,
    requestDate,
    isFullDay,
    startTime,
    endTime,
    reason,
    acceptUrl
  } = data

  const name = employeeFirstName || 'Mitarbeiter'

  // Format date in German
  const dateObj = new Date(requestDate + 'T12:00:00')
  const formattedDate = formatInTimeZone(dateObj, germanTimezone, 'EEEE, dd. MMMM yyyy', { locale: de })
  const shortDate = formatInTimeZone(dateObj, germanTimezone, 'dd.MM.', { locale: de })

  // Time display
  const timeDisplay = isFullDay
    ? 'Ganztägig'
    : `${startTime} - ${endTime} Uhr`

  const subject = `Kannst du am ${shortDate} arbeiten?`

  const plainText = `
Hallo ${name},

wir brauchen noch Unterstützung!

Datum: ${formattedDate}
Zeit: ${timeDisplay}
${reason ? `Grund: ${reason}` : ''}

Kannst du an diesem Tag arbeiten?

Klicke hier um zu übernehmen: ${acceptUrl}

Hinweis: Wer zuerst klickt, bekommt den Tag.
Diese Anfrage läuft in 14 Tagen ab.

Herzliche Grüße,
Dein FLIGHTHOUR Team

--
FLIGHTHOUR
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
                Hallo ${name},
              </p>

              <!-- Message -->
              <p style="margin: 0 0 24px 0; font-size: 18px; font-weight: 600; line-height: 1.6; color: #333333;">
                Wir brauchen noch Unterstützung!
              </p>

              <!-- Date/Time Box -->
              <div style="background: linear-gradient(135deg, #fbb928 0%, #f59e0b 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding-bottom: 12px;">
                      <p style="margin: 0; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 1px;">
                        Datum
                      </p>
                      <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: 600; color: #ffffff;">
                        ${formattedDate}
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: ${reason ? '12px' : '0'};">
                      <p style="margin: 0; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 1px;">
                        Zeit
                      </p>
                      <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 600; color: #ffffff;">
                        ${timeDisplay}
                      </p>
                    </td>
                  </tr>
                  ${reason ? `
                  <tr>
                    <td>
                      <p style="margin: 0; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 1px;">
                        Grund
                      </p>
                      <p style="margin: 4px 0 0 0; font-size: 14px; color: #ffffff;">
                        ${reason}
                      </p>
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <!-- Question -->
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #333333; text-align: center;">
                Kannst du an diesem Tag arbeiten?
              </p>

              <!-- Accept Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${acceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 18px; padding: 18px 48px; border-radius: 8px; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);">
                  ICH ÜBERNEHME
                </a>
              </div>

              <!-- Info -->
              <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #666666; text-align: center;">
                  <strong>Hinweis:</strong> Wer zuerst klickt, bekommt den Tag.<br>
                  Diese Anfrage läuft in 14 Tagen ab.
                </p>
              </div>

              <!-- Signature -->
              <p style="margin: 0; font-size: 16px; color: #333333;">
                Herzliche Grüße,<br>
                <strong>Dein FLIGHTHOUR Team</strong>
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
                      FLIGHTHOUR
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
