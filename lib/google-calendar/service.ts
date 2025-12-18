/**
 * Google Calendar Service
 *
 * Handles Google Calendar API authentication and operations using Service Account
 */

import type { GoogleCalendarEvent, CalendarEventData } from './types'

// Google Service Account Configuration
const GOOGLE_SERVICE_ACCOUNT = {
  type: 'service_account',
  project_id: 'macro-mender-440116-f6',
  private_key_id: '6399a84b98218f55f1345439b3a1d4e85f5b9534',
  private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '',
  client_email: 'flighthour@macro-mender-440116-f6.iam.gserviceaccount.com',
  client_id: '100835305289279115657',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/flighthour%40macro-mender-440116-f6.iam.gserviceaccount.com',
  universe_domain: 'googleapis.com'
}

const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'flighthour.de@gmail.com'
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'

// JWT Helper Functions
function base64urlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function createJWT(): string {
  const now = Math.floor(Date.now() / 1000)

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }

  const payload = {
    iss: GOOGLE_SERVICE_ACCOUNT.client_email,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: GOOGLE_SERVICE_ACCOUNT.token_uri,
    exp: now + 3600,
    iat: now
  }

  const encodedHeader = base64urlEncode(JSON.stringify(header))
  const encodedPayload = base64urlEncode(JSON.stringify(payload))
  const signatureInput = `${encodedHeader}.${encodedPayload}`

  // Sign with private key using crypto
  // Convert literal \n strings to actual newlines (for CapRover env vars)
  const privateKey = GOOGLE_SERVICE_ACCOUNT.private_key.replace(/\\n/g, '\n')

  const crypto = require('crypto')
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signatureInput)
  const signature = sign.sign(privateKey, 'base64')
  const encodedSignature = signature
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${signatureInput}.${encodedSignature}`
}

// Access Token Cache
let cachedAccessToken: string | null = null
let tokenExpiry: number = 0

/**
 * Get Google Calendar API access token using Service Account JWT
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedAccessToken && Date.now() < tokenExpiry) {
    return cachedAccessToken
  }

  const jwt = createJWT()

  const response = await fetch(GOOGLE_SERVICE_ACCOUNT.token_uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const data = await response.json()

  if (!data.access_token) {
    throw new Error('No access token received from Google')
  }

  const accessToken: string = data.access_token
  cachedAccessToken = accessToken
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000 // 1 min buffer

  return accessToken
}

/**
 * List events from Google Calendar
 * Handles pagination to fetch ALL events (not just first 250)
 */
export async function listGoogleCalendarEvents(
  timeMin: string,
  timeMax: string,
  syncToken?: string
): Promise<{ events: GoogleCalendarEvent[]; nextSyncToken?: string }> {
  const accessToken = await getAccessToken()
  let allEvents: GoogleCalendarEvent[] = []
  let pageToken: string | undefined = undefined
  let pageCount = 0
  let responseSyncToken: string | undefined = undefined

  // Pagination loop - fetch all pages
  do {
    const params = new URLSearchParams({
      maxResults: '250',
      singleEvents: 'true',
      orderBy: 'startTime',
      showDeleted: 'true' // Include deleted events (status: 'cancelled')
    })

    // Pagination token takes precedence
    if (pageToken) {
      params.append('pageToken', pageToken)
    } else if (syncToken) {
      params.append('syncToken', syncToken)
    } else {
      params.append('timeMin', timeMin)
      params.append('timeMax', timeMax)
    }

    const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events?${params}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to list events: ${error}`)
    }

    const data = await response.json()

    // Accumulate events from this page
    const pageEvents = data.items || []
    allEvents = allEvents.concat(pageEvents)
    pageCount++

    // Log pagination progress
    console.log(`[Google API] Fetched page ${pageCount}: ${pageEvents.length} events (total so far: ${allEvents.length})`)

    // Check for next page
    pageToken = data.nextPageToken
    responseSyncToken = data.nextSyncToken

  } while (pageToken) // Continue while there are more pages

  console.log(`[Google API] ✅ Pagination complete: ${allEvents.length} total events across ${pageCount} page(s)`)

  return {
    events: allEvents,
    nextSyncToken: responseSyncToken
  }
}

