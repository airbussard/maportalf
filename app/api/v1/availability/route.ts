/**
 * Availability API
 *
 * GET /api/v1/availability?date=YYYY-MM-DD&duration=60
 *
 * Returns available time slots for a given date and duration
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, unauthorizedResponse, errorResponse } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// Constants
const EARLIEST_START_HOUR = 10  // 10:00
const LATEST_END_HOUR = 22      // 22:00
const SLOT_INTERVAL = 15        // 15-minute intervals
const BUFFER_MINUTES = 15       // Buffer after each booking

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Validate API key
  const auth = validateApiKey(request)
  if (!auth.valid) {
    return unauthorizedResponse(auth.error)
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams
  const date = searchParams.get('date')  // YYYY-MM-DD
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

    // Define day boundaries
    const dayStart = `${date}T00:00:00`
    const dayEnd = `${date}T23:59:59`

    // Fetch all events for the day (bookings + blockers)
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('start_time, end_time, event_type, is_all_day, customer_first_name, status')
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)
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

    // Collect busy periods (including buffer)
    const busyPeriods: { start: Date; end: Date }[] = []

    for (const event of events || []) {
      const start = new Date(event.start_time)
      const end = new Date(event.end_time)

      // Add buffer after bookings
      if (event.event_type === 'booking') {
        end.setMinutes(end.getMinutes() + BUFFER_MINUTES)
      }

      busyPeriods.push({ start, end })
    }

    // Generate available slots
    const slots: { time: string; available: boolean }[] = []
    const totalDuration = duration + BUFFER_MINUTES

    for (let hour = EARLIEST_START_HOUR; hour < LATEST_END_HOUR; hour++) {
      for (let minute = 0; minute < 60; minute += SLOT_INTERVAL) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const slotStart = new Date(`${date}T${timeStr}:00`)
        const slotEnd = new Date(slotStart.getTime() + totalDuration * 60 * 1000)

        // Check if slot ends within opening hours
        const endHour = slotEnd.getHours()
        const endMinute = slotEnd.getMinutes()

        if (endHour > LATEST_END_HOUR || (endHour === LATEST_END_HOUR && endMinute > 0)) {
          // Slot ends after closing time
          continue
        }

        // Check if slot conflicts with any busy period
        const isAvailable = !busyPeriods.some(busy => {
          return slotStart < busy.end && slotEnd > busy.start
        })

        slots.push({
          time: timeStr,
          available: isAvailable,
        })
      }
    }

    // Return response
    return NextResponse.json({
      date,
      duration,
      bufferMinutes: BUFFER_MINUTES,
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
