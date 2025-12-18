/**
 * SMS Templates for MAYDAY Notifications
 *
 * Short, friendly messages in German
 * Max 160 characters for single SMS
 */

import { formatInTimeZone } from 'date-fns-tz'
import { de } from 'date-fns/locale'

const germanTimezone = 'Europe/Berlin'

export interface ShiftSMSData {
  originalStartTime: string  // ISO string
  newStartTime: string       // ISO string
  reason: string             // smsText from MAYDAY_REASONS
}

export interface CancelSMSData {
  originalStartTime: string  // ISO string
  reason: string             // smsText from MAYDAY_REASONS
}

/**
 * Generate SMS for appointment shift
 * Target length: ~120 chars to stay within single SMS
 */
export function generateShiftSMS(data: ShiftSMSData): string {
  const { originalStartTime, newStartTime, reason } = data

  const shortDate = formatInTimeZone(
    new Date(originalStartTime),
    germanTimezone,
    'dd.MM.',
    { locale: de }
  )

  const newTime = formatInTimeZone(
    new Date(newStartTime),
    germanTimezone,
    'HH:mm',
    { locale: de }
  )

  // Template: ~105 chars
  return `FLIGHTHOUR: Ihr Termin am ${shortDate} verschiebt sich ${reason} auf ${newTime} Uhr. Wir freuen uns auf Sie!`
}

/**
 * Generate SMS for appointment cancellation
 * Target length: ~120 chars to stay within single SMS
 */
export function generateCancelSMS(data: CancelSMSData): string {
  const { originalStartTime, reason } = data

  const shortDate = formatInTimeZone(
    new Date(originalStartTime),
    germanTimezone,
    'dd.MM.',
    { locale: de }
  )

  // Template: ~110 chars
  return `FLIGHTHOUR: Ihr Termin am ${shortDate} muss ${reason} leider ausfallen. Details zur Neubuchung per E-Mail.`
}

// ============================================================================
// Shift Coverage SMS
// ============================================================================

export interface ShiftCoverageSMSData {
  requestDate: string  // YYYY-MM-DD
}

/**
 * Generate SMS for shift coverage request
 * Target length: ~80 chars to stay within single SMS
 */
export function generateShiftCoverageSMS(data: ShiftCoverageSMSData): string {
  const { requestDate } = data

  const shortDate = formatInTimeZone(
    new Date(requestDate + 'T12:00:00'),
    germanTimezone,
    'dd.MM.',
    { locale: de }
  )

  // Template: ~76 chars
  return `FLIGHTHOUR: Am ${shortDate} wird noch jemand gebraucht. Schau in deine E-Mails!`
}

// Re-export from shared constants for backwards compatibility
export { MAYDAY_SMS_REASONS } from '@/lib/mayday-constants'
export type { MaydayReason as MaydaySMSReason } from '@/lib/mayday-constants'