/**
 * Create event in Google Calendar
 */
export async function createGoogleCalendarEvent(
  eventData: CalendarEventData
): Promise<GoogleCalendarEvent> {
  const accessToken = await getAccessToken()

  // Ensure dates are in correct ISO 8601 format
  let startDate = new Date(eventData.start_time)
  let endDate = new Date(eventData.end_time)

  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date format')
  }

  // For FI events, always use 08:00-09:00 in Google Calendar
  const isFIEvent = eventData.event_type === 'fi_assignment'
  const isBlocker = eventData.event_type === 'blocker'

  if (isFIEvent) {
    const originalStart = new Date(startDate)
    const originalEnd = new Date(endDate)

    // Set to 08:00-09:00 on the event's date
    startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 8, 0, 0)
    endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 9, 0, 0)
  }

  // For Blocker events with all-day, use 05:00-22:00 in Google Calendar
  if (isBlocker && eventData.is_all_day) {
    startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 5, 0, 0)
    endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 22, 0, 0)
  }

  // Build summary with validation
  let summary = ''

  // Use pre-generated title if provided (includes actual work times for FI events)
  if (eventData.title) {
    summary = eventData.title
  } else if (isBlocker) {
    // For blocker events, use customer_first_name as title
    summary = eventData.customer_first_name || 'Blocker'
  } else if (isFIEvent) {
    const instructorName = eventData.assigned_instructor_name || 'Unbekannt'
    const instructorNumber = eventData.assigned_instructor_number ? ` (${eventData.assigned_instructor_number})` : ''
    summary = `FI: ${instructorName}${instructorNumber}`

    // Add actual work time to title if partial day
    if (!eventData.is_all_day && eventData.actual_work_start_time && eventData.actual_work_end_time) {
      summary += ` ${eventData.actual_work_start_time.slice(0, 5)}-${eventData.actual_work_end_time.slice(0, 5)}`
    }

    console.log('[Google Calendar CREATE] FI Event:', {
      instructorName: eventData.assigned_instructor_name,
      instructorNumber: eventData.assigned_instructor_number,
      actualWorkTimes: eventData.actual_work_start_time && eventData.actual_work_end_time
        ? `${eventData.actual_work_start_time} - ${eventData.actual_work_end_time}`
        : 'all-day',
      summary
    })
  } else {
    summary = `${eventData.customer_first_name} ${eventData.customer_last_name}`
  }

  const event = {
    summary,
    description: formatEventDescription(eventData),
    location: eventData.location || 'FLIGHTHOUR Flugsimulator',
    start: {
      dateTime: startDate.toISOString(),
      timeZone: 'Europe/Berlin'
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'Europe/Berlin'
    },
    status: eventData.status || 'confirmed',
    colorId: isFIEvent ? '5' : isBlocker ? '11' : undefined // '5' = Gelb für FI, '11' = Rot für Blocker
  }

  const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create event: ${error}`)
  }

  return await response.json()
}

/**
 * Update event in Google Calendar
 */
export async function updateGoogleCalendarEvent(
  eventId: string,
  eventData: CalendarEventData
): Promise<GoogleCalendarEvent> {
  const accessToken = await getAccessToken()

  // Ensure dates are in correct ISO 8601 format
  let startDate = new Date(eventData.start_time)
  let endDate = new Date(eventData.end_time)

  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date format')
  }

  // For FI events, always use 08:00-09:00 in Google Calendar
  const isFIEvent = eventData.event_type === 'fi_assignment'
  const isBlocker = eventData.event_type === 'blocker'

  if (isFIEvent) {
    const originalStart = new Date(startDate)
    const originalEnd = new Date(endDate)

    // Set to 08:00-09:00 on the event's date
    startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 8, 0, 0)
    endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 9, 0, 0)
  }

  // For Blocker events with all-day, use 05:00-22:00 in Google Calendar
  if (isBlocker && eventData.is_all_day) {
    startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 5, 0, 0)
    endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 22, 0, 0)
  }

  // Build summary with validation
  let summary = ''

  // Use pre-generated title if provided (includes actual work times for FI events)
  if (eventData.title) {
    summary = eventData.title
  } else if (isBlocker) {
    // For blocker events, use customer_first_name as title
    summary = eventData.customer_first_name || 'Blocker'
  } else if (isFIEvent) {
    const instructorName = eventData.assigned_instructor_name || 'Unbekannt'
    const instructorNumber = eventData.assigned_instructor_number ? ` (${eventData.assigned_instructor_number})` : ''
    summary = `FI: ${instructorName}${instructorNumber}`

    // Add actual work time to title if partial day
    if (!eventData.is_all_day && eventData.actual_work_start_time && eventData.actual_work_end_time) {
      summary += ` ${eventData.actual_work_start_time.slice(0, 5)}-${eventData.actual_work_end_time.slice(0, 5)}`
    }

    console.log('[Google Calendar UPDATE] FI Event:', {
      eventId,
      instructorName: eventData.assigned_instructor_name,
      instructorNumber: eventData.assigned_instructor_number,
      actualWorkTimes: eventData.actual_work_start_time && eventData.actual_work_end_time
        ? `${eventData.actual_work_start_time} - ${eventData.actual_work_end_time}`
        : 'all-day',
      summary
    })
  } else {
    summary = `${eventData.customer_first_name} ${eventData.customer_last_name}`
  }

  const event = {
    summary,
    description: formatEventDescription(eventData),
    location: eventData.location || 'FLIGHTHOUR Flugsimulator',
    start: {
      dateTime: startDate.toISOString(),
      timeZone: 'Europe/Berlin'
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'Europe/Berlin'
    },
    status: eventData.status || 'confirmed',
    colorId: isFIEvent ? '5' : isBlocker ? '11' : undefined // '5' = Gelb für FI, '11' = Rot für Blocker
  }

  const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events/${eventId}`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update event: ${error}`)
  }

  return await response.json()
}

/**
 * Delete event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(eventId: string): Promise<void> {
  const accessToken = await getAccessToken()

  const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events/${eventId}`

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok && response.status !== 404) {
    const error = await response.text()
    throw new Error(`Failed to delete event: ${error}`)
  }
}

