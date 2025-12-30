/**
 * Calendar Month Overview API
 *
 * GET /api/v1/calendar/month?year=2025&month=1
 *
 * Returns overview of a month with blocked days and booking counts
 * All times are in German timezone (Europe/Berlin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, unauthorizedResponse, errorResponse, successResponse } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { germanTimeToUtc, formatGermanDate } from '@/lib/timezone'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = validateApiKey(request)
  if (!auth.valid) {
    return unauthorizedResponse(auth.error)
  }

  const searchParams = request.nextUrl.searchParams
  const yearParam = searchParams.get('year')
  const monthParam = searchParams.get('month')

  // Default to current month if not specified
  const now = new Date()
  const year = yearParam ? parseInt(yearParam) : now.getFullYear()
  const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1

  // Validate
  if (isNaN(year) || year < 2020 || year > 2100) {
    return errorResponse('Invalid year')
  }

  if (isNaN(month) || month < 1 || month > 12) {
    return errorResponse('Invalid month (1-12)')
  }

  try {
    const supabase = createAdminClient()

    // Calculate month boundaries in German time, convert to UTC for query
    const daysInMonth = new Date(year, month, 0).getDate()
    const firstDay = `${year}-${month.toString().padStart(2, '0')}-01`
    const lastDay = `${year}-${month.toString().padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}`

    const startDateUtc = germanTimeToUtc(firstDay, '00:00')
    const endDateUtc = germanTimeToUtc(lastDay, '23:59')

    // Fetch all events for the month
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('start_time, end_time, event_type, is_all_day, status')
      .gte('start_time', startDateUtc.toISOString())
      .lte('start_time', endDateUtc.toISOString())
      .neq('status', 'cancelled')

    if (error) {
      console.error('[Calendar Month API] Error:', error)
      return errorResponse('Database error', 500)
    }

    // Initialize days object
    const days: Record<string, {
      date: string
      available: boolean
      blocked: boolean
      bookingCount: number
      blockerTitle?: string
    }> = {}

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
      days[dateStr] = {
        date: dateStr,
        available: true,
        blocked: false,
        bookingCount: 0,
      }
    }

    // Process events - extract date in German timezone
    for (const event of events || []) {
      // Convert UTC event time to German date
      const eventDate = formatGermanDate(event.start_time)

      if (days[eventDate]) {
        if (event.event_type === 'blocker' && event.is_all_day) {
          days[eventDate].blocked = true
          days[eventDate].available = false
        } else if (event.event_type === 'booking') {
          days[eventDate].bookingCount++
        }
      }
    }

    // Convert to array and sort
    const daysArray = Object.values(days).sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    return successResponse({
      year,
      month,
      daysInMonth,
      days: daysArray,
      summary: {
        totalDays: daysInMonth,
        blockedDays: daysArray.filter(d => d.blocked).length,
        daysWithBookings: daysArray.filter(d => d.bookingCount > 0).length,
        totalBookings: daysArray.reduce((sum, d) => sum + d.bookingCount, 0),
      },
    })

  } catch (error) {
    console.error('[Calendar Month API] Error:', error)
    return errorResponse('Internal server error', 500)
  }
}
