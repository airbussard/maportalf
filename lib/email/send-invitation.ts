/**
 * Send Employee Invitation Email
 *
 * Sends a welcome email with login credentials to newly created employees
 */

import { createClient } from '@/lib/supabase/server'

export async function sendEmployeeInvitationEmail({
  email,
  name,
  tempPassword,
  loginUrl = 'https://flighthour.getemergence.com/login'
}: {
  email: string
  name: string
  tempPassword: string
  loginUrl?: string
}) {
  const supabase = await createClient()

  const subject = "Willkommen bei FLIGHTHOUR - Ihr Zugang zum Mitarbeiterportal"

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Willkommen bei FLIGHTHOUR</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #EAB308; margin: 0;">FLIGHTHOUR</h1>
  </div>

  <h2>Hallo ${name},</h2>

  <p>Sie wurden zum FLIGHTHOUR Mitarbeiterportal eingeladen.</p>

  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <h3 style="margin-top: 0;">Ihre Zugangsdaten:</h3>
    <ul style="list-style: none; padding: 0;">
      <li style="margin-bottom: 10px;"><strong>E-Mail:</strong> ${email}</li>
      <li><strong>Temporäres Passwort:</strong> <code style="background-color: #e9ecef; padding: 2px 6px; border-radius: 3px; font-size: 14px;">${tempPassword}</code></li>
    </ul>
  </div>

  <p style="text-align: center; margin: 30px 0;">
    <a href="${loginUrl}" style="display: inline-block; background-color: #EAB308; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Jetzt anmelden</a>
  </p>

  <p>Nach der Anmeldung können Sie Ihre persönlichen Daten vervollständigen und bei Bedarf Ihr Passwort ändern.</p>

  <p>Bei Fragen wenden Sie sich bitte an Ihren Administrator.</p>

  <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">

  <p style="color: #6c757d; font-size: 14px;">
    Mit freundlichen Grüßen<br/>
    Ihr FLIGHTHOUR Team
  </p>
</body>
</html>
  `.trim()

  const textBody = `
Hallo ${name},

Sie wurden zum FLIGHTHOUR Mitarbeiterportal eingeladen.

Ihre Zugangsdaten:
E-Mail: ${email}
Temporäres Passwort: ${tempPassword}

Bitte melden Sie sich hier an: ${loginUrl}

Nach der Anmeldung können Sie Ihre persönlichen Daten vervollständigen und bei Bedarf Ihr Passwort ändern.

Bei Fragen wenden Sie sich bitte an Ihren Administrator.

Mit freundlichen Grüßen
Ihr FLIGHTHOUR Team
  `.trim()

  // Insert into email_queue table
  const { error } = await supabase
    .from('email_queue')
    .insert({
      recipient: email,
      subject: subject,
      body: htmlBody,
      text_body: textBody,
      status: 'pending',
      created_at: new Date().toISOString()
    })

  if (error) {
    console.error('Failed to queue invitation email:', error)
    throw new Error('E-Mail konnte nicht in die Warteschlange eingereiht werden')
  }

  return { success: true }
}