/**
 * Format event description for Google Calendar
 */
function formatEventDescription(eventData: CalendarEventData): string {
  const parts = []

  // Add EVENT_TYPE marker at the beginning for reliable detection during sync
  if (eventData.event_type === 'blocker') {
    parts.push('EVENT_TYPE:BLOCKER')
    parts.push('') // Empty line for readability
  } else if (eventData.event_type === 'fi_assignment') {
    parts.push('EVENT_TYPE:FI_ASSIGNMENT')
    parts.push('') // Empty line for readability
  } else {
    parts.push('EVENT_TYPE:BOOKING')
    parts.push('') // Empty line for readability
  }

  // For FI events with specific times (not all-day), include actual work times
  if (eventData.event_type === 'fi_assignment' && !eventData.is_all_day) {
    if (eventData.actual_work_start_time && eventData.actual_work_end_time) {
      parts.push(`Tatsächliche Arbeitszeiten: ${eventData.actual_work_start_time.slice(0, 5)} - ${eventData.actual_work_end_time.slice(0, 5)}`)
      parts.push('') // Empty line for readability
    }
  }

  if (eventData.customer_phone) {
    parts.push(`Telefon: ${eventData.customer_phone}`)
  }

  if (eventData.customer_email) {
    parts.push(`E-Mail: ${eventData.customer_email}`)
  }

  if (eventData.attendee_count) {
    parts.push(`Anzahl Teilnehmer: ${eventData.attendee_count}`)
  }

  if (eventData.remarks) {
    parts.push(`\nBemerkungen:\n${eventData.remarks}`)
  }

  return parts.join('\n')
}

