/**
 * Twilio SMS Client
 *
 * Utility for sending SMS via Twilio API
 * Used for MAYDAY notifications (shift/cancel)
 */

import twilio from 'twilio'

// Twilio client singleton (lazy initialization)
let twilioClient: twilio.Twilio | null = null

function getTwilioClient(): twilio.Twilio {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.')
    }

    twilioClient = twilio(accountSid, authToken)
  }
  return twilioClient
}

/**
 * Normalize German phone number to international format
 * Examples:
 *   0171 1234567 -> +49171234567
 *   +49 171 1234567 -> +49171234567
 *   0049171234567 -> +49171234567
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all spaces, dashes, and parentheses
  let normalized = phone.replace(/[\s\-\(\)]/g, '')

  // Handle German numbers
  if (normalized.startsWith('0049')) {
    normalized = '+49' + normalized.slice(4)
  } else if (normalized.startsWith('0') && !normalized.startsWith('00')) {
    // German domestic format starting with 0
    normalized = '+49' + normalized.slice(1)
  } else if (!normalized.startsWith('+')) {
    // Assume German if no country code
    normalized = '+49' + normalized
  }

  return normalized
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone)
  // Basic validation: starts with + and has 10-15 digits
  return /^\+[1-9]\d{9,14}$/.test(normalized)
}

export interface SendSMSResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send SMS via Twilio
 */
export async function sendSMS(params: {
  to: string
  message: string
}): Promise<SendSMSResult> {
  const { to, message } = params

  // Validate phone number
  if (!isValidPhoneNumber(to)) {
    return {
      success: false,
      error: `Invalid phone number format: ${to}`
    }
  }

  // Validate message length (single SMS = 160 chars, but we'll allow up to 320 for multi-part)
  if (message.length > 320) {
    return {
      success: false,
      error: `Message too long: ${message.length} chars (max 320)`
    }
  }

  const fromNumber = process.env.TWILIO_PHONE_NUMBER
  if (!fromNumber) {
    return {
      success: false,
      error: 'TWILIO_PHONE_NUMBER not configured'
    }
  }

  try {
    const client = getTwilioClient()
    const normalizedTo = normalizePhoneNumber(to)

    console.log(`[SMS] Sending to ${normalizedTo} from ${fromNumber}`)

    const twilioMessage = await client.messages.create({
      body: message,
      from: fromNumber,
      to: normalizedTo
    })

    console.log(`[SMS] Sent successfully. SID: ${twilioMessage.sid}`)

    return {
      success: true,
      messageId: twilioMessage.sid
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[SMS] Failed to send:`, error)

    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Check if Twilio is configured
 */
export function isTwilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  )
}
