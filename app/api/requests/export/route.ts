/**
 * ICS Export API Route
 *
 * Exports approved work requests as ICS calendar file
 * Compatible with all calendar applications (Google Calendar, Outlook, Apple Calendar, etc.)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMyWorkRequests } from '@/app/actions/work-requests'
import { formatRequestDate, formatRequestTime } from '@/lib/types/work-requests'

export async function GET() {
  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    // Get user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()

    const userName = profile
      ? `${profile.first_name} ${profile.last_name}`
      : 'Mitarbeiter'

    // Get approved work requests
    const allRequests = await getMyWorkRequests()
    const approvedRequests = allRequests.filter(r => r.status === 'approved')

    // Generate ICS content
    const icsContent = generateICS(approvedRequests, userName)

    // Return as downloadable file
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="work-requests-${user.id}.ics"`
      }
    })
  } catch (error) {
    console.error('ICS export error:', error)
    return NextResponse.json(
      { error: 'Export fehlgeschlagen' },
      { status: 500 }
    )
  }
}

/**
 * Generate ICS calendar file content
 */
function generateICS(requests: any[], userName: string): string {
  const now = new Date()
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Flighthour//Work Requests//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Flighthour Work Requests',
    'X-WR-TIMEZONE:Europe/Berlin',
    'X-WR-CALDESC:Genehmigte Arbeitstage'
  ]

  // Add timezone definition
  ics.push(
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Berlin',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE'
  )

  // Add each request as an event
  for (const request of requests) {
    const eventId = `work-request-${request.id}@flighthour.de`
    const date = request.request_date.replace(/-/g, '')

    let startTime: string
    let endTime: string

    if (request.is_full_day) {
      // Full day event: use 08:00-09:00 (matches PHP system and approval logic)
      startTime = `${date}T080000`
      endTime = `${date}T090000`
    } else {
      // Partial day: use actual times
      const start = request.start_time.replace(/:/g, '').slice(0, 6)
      const end = request.end_time.replace(/:/g, '').slice(0, 6)
      startTime = `${date}T${start}`
      endTime = `${date}T${end}`
    }

    const summary = `${userName} - Arbeitstag`
    const description = [
      `Typ: ${request.is_full_day ? 'Ganztägig' : 'Teilzeit'}`,
      `Zeit: ${formatRequestTime(request)}`,
      request.reason ? `Grund: ${request.reason}` : '',
      `Status: Genehmigt`,
      `Request ID: ${request.id}`
    ]
      .filter(Boolean)
      .join('\\n')

    ics.push(
      'BEGIN:VEVENT',
      `UID:${eventId}`,
      `DTSTAMP:${timestamp}`,
      `DTSTART;TZID=Europe/Berlin:${startTime}`,
      `DTEND;TZID=Europe/Berlin:${endTime}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT'
    )
  }

  ics.push('END:VCALENDAR')

  return ics.join('\r\n')
}
