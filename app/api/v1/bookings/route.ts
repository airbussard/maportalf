/**
 * Bookings API
 *
 * GET /api/v1/bookings?id=xxx     - Get single booking
 * GET /api/v1/bookings?date=YYYY-MM-DD - Get bookings for a day
 * POST /api/v1/bookings           - Create new booking
 *
 * All times are in German timezone (Europe/Berlin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, unauthorizedResponse, errorResponse, successResponse } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateBookingConfirmationEmail } from '@/lib/email-templates/booking-confirmation'
import { germanTimeToUtc } from '@/lib/timezone'

// Constants
const BUFFER_MINUTES = 14

// Duration labels for titles
const DURATION_LABELS: Record<number, string> = {
  30: 'Economy',
  60: 'Business',
  120: 'First Class',
  180: 'VIP',
}

export const dynamic = 'force-dynamic'

/**
 * GET - Retrieve bookings
 */
export async function GET(request: NextRequest) {
  const auth = validateApiKey(request)
  if (!auth.valid) {
    return unauthorizedResponse(auth.error)
  }

  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')
  const date = searchParams.get('date')

  const supabase = createAdminClient()

  // Get single booking by ID
  if (id) {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .eq('event_type', 'booking')
      .single()

    if (error || !data) {
      return errorResponse('Booking not found', 404)
    }

    return successResponse({
      booking: formatBookingResponse(data)
    })
  }

  // Get bookings for a date (German time)
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse('Invalid date format. Use YYYY-MM-DD')
    }

    // Convert German day boundaries to UTC for database query
    const dayStartUtc = germanTimeToUtc(date, '00:00')
    const dayEndUtc = germanTimeToUtc(date, '23:59')

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('event_type', 'booking')
      .gte('start_time', dayStartUtc.toISOString())
      .lte('start_time', dayEndUtc.toISOString())
      .order('start_time', { ascending: true })

    if (error) {
      console.error('[Bookings API] Error fetching bookings:', error)
      return errorResponse('Database error', 500)
    }

    return successResponse({
      date,
      count: data?.length || 0,
      bookings: (data || []).map(formatBookingResponse)
    })
  }

  return errorResponse('Missing id or date parameter')
}

/**
 * POST - Create new booking
 */
export async function POST(request: NextRequest) {
  const auth = validateApiKey(request)
  if (!auth.valid) {
    return unauthorizedResponse(auth.error)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body')
  }

  const {
    // Required fields
    date,
    time,
    duration,
    customerFirstName,
    customerLastName,
    customerEmail,

    // Optional fields
    customerPhone,
    attendeeCount,
    remarks,
    hasVideoRecording,
    location,

    // Shop reference
    shopOrderNumber,
    shopBookingId,

    // Email options
    sendConfirmationEmail = true,
  } = body

  // Validate required fields
  if (!date || !time || !duration || !customerFirstName || !customerLastName || !customerEmail) {
    return errorResponse('Missing required fields: date, time, duration, customerFirstName, customerLastName, customerEmail')
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return errorResponse('Invalid date format. Use YYYY-MM-DD')
  }

  // Validate time format
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return errorResponse('Invalid time format. Use HH:MM')
  }

  // Validate duration
  const validDurations = [30, 60, 120, 180]
  if (!validDurations.includes(duration)) {
    return errorResponse(`Invalid duration. Valid values: ${validDurations.join(', ')}`)
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return errorResponse('Invalid email format')
  }

  try {
    const supabase = createAdminClient()

    // Calculate start and end time (German time → UTC for DB)
    const startTimeUtc = germanTimeToUtc(date, time)
    const endTimeUtc = new Date(startTimeUtc.getTime() + duration * 60 * 1000)

    // Check for conflicts (including buffer)
    const checkEndTime = new Date(endTimeUtc.getTime() + BUFFER_MINUTES * 60 * 1000)
    const checkStartTime = new Date(startTimeUtc.getTime() - BUFFER_MINUTES * 60 * 1000)

    const { data: conflicts } = await supabase
      .from('calendar_events')
      .select('id, start_time, end_time')
      .neq('status', 'cancelled')
      .in('event_type', ['booking', 'blocker'])
      .lt('start_time', checkEndTime.toISOString())
      .gt('end_time', checkStartTime.toISOString())

    if (conflicts && conflicts.length > 0) {
      return errorResponse('Slot no longer available', 409, 'SLOT_TAKEN')
    }

    // Generate title
    const durationLabel = DURATION_LABELS[duration] || `${duration} Min`
    const title = `${durationLabel} - ${customerFirstName} ${customerLastName}`

    // Create booking (store in UTC)
    const { data: booking, error } = await supabase
      .from('calendar_events')
      .insert({
        event_type: 'booking',
        title,
        customer_first_name: customerFirstName,
        customer_last_name: customerLastName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        start_time: startTimeUtc.toISOString(),
        end_time: endTimeUtc.toISOString(),
        duration,
        is_all_day: false,
        status: 'confirmed',
        sync_status: 'pending',
        attendee_count: attendeeCount || 1,
        location: location || 'FLIGHTHOUR Flugsimulator, Essener Str. 99C, 46047 Oberhausen',
        remarks: remarks ? `${remarks}${shopOrderNumber ? `\nShop Order: ${shopOrderNumber}` : ''}` : (shopOrderNumber ? `Shop Order: ${shopOrderNumber}` : null),
        has_video_recording: hasVideoRecording || false,
      })
      .select()
      .single()

    if (error) {
      console.error('[Bookings API] Error creating booking:', error)
      return errorResponse('Failed to create booking', 500)
    }

    // Queue confirmation email if requested
    if (sendConfirmationEmail && booking) {
      try {
        const emailContent = generateBookingConfirmationEmail({
          customer_first_name: customerFirstName,
          customer_last_name: customerLastName,
          customer_email: customerEmail,
          start_time: startTimeUtc.toISOString(),
          end_time: endTimeUtc.toISOString(),
          duration: duration,
          location: booking.location || 'FLIGHTHOUR Flugsimulator',
          attendee_count: attendeeCount || 1,
          has_video_recording: hasVideoRecording || false,
          remarks: remarks || undefined,
        })

        await supabase.from('email_queue').insert({
          type: 'booking_confirmation',
          recipient: customerEmail,
          recipient_email: customerEmail,
          subject: emailContent.subject,
          content: emailContent.htmlContent,
          body: emailContent.plainText,
          event_id: booking.id,
          status: 'pending',
          attempts: 0,
        })
      } catch (emailError) {
        console.error('[Bookings API] Error queueing confirmation email:', emailError)
        // Don't fail the booking if email fails
      }
    }

    return successResponse({
      success: true,
      booking: formatBookingResponse(booking),
    }, 201)

  } catch (error) {
    console.error('[Bookings API] Error:', error)
    return errorResponse('Internal server error', 500)
  }
}

/**
 * Format booking response for API
 */
function formatBookingResponse(booking: any) {
  return {
    id: booking.id,
    status: booking.status,
    startTime: booking.start_time,
    endTime: booking.end_time,
    duration: booking.duration,
    title: booking.title,
    location: booking.location,
    customer: {
      firstName: booking.customer_first_name,
      lastName: booking.customer_last_name,
      email: booking.customer_email,
      phone: booking.customer_phone,
    },
    attendeeCount: booking.attendee_count,
    hasVideoRecording: booking.has_video_recording,
    remarks: booking.remarks,
    createdAt: booking.created_at,
    updatedAt: booking.updated_at,
    cancelledAt: booking.cancelled_at,
    cancellationReason: booking.cancellation_reason,
  }
}
