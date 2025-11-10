/**
 * Google Calendar Types
 *
 * Type definitions for Google Calendar API and sync operations
 */

export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  status: 'confirmed' | 'tentative' | 'cancelled'
  created: string
  updated: string
  etag?: string
}

export interface CalendarEventData {
  event_type?: 'booking' | 'fi_assignment' | 'blocker'
  customer_first_name: string
  customer_last_name: string
  customer_phone?: string
  customer_email?: string
  start_time: string // ISO 8601 datetime
  end_time: string // ISO 8601 datetime
  duration: number // minutes
  attendee_count?: number
  remarks?: string
  location?: string
  status?: 'confirmed' | 'tentative' | 'cancelled'
  google_event_id?: string
  // FI Assignment fields
  assigned_instructor_id?: string
  assigned_instructor_number?: string
  assigned_instructor_name?: string
  is_all_day?: boolean
  request_id?: string
  // Actual work times (for FI events with time restrictions)
  // These store the real work hours (e.g., 09:00-17:00)
  // while start_time/end_time remain 08:00-09:00 for Google Calendar
  actual_work_start_time?: string | null // Format: 'HH:MM:SS' or null for blockers/all-day
  actual_work_end_time?: string | null // Format: 'HH:MM:SS' or null for blockers/all-day
  title?: string // Pre-generated title (for FI events with times, blocker title)
  // Booking-specific fields
  has_video_recording?: boolean // Indicates if video recording was booked
  on_site_payment_amount?: number | null // Amount to be paid on-site in EUR
}

export interface SyncResult {
  success: boolean
  imported: number
  exported: number
  updated: number
  errors: string[]
  syncToken?: string
}

export interface SyncOptions {
  timeMin?: string // ISO 8601
  timeMax?: string // ISO 8601
  syncToken?: string // For incremental syncs
  fullSync?: boolean
}
