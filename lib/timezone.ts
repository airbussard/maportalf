/**
 * Timezone utilities for FLIGHTHOUR
 *
 * All times are displayed and input in German time (Europe/Berlin)
 * Database storage is in UTC
 */

import { fromZonedTime, toZonedTime, format } from 'date-fns-tz'

const TIMEZONE = 'Europe/Berlin'

/**
 * Convert German local time to UTC (for DB storage)
 * Example: "2025-01-02", "14:00" → UTC Date object
 */
export function germanTimeToUtc(dateStr: string, timeStr: string): Date {
  const localDateString = `${dateStr}T${timeStr}:00`
  return fromZonedTime(localDateString, TIMEZONE)
}

/**
 * Convert UTC to German local time (for display)
 */
export function utcToGermanTime(utcDate: Date | string): Date {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
  return toZonedTime(date, TIMEZONE)
}

/**
 * Format a date in German timezone
 */
export function formatGermanTime(date: Date | string, formatStr: string = 'HH:mm'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(toZonedTime(d, TIMEZONE), formatStr, { timeZone: TIMEZONE })
}

/**
 * Format a date in German timezone
 */
export function formatGermanDate(date: Date | string, formatStr: string = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(toZonedTime(d, TIMEZONE), formatStr, { timeZone: TIMEZONE })
}

/**
 * Check if two time periods overlap
 * All dates should be in the same timezone (preferably UTC)
 */
export function periodsOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && end1 > start2
}

/**
 * Get hour and minute from a German time Date object
 */
export function getGermanHourMinute(date: Date | string): { hour: number; minute: number } {
  const germanTime = utcToGermanTime(date)
  return {
    hour: germanTime.getHours(),
    minute: germanTime.getMinutes()
  }
}
