/**
 * Cancel Booking API
 *
 * POST /api/v1/bookings/[id]/cancel
 *
 * Cancels a booking by ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, unauthorizedResponse, errorResponse, successResponse } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = validateApiKey(request)
  if (!auth.valid) {
    return unauthorizedResponse(auth.error)
  }

  const { id } = await params

  if (!id) {
    return errorResponse('Missing booking ID')
  }

  let body: { reason?: string; note?: string } = {}
  try {
    body = await request.json()
  } catch {
    // Body is optional for cancel
  }

  const { reason, note } = body

  try {
    const supabase = createAdminClient()

    // First check if booking exists and is not already cancelled
    const { data: existing, error: checkError } = await supabase
      .from('calendar_events')
      .select('id, status, event_type, google_event_id')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return errorResponse('Booking not found', 404)
    }

    if (existing.event_type !== 'booking') {
      return errorResponse('Can only cancel bookings', 400)
    }

    if (existing.status === 'cancelled') {
      return errorResponse('Booking is already cancelled', 400, 'ALREADY_CANCELLED')
    }

    // Cancel the booking
    const { data, error } = await supabase
      .from('calendar_events')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: null,  // UUID field - Shop-API has no user
        cancellation_reason: reason === 'cancelled_by_us' ? 'cancelled_by_us' : 'cancelled_by_customer',
        cancellation_note: note || null,
        sync_status: 'pending',
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Cancel API] Error cancelling booking:', error)
      return errorResponse('Failed to cancel booking', 500)
    }

    // Delete from Google Calendar (if exists)
    if (existing.google_event_id) {
      try {
        const { deleteGoogleCalendarEvent } = await import('@/lib/google-calendar/service')
        await deleteGoogleCalendarEvent(existing.google_event_id)
        console.log(`[Cancel API] Deleted from Google Calendar: ${existing.google_event_id}`)

        // Clear google_event_id in database
        await supabase
          .from('calendar_events')
          .update({ google_event_id: null, sync_status: 'synced' })
          .eq('id', id)
      } catch (googleError) {
        console.error('[Cancel API] Google Calendar delete failed:', googleError)
        // Continue even if Google fails
      }
    }

    return successResponse({
      success: true,
      booking: {
        id: data.id,
        status: data.status,
        cancelledAt: data.cancelled_at,
        cancellationReason: data.cancellation_reason,
        cancellationNote: data.cancellation_note,
      },
    })

  } catch (error) {
    console.error('[Cancel API] Error:', error)
    return errorResponse('Internal server error', 500)
  }
}
