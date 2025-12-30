/**
 * Availability API
 *
 * GET /api/v1/availability?date=YYYY-MM-DD&duration=60
 *
 * Returns available time slots for a given date and duration
 * All times are in German timezone (Europe/Berlin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, unauthorizedResponse, errorResponse } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { germanTimeToUtc, getGermanHourMinute, formatGermanTime, periodsOverlap } from '@/lib/timezone'

// Constants
const EARLIEST_START_HOUR = 10  // 10:00 German time
const LATEST_END_HOUR = 22      // 22:00 German time
const SLOT_INTERVAL = 15        // 15-minute intervals
const BUFFER_MINUTES = 14       // Buffer after each booking

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Validate API key
  const auth = validateApiKey(request)
  if (!auth.valid) {
    return unauthorizedResponse(auth.error)
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams
  const date = searchParams.get('date')  // YYYY-MM-DD (German date)
  const duration = parseInt(searchParams.get('duration') || '60')

  // Validate parameters
  if (!date) {
    return errorResponse('Missing date parameter (format: YYYY-MM-DD)')
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return errorResponse('Invalid date format. Use YYYY-MM-DD')
  }

  // Validate duration
  const validDurations = [30, 60, 120, 180]
  if (!validDurations.includes(duration)) {
    return errorResponse(`Invalid duration. Valid values: ${validDurations.join(', ')}`)
  }

  try {
    const supabase = createAdminClient()

    // Convert German day boundaries to UTC for database query
    const dayStartUtc = germanTimeToUtc(date, '00:00')
    const dayEndUtc = germanTimeToUtc(date, '23:59')

    // Fetch all events for the day (bookings + blockers)
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('start_time, end_time, event_type, is_all_day, customer_first_name, status')
      .gte('start_time', dayStartUtc.toISOString())
      .lte('start_time', dayEndUtc.toISOString())
      .in('event_type', ['booking', 'blocker'])
      .neq('status', 'cancelled')

    if (error) {
      console.error('[Availability API] Supabase error:', error)
      return errorResponse('Database error', 500)
    }

    // Check for all-day blocker
    const allDayBlocker = events?.find(
      e => e.event_type === 'blocker' && e.is_all_day
    )

    if (allDayBlocker) {
      return NextResponse.json({
        date,
        available: false,
        reason: 'day_blocked',
        blockerTitle: allDayBlocker.customer_first_name || 'Nicht verfügbar',
        slots: [],
      })
    }

    // Collect busy periods from events (all in UTC)
    const busyPeriods: { start: Date; end: Date }[] = []

    for (const event of events || []) {
      const start = new Date(event.start_time)
      let end = new Date(event.end_time)

      // Add buffer after bookings
      if (event.event_type === 'booking') {
        end = new Date(end.getTime() + BUFFER_MINUTES * 60 * 1000)
      }

      busyPeriods.push({ start, end })
    }

    // Debug logging
    console.log('=== Availability Debug ===')
    console.log('Requested date (German):', date, 'duration:', duration)
    console.log('Day boundaries (UTC):', dayStartUtc.toISOString(), '-', dayEndUtc.toISOString())
    console.log('Busy periods:')
    busyPeriods.forEach(bp => {
      console.log(`  ${formatGermanTime(bp.start)} - ${formatGermanTime(bp.end)} German time`)
    })

    // Generate available slots - think in German time, compare in UTC
    const slots: { time: string; available: boolean }[] = []
    const totalDuration = duration + BUFFER_MINUTES

    for (let hour = EARLIEST_START_HOUR; hour < LATEST_END_HOUR; hour++) {
      for (let minute = 0; minute < 60; minute += SLOT_INTERVAL) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

        // Convert German time slot to UTC for comparison
        const slotStartUtc = germanTimeToUtc(date, timeStr)
        const slotEndUtc = new Date(slotStartUtc.getTime() + totalDuration * 60 * 1000)

        // Check if slot ends within opening hours (in German time)
        const { hour: endHour, minute: endMinute } = getGermanHourMinute(slotEndUtc)

        if (endHour > LATEST_END_HOUR || (endHour === LATEST_END_HOUR && endMinute > 0)) {
          // Slot ends after closing time (German time)
          continue
        }

        // Check if slot conflicts with any busy period (all in UTC)
        const isAvailable = !busyPeriods.some(busy =>
          periodsOverlap(slotStartUtc, slotEndUtc, busy.start, busy.end)
        )

        slots.push({
          time: timeStr,  // Return as German time (what was requested)
          available: isAvailable,
        })
      }
    }

    // Return response
    return NextResponse.json({
      date,
      duration,
      bufferMinutes: BUFFER_MINUTES,
      timezone: 'Europe/Berlin',
      openingHours: {
        start: `${EARLIEST_START_HOUR}:00`,
        end: `${LATEST_END_HOUR}:00`,
      },
      available: slots.some(s => s.available),
      slots: slots.filter(s => s.available).map(s => s.time),
      allSlots: slots,
    })

  } catch (error) {
    console.error('[Availability API] Error:', error)
    return errorResponse('Internal server error', 500)
  }
}
