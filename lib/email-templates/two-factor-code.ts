/**
 * 2FA Email Template
 * Professional email template for sending two-factor authentication codes
 */

interface TwoFactorEmailParams {
  code: string
  ipAddress?: string
  userAgent?: string
  expiresInMinutes?: number
}

export function generateTwoFactorEmailTemplate({
  code,
  ipAddress,
  userAgent,
  expiresInMinutes = 10
}: TwoFactorEmailParams): string {
  // Split code into individual digits for better visual presentation
  const digits = code.split('')

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ihr Sicherheitscode</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <div class="email-container" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

    <!-- Header -->
    <div class="header" style="background: linear-gradient(135deg, #fbb928 0%, #f9a825 100%); padding: 40px 30px; text-align: center;">
      <img src="https://flighthour.getemergence.com/logo.png" alt="FLIGHTHOUR Logo" style="max-width: 200px; height: auto; margin-bottom: 20px;">
      <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        Sicherheitscode
      </h1>
    </div>

    <!-- Content -->
    <div class="content" style="padding: 40px 30px;">

      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
        Verwenden Sie den folgenden Code, um sich bei Ihrem FLIGHTHOUR-Konto anzumelden:
      </p>

      <!-- Code Display -->
      <div class="code-box" style="background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%); border: 3px solid #fbb928; border-radius: 12px; padding: 30px; text-align: center; margin: 0 0 30px 0;">
        <div class="code-digits" style="display: flex; justify-content: center; gap: 12px; margin-bottom: 20px;">
          ${digits.map(digit => `
            <div style="background-color: #ffffff; border: 2px solid #fbb928; border-radius: 8px; width: 50px; height: 60px; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 700; color: #333333; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ${digit}
            </div>
          `).join('')}
        </div>
        <p style="color: #666666; font-size: 14px; margin: 0;">
          Gültig für <strong style="color: #fbb928;">${expiresInMinutes} Minuten</strong>
        </p>
      </div>

      <!-- Login Information -->
      ${ipAddress || userAgent ? `
      <div class="info-box" style="background-color: #f9f9f9; border-left: 4px solid #fbb928; border-radius: 8px; padding: 20px; margin: 0 0 30px 0;">
        <h3 style="color: #333333; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">
          Login-Informationen
        </h3>
        ${ipAddress ? `
        <p style="color: #666666; font-size: 14px; margin: 0 0 8px 0;">
          <strong>IP-Adresse:</strong> ${ipAddress}
        </p>
        ` : ''}
        ${userAgent ? `
        <p style="color: #666666; font-size: 14px; margin: 0;">
          <strong>Browser:</strong> ${userAgent}
        </p>
        ` : ''}
      </div>
      ` : ''}

      <!-- Security Warning -->
      <div class="warning-box" style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin: 0 0 20px 0;">
        <div style="display: flex; align-items: flex-start; gap: 15px;">
          <div style="flex-shrink: 0; font-size: 24px;">⚠️</div>
          <div>
            <h3 style="color: #856404; font-size: 16px; font-weight: 600; margin: 0 0 10px 0;">
              Sicherheitshinweis
            </h3>
            <p style="color: #856404; font-size: 14px; line-height: 1.5; margin: 0;">
              Falls Sie diesen Login-Versuch nicht initiiert haben, ignorieren Sie diese E-Mail und ändern Sie umgehend Ihr Passwort. Geben Sie diesen Code niemals an Dritte weiter.
            </p>
          </div>
        </div>
      </div>

      <p style="color: #666666; font-size: 14px; line-height: 1.5; margin: 0;">
        Falls Sie Probleme beim Einloggen haben, kontaktieren Sie uns unter
        <a href="mailto:info@flighthour.de" style="color: #fbb928; text-decoration: none; font-weight: 500;">info@flighthour.de</a>
      </p>

    </div>

    <!-- Footer -->
    <div class="footer" style="background-color: #121212; color: #ffffff; padding: 30px; text-align: center;">
      <p style="font-size: 14px; margin: 0 0 10px 0;">
        <strong>FLIGHTHOUR</strong>
      </p>
      <p style="font-size: 12px; color: #999999; margin: 0 0 15px 0;">
        Ihr professioneller Flugsimulator-Partner
      </p>
      <p style="font-size: 12px; color: #666666; margin: 0;">
        Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.
      </p>
    </div>

  </div>
</body>
</html>
  `.trim()
}

/**
 * Generate plain text version for email clients that don't support HTML
 */
export function generateTwoFactorEmailPlainText({
  code,
  ipAddress,
  userAgent,
  expiresInMinutes = 10
}: TwoFactorEmailParams): string {
  return `
FLIGHTHOUR - Sicherheitscode

Verwenden Sie den folgenden Code, um sich bei Ihrem FLIGHTHOUR-Konto anzumelden:

${code}

Gültig für ${expiresInMinutes} Minuten

${ipAddress || userAgent ? `
Login-Informationen:
${ipAddress ? `IP-Adresse: ${ipAddress}` : ''}
${userAgent ? `Browser: ${userAgent}` : ''}
` : ''}

SICHERHEITSHINWEIS:
Falls Sie diesen Login-Versuch nicht initiiert haben, ignorieren Sie diese E-Mail und ändern Sie umgehend Ihr Passwort. Geben Sie diesen Code niemals an Dritte weiter.

Falls Sie Probleme beim Einloggen haben, kontaktieren Sie uns unter info@flighthour.de

---
FLIGHTHOUR
Ihr professioneller Flugsimulator-Partner

Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.
  `.trim()
}
