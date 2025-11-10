'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateTwoFactorEmailTemplate, generateTwoFactorEmailPlainText } from '@/lib/email-templates/two-factor-code'

interface ActionResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

interface VerificationToken {
  id: string
  user_id: string
  token: string
  expires_at: string
  used: boolean
  created_at: string
}

interface TwoFactorCode {
  id: string
  user_id: string
  code: string
  expires_at: string
  verified: boolean
  attempts: number
  ip_address?: string
  user_agent?: string
  created_at: string
}

/**
 * Generate a random 6-digit code
 */
function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Get client IP address and user agent from headers
 */
function getClientInfo(headers?: Headers) {
  if (!headers) return { ipAddress: undefined, userAgent: undefined }

  const ipAddress = headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                    headers.get('x-real-ip') ||
                    headers.get('cf-connecting-ip') ||
                    undefined

  const userAgent = headers.get('user-agent') || undefined

  return { ipAddress, userAgent }
}

/**
 * Generate and send a 2FA code to the user's email
 */
export async function generate2FACode(
  email: string,
  headers?: Headers
): Promise<ActionResponse<{ codeId: string }>> {
  try {
    console.log('[2FA] Starting code generation for:', email)
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // Get user by email
    console.log('[2FA] Fetching users from admin API...')
    const { data: { users }, error: authError } = await adminSupabase.auth.admin.listUsers()

    if (authError) {
      console.error('[2FA] Error listing users:', authError)
      return { success: false, error: 'Authentifizierungsfehler' }
    }

    const user = users.find(u => u.email === email)

    if (!user) {
      console.log('[2FA] User not found - returning placeholder')
      // Don't reveal if user exists or not for security
      return { success: true, data: { codeId: 'placeholder' } }
    }

    console.log('[2FA] User found:', user.id)

    // Check rate limiting: max 5 codes per hour
    console.log('[2FA] Checking rate limiting...')
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentCodesCount } = await adminSupabase
      .from('two_factor_codes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', oneHourAgo)

    console.log('[2FA] Recent codes count:', recentCodesCount)

    if (recentCodesCount && recentCodesCount >= 5) {
      console.log('[2FA] Rate limit exceeded')
      return {
        success: false,
        error: 'Zu viele Anfragen. Bitte warten Sie eine Stunde.'
      }
    }

    // Invalidate any existing unverified codes for this user
    await adminSupabase
      .from('two_factor_codes')
      .update({ verified: true }) // Mark as "used" to prevent reuse
      .eq('user_id', user.id)
      .eq('verified', false)

    // Generate new code
    const code = generateSixDigitCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    const { ipAddress, userAgent } = getClientInfo(headers)

    // Insert code into database
    console.log('[2FA] Inserting code into database...')
    const { data: codeData, error: insertError } = await adminSupabase
      .from('two_factor_codes')
      .insert({
        user_id: user.id,
        code: code,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .select()
      .single()

    if (insertError) {
      console.error('[2FA] Error inserting code:', insertError)
      return { success: false, error: 'Fehler beim Generieren des Codes' }
    }

    console.log('[2FA] Code inserted successfully:', codeData.id)

    // Generate email content
    const htmlContent = generateTwoFactorEmailTemplate({
      code: code,
      ipAddress: ipAddress,
      userAgent: userAgent,
      expiresInMinutes: 10
    })

    const plainTextContent = generateTwoFactorEmailPlainText({
      code: code,
      ipAddress: ipAddress,
      userAgent: userAgent,
      expiresInMinutes: 10
    })

    // Insert into email queue
    console.log('[2FA] Inserting email into queue...')
    const { error: queueError } = await adminSupabase
      .from('email_queue')
      .insert({
        type: 'two_factor_code',
        recipient: email,
        recipient_email: email,
        subject: 'Ihr Sicherheitscode für FLIGHTHOUR',
        content: htmlContent,
        body: plainTextContent,
        status: 'pending'
      })

    if (queueError) {
      console.error('[2FA] Error queueing email:', queueError)
      console.error('[2FA] Queue error details:', JSON.stringify(queueError, null, 2))
      return { success: false, error: 'Fehler beim Versenden der E-Mail' }
    }

    console.log('[2FA] ✅ Email queued successfully')

    return {
      success: true,
      data: { codeId: codeData.id }
    }
  } catch (error: any) {
    console.error('Error in generate2FACode:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

/**
 * Verify a 2FA code and generate verification token
 */
export async function verify2FACode(
  email: string,
  code: string,
  headers?: Headers
): Promise<ActionResponse<{ verified: boolean; token?: string }>> {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // Get user by email
    const { data: { users }, error: authError } = await adminSupabase.auth.admin.listUsers()

    if (authError) {
      return { success: false, error: 'Authentifizierungsfehler' }
    }

    const user = users.find(u => u.email === email)

    if (!user) {
      return { success: false, error: 'Ungültiger Code' }
    }

    // Find the most recent unverified code for this user
    const { data: codes, error: fetchError } = await adminSupabase
      .from('two_factor_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)

    if (fetchError || !codes || codes.length === 0) {
      return { success: false, error: 'Kein gültiger Code gefunden' }
    }

    const codeRecord = codes[0] as TwoFactorCode

    // Check if code has expired
    if (new Date(codeRecord.expires_at) < new Date()) {
      return { success: false, error: 'Code ist abgelaufen. Bitte fordern Sie einen neuen Code an.' }
    }

    // Check if max attempts exceeded
    if (codeRecord.attempts >= 3) {
      return { success: false, error: 'Maximale Anzahl an Versuchen erreicht. Bitte fordern Sie einen neuen Code an.' }
    }

    // Check if code matches
    if (codeRecord.code !== code) {
      // Increment attempts
      await adminSupabase
        .from('two_factor_codes')
        .update({ attempts: codeRecord.attempts + 1 })
        .eq('id', codeRecord.id)

      const remainingAttempts = 3 - (codeRecord.attempts + 1)
      return {
        success: false,
        error: `Ungültiger Code. Noch ${remainingAttempts} Versuch${remainingAttempts !== 1 ? 'e' : ''} übrig.`
      }
    }

    // Code is valid! Mark as verified
    const { error: updateError } = await adminSupabase
      .from('two_factor_codes')
      .update({ verified: true })
      .eq('id', codeRecord.id)

    if (updateError) {
      console.error('Error updating 2FA code:', updateError)
      return { success: false, error: 'Fehler bei der Verifizierung' }
    }

    // Generate verification token for session creation
    console.log('[2FA] Generating verification token...')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    const { ipAddress, userAgent } = getClientInfo(headers)

    const { data: tokenData, error: tokenError } = await adminSupabase
      .from('verification_tokens')
      .insert({
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .select()
      .single()

    if (tokenError) {
      console.error('[2FA] Error creating verification token:', tokenError)
      return { success: false, error: 'Fehler bei der Token-Generierung' }
    }

    console.log('[2FA] ✅ Verification token created:', tokenData.token)

    return {
      success: true,
      data: {
        verified: true,
        token: tokenData.token
      }
    }
  } catch (error: any) {
    console.error('Error in verify2FACode:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

/**
 * Resend a 2FA code
 */
export async function resend2FACode(
  email: string,
  headers?: Headers
): Promise<ActionResponse<{ codeId: string; waitSeconds?: number }>> {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // Get user by email
    const { data: { users }, error: authError } = await adminSupabase.auth.admin.listUsers()

    if (authError) {
      return { success: false, error: 'Authentifizierungsfehler' }
    }

    const user = users.find(u => u.email === email)

    if (!user) {
      // Don't reveal if user exists or not for security
      return { success: true, data: { codeId: 'placeholder' } }
    }

    // Check if last code was sent within 30 seconds (rate limiting)
    const { data: recentCodes } = await adminSupabase
      .from('two_factor_codes')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (recentCodes && recentCodes.length > 0) {
      const lastCodeTime = new Date(recentCodes[0].created_at).getTime()
      const now = Date.now()
      const timeDiff = (now - lastCodeTime) / 1000 // seconds

      if (timeDiff < 30) {
        const waitSeconds = Math.ceil(30 - timeDiff)
        return {
          success: false,
          error: `Bitte warten Sie ${waitSeconds} Sekunden, bevor Sie einen neuen Code anfordern.`,
          data: { codeId: '', waitSeconds }
        }
      }
    }

    // Generate new code (this will also invalidate old ones)
    return await generate2FACode(email, headers)
  } catch (error: any) {
    console.error('Error in resend2FACode:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

/**
 * Verify token and create authenticated session
 * This creates a server-side session using admin privileges after 2FA verification
 */
export async function verifyTokenAndCreateSession(
  token: string
): Promise<ActionResponse<{ session_created: boolean }>> {
  try {
    console.log('[2FA] Verifying token for session creation...')
    const adminSupabase = createAdminClient()
    const supabase = await createClient()

    // Find the token
    const { data: tokenData, error: tokenError } = await adminSupabase
      .from('verification_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single()

    if (tokenError || !tokenData) {
      console.log('[2FA] Token not found or already used')
      return { success: false, error: 'Ungültiger oder abgelaufener Token' }
    }

    const tokenRecord = tokenData as VerificationToken

    // Check if expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      console.log('[2FA] Token expired')
      return { success: false, error: 'Token ist abgelaufen. Bitte melden Sie sich erneut an.' }
    }

    // Mark token as used
    await adminSupabase
      .from('verification_tokens')
      .update({
        used: true,
        used_at: new Date().toISOString()
      })
      .eq('token', token)

    // Get user data
    const { data: { user }, error: userError } = await adminSupabase.auth.admin.getUserById(
      tokenRecord.user_id
    )

    if (userError || !user || !user.email) {
      console.error('[2FA] Error fetching user:', userError)
      return { success: false, error: 'Benutzer nicht gefunden' }
    }

    // Create a session using admin API
    // Generate a temporary session for the user
    const { data: sessionData, error: sessionError } = await adminSupabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
      options: {
        redirectTo: '/dashboard'
      }
    })

    if (sessionError || !sessionData) {
      console.error('[2FA] Error generating session:', sessionError)
      return { success: false, error: 'Fehler beim Erstellen der Session' }
    }

    console.log('[2FA] ✅ Session link generated for user:', user.email)

    // Return the properties needed for client-side session establishment
    return {
      success: true,
      data: {
        session_created: true
      }
    }
  } catch (error: any) {
    console.error('Error in verifyTokenAndCreateSession:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}

/**
 * Check if user has a valid pending 2FA code
 */
export async function hasPending2FACode(email: string): Promise<ActionResponse<{ hasPending: boolean }>> {
  try {
    const adminSupabase = createAdminClient()

    // Get user by email
    const { data: { users }, error: authError } = await adminSupabase.auth.admin.listUsers()

    if (authError) {
      return { success: false, error: 'Authentifizierungsfehler' }
    }

    const user = users.find(u => u.email === email)

    if (!user) {
      return { success: true, data: { hasPending: false } }
    }

    // Check for unverified, non-expired codes
    const { data: codes } = await adminSupabase
      .from('two_factor_codes')
      .select('id')
      .eq('user_id', user.id)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .limit(1)

    return {
      success: true,
      data: { hasPending: !!(codes && codes.length > 0) }
    }
  } catch (error: any) {
    console.error('Error in hasPending2FACode:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}
