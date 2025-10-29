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
 */
export async function listGoogleCalendarEvents(
  timeMin: string,
  timeMax: string,
  syncToken?: string
): Promise<{ events: GoogleCalendarEvent[]; nextSyncToken?: string }> {
  const accessToken = await getAccessToken()

  const params = new URLSearchParams({
    maxResults: '250',
    singleEvents: 'true',
    orderBy: 'startTime',
    showDeleted: 'true' // Include deleted events (status: 'cancelled')
  })

  if (syncToken) {
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

  return {
    events: data.items || [],
    nextSyncToken: data.nextSyncToken
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
  if (isFIEvent) {
    const originalStart = new Date(startDate)
    const originalEnd = new Date(endDate)

    // Set to 08:00-09:00 on the event's date
    startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 8, 0, 0)
    endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 9, 0, 0)
  }

  const event = {
    summary: isFIEvent
      ? `FI: ${eventData.assigned_instructor_name}${eventData.assigned_instructor_number ? ` (${eventData.assigned_instructor_number})` : ''}`
      : `${eventData.customer_first_name} ${eventData.customer_last_name}`,
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
    status: eventData.status || 'confirmed'
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
  if (isFIEvent) {
    const originalStart = new Date(startDate)
    const originalEnd = new Date(endDate)

    // Set to 08:00-09:00 on the event's date
    startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 8, 0, 0)
    endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 9, 0, 0)
  }

  const event = {
    summary: isFIEvent
      ? `FI: ${eventData.assigned_instructor_name}${eventData.assigned_instructor_number ? ` (${eventData.assigned_instructor_number})` : ''}`
      : `${eventData.customer_first_name} ${eventData.customer_last_name}`,
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
    status: eventData.status || 'confirmed'
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

  // For FI events with specific times (not all-day), include actual times
  if (eventData.event_type === 'fi_assignment' && !eventData.is_all_day) {
    const startDate = new Date(eventData.start_time)
    const endDate = new Date(eventData.end_time)
    parts.push(`Tatsächliche Zeiten: ${startDate.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    })} - ${endDate.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    })}`)
    parts.push('') // Empty line for readability
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

  const phoneMatch = description.match(/Telefon:\s*(.+)/i)
  if (phoneMatch) data.customer_phone = phoneMatch[1].trim()

  const emailMatch = description.match(/E-Mail:\s*(.+)/i)
  if (emailMatch) data.customer_email = emailMatch[1].trim()

  const attendeeMatch = description.match(/Anzahl Teilnehmer:\s*(\d+)/i)
  if (attendeeMatch) data.attendee_count = parseInt(attendeeMatch[1])

  const remarksMatch = description.match(/Bemerkungen:\s*\n(.+)/is)
  if (remarksMatch) data.remarks = remarksMatch[1].trim()

  return data
}
