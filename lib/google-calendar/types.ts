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
