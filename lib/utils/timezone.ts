/**
 * Timezone Utility Functions
 *
 * Handles timezone conversions for calendar events and time tracking
 * to prevent the common "+1 hour" bug when storing/retrieving times
 */

/**
 * Adds seconds to a time string if not already present
 * Beispiel: addSecondsToTime("10:00") → "10:00:00"
 */
export function addSecondsToTime(time: string): string {
  if (!time) return ''
  // Check if seconds are already included
  const parts = time.split(':')
  if (parts.length === 3) {
    return time
  }
  return `${time}:00`
}

/**
 * Converts local date + time to ISO string with proper timezone handling
 * This prevents the "+1 hour" bug by properly converting to UTC
 *
 * Beispiel:
 * - Input: date="2025-10-31", time="10:00" (Berlin UTC+1)
 * - Output: "2025-10-31T09:00:00.000Z" (UTC)
 * - Browser displays: 10:00 (converts back to local) ✅
 */
export function convertToISOWithTimezone(date: string, time: string): string {
  const localDateTime = new Date(`${date}T${time}:00`)
  return localDateTime.toISOString()
}

/**
 * Extract time portion from ISO string and return as HH:MM:SS
 * Beispiel: "2025-10-31T09:00:00.000Z" → "09:00:00"
 */
export function extractTimeFromISO(isoString: string): string {
  return isoString.substring(11, 19)
}

/**
 * Validates time format HH:MM
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
  return timeRegex.test(time)
}
