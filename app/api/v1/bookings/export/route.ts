/**
 * Bookings Export API
 *
 * GET /api/v1/bookings/export?from=2020-01-01&to=2025-12-31&limit=1000&offset=0
 *
 * Exports historical booking data with pagination
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, unauthorizedResponse, errorResponse, successResponse } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = validateApiKey(request)
  if (!auth.valid) {
    return unauthorizedResponse(auth.error)
  }

  const searchParams = request.nextUrl.searchParams
  const from = searchParams.get('from') || '2020-01-01'
  const to = searchParams.get('to') || new Date().toISOString().split('T')[0]
  const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 5000) // Max 5000
  const offset = parseInt(searchParams.get('offset') || '0')
  const includeCustomerData = searchParams.get('includeCustomerData') !== 'false'

  // Validate date formats
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return errorResponse('Invalid date format. Use YYYY-MM-DD')
  }

  try {
    const supabase = createAdminClient()

    const { data: bookings, error, count } = await supabase
      .from('calendar_events')
      .select('*', { count: 'exact' })
      .eq('event_type', 'booking')
      .gte('start_time', `${from}T00:00:00`)
      .lte('start_time', `${to}T23:59:59`)
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[Export API] Error:', error)
      return errorResponse('Database error', 500)
    }

    // Format export data
    const exportData = bookings?.map(booking => ({
      id: booking.id,

      // Appointment data
      startTime: booking.start_time,
      endTime: booking.end_time,
      duration: booking.duration,
      title: booking.title,
      status: booking.status,

      // Customer data (optional)
      ...(includeCustomerData && {
        customer: {
          firstName: booking.customer_first_name,
          lastName: booking.customer_last_name,
          email: booking.customer_email,
          phone: booking.customer_phone,
        },
      }),

      // Details
      attendeeCount: booking.attendee_count,
      remarks: booking.remarks,
      hasVideoRecording: booking.has_video_recording,
      location: booking.location,

      // Cancellation
      cancelledAt: booking.cancelled_at,
      cancellationReason: booking.cancellation_reason,

      // Shop reference
      shopOrderNumber: booking.shop_order_number,
      shopBookingId: booking.shop_booking_id,

      // Timestamps
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
    }))

    return successResponse({
      dateRange: { from, to },
      total: count || 0,
      limit,
      offset,
      hasMore: (offset + limit) < (count || 0),
      bookings: exportData || [],
    })

  } catch (error) {
    console.error('[Export API] Error:', error)
    return errorResponse('Internal server error', 500)
  }
}