/**
 * Parse event description from Google Calendar
 */
export function parseGoogleEventDescription(description: string): Partial<CalendarEventData> {
  if (!description) return {}

  const data: Partial<CalendarEventData> = {}

  // Parse EVENT_TYPE marker (first line)
  const eventTypeMatch = description.match(/^EVENT_TYPE:(BLOCKER|FI_ASSIGNMENT|BOOKING)/i)
  if (eventTypeMatch) {
    const type = eventTypeMatch[1].toUpperCase()
    if (type === 'BLOCKER') {
      data.event_type = 'blocker'
    } else if (type === 'FI_ASSIGNMENT') {
      data.event_type = 'fi_assignment'
    } else if (type === 'BOOKING') {
      data.event_type = 'booking'
    }
  }

  // Parse customer name from "Customer: Vorname Nachname" line (external booking systems)
  const customerMatch = description.match(/Customer:\s*(.+)/i)
  if (customerMatch) {
    const fullName = customerMatch[1].trim()
    const nameParts = fullName.split(/\s+/)
    if (nameParts.length >= 2) {
      // Last word = last name, rest = first name
      data.customer_last_name = nameParts[nameParts.length - 1]
      data.customer_first_name = nameParts.slice(0, -1).join(' ')
    } else if (nameParts.length === 1) {
      // Single word -> treat as last name
      data.customer_last_name = nameParts[0]
      data.customer_first_name = ''
    }
  }

  // Fallback: Name at beginning of description (before HTML tags)
  // Format: "Stefanie Willemsen<br>..." from external booking systems
  if (!data.customer_first_name && !data.customer_last_name) {
    // Extract text before first HTML tag or newline
    const firstLineMatch = description.match(/^([^<\n]+)/)
    if (firstLineMatch) {
      const firstLine = firstLineMatch[1].trim()
      // Check if it looks like a name (not starting with emoji, number, or special chars)
      if (firstLine && !firstLine.startsWith('✈') && !firstLine.match(/^[0-9+]/) && !firstLine.match(/^EVENT_TYPE:/i)) {
        const nameParts = firstLine.split(/\s+/)
        if (nameParts.length >= 2) {
          data.customer_first_name = nameParts.slice(0, -1).join(' ')
          data.customer_last_name = nameParts[nameParts.length - 1]
        }
      }
    }
  }

  // Parse phone number - Priority 1: With "Telefon:" prefix
  const phoneMatch = description.match(/Telefon:\s*(.+)/i)
  if (phoneMatch) {
    data.customer_phone = phoneMatch[1].trim()
  } else {
    // Fallback: Find phone number without prefix
    // Formats: 01777771722, +4917712345678, +41795498801, 0171 234 5678
    const phoneRegex = /(?:^|\n|\s)((?:\+[1-9][0-9]{0,3}|0)[1-9][0-9\s]{7,14})(?:\s|$|\n)/m
    const genericPhoneMatch = description.match(phoneRegex)
    if (genericPhoneMatch) {
      // Remove spaces for consistent format
      data.customer_phone = genericPhoneMatch[1].replace(/\s+/g, '')
    }
  }

  const emailMatch = description.match(/E-Mail:\s*(.+)/i)
  if (emailMatch) {
    data.customer_email = emailMatch[1].trim()
  } else {
    // Fallback: Find any email address in description (for externally created events)
    const genericEmailMatch = description.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    if (genericEmailMatch) data.customer_email = genericEmailMatch[0]
  }

  const attendeeMatch = description.match(/Anzahl Teilnehmer:\s*(\d+)/i)
  if (attendeeMatch) data.attendee_count = parseInt(attendeeMatch[1])

  const remarksMatch = description.match(/Bemerkungen:\s*\n(.+)/is)
  if (remarksMatch) data.remarks = remarksMatch[1].trim()

  return data
}
