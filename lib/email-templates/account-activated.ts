/**
 * Account Activated Email Template
 *
 * Sent when an admin activates a self-registered user account
 */

export function generateAccountActivatedEmail(
  name: string,
  loginUrl: string = 'https://flighthour.getemergence.com/login'
): string {
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
    .success-box {
      background: #f0fdf4;
      padding: 20px;
      border-radius: 6px;
      margin: 25px 0;
      border-left: 3px solid #22c55e;
      text-align: center;
    }
    .success-box h3 {
      margin: 0 0 10px 0;
      color: #166534;
      font-weight: 600;
      font-size: 18px;
    }
    .success-box p {
      margin: 0;
      color: #166534;
    }
    .cta-button {
      text-align: center;
      margin: 30px 0;
    }
    .cta-button a {
      display: inline-block;
      background-color: #fbb928;
      color: #121212;
      padding: 14px 35px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 15px;
      transition: background-color 0.2s;
    }
    .cta-button a:hover {
      background-color: #e5a820;
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
      <p>Hallo ${name},</p>

      <div class="success-box">
        <h3>Ihr Konto wurde freigeschaltet!</h3>
        <p>Sie können sich jetzt im FLIGHTHOUR Mitarbeiterportal anmelden.</p>
      </div>

      <div class="cta-button">
        <a href="${loginUrl}">Jetzt anmelden</a>
      </div>

      <p>Verwenden Sie Ihre bei der Registrierung angegebene E-Mail-Adresse und Ihr Passwort, um sich anzumelden.</p>

      <p>Bei Fragen wenden Sie sich bitte an Ihren Administrator.</p>

      <div class="signature">
        <p style="margin-bottom: 5px;">Mit freundlichen Grüßen</p>
        <p style="margin: 0; font-weight: 600; color: #121212;">Ihr FLIGHTHOUR Team</p>

        <p style="color: #fbb928; font-weight: 700; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">
          FLIGHTHOUR Flugsimulator
        </p>

        <p style="font-size: 13px; color: #666; line-height: 1.8;">
          <strong style="color: #121212;">Kontakt:</strong><br>
          E-Mail: <a href="mailto:info@flighthour.de" style="color: #fbb928; text-decoration: none;">info@flighthour.de</a><br>
          Web: <a href="https://flighthour.de" style="color: #fbb928; text-decoration: none;">flighthour.de</a>
        </p>
      </div>
    </div>

    <div class="footer">
      <strong>FLIGHTHOUR Flugsimulator</strong> • Mitarbeiterportal
    </div>
  </div>
</body>
</html>`
}

export function generateAccountActivatedPlainText(
  name: string,
  loginUrl: string = 'https://flighthour.getemergence.com/login'
): string {
  return `Hallo ${name},

Ihr Konto wurde freigeschaltet!

Sie können sich jetzt im FLIGHTHOUR Mitarbeiterportal anmelden.

Bitte melden Sie sich hier an: ${loginUrl}

Verwenden Sie Ihre bei der Registrierung angegebene E-Mail-Adresse und Ihr Passwort, um sich anzumelden.

Bei Fragen wenden Sie sich bitte an Ihren Administrator.

---
Mit freundlichen Grüßen
Ihr FLIGHTHOUR Team

FLIGHTHOUR Flugsimulator

Kontakt:
E-Mail: info@flighthour.de
Web: https://flighthour.de`
}
