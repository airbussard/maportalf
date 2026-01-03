/**
 * Booking by ID API
 *
 * DELETE /api/v1/bookings/[id]
 *
 * Permanently deletes a booking by ID
 */

import { NextRequest } from 'next/server'
import { validateApiKey, unauthorizedResponse, errorResponse, successResponse } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteGoogleCalendarEvent } from '@/lib/google-calendar/service'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = validateApiKey(request)
  if (!auth.valid) {
    return unauthorizedResponse(auth.error)
  }

  const { id } = await params

  if (!id) {
    return errorResponse('Missing booking ID')
  }

  try {
    const supabase = createAdminClient()

    // 1. Load booking
    const { data: booking, error: fetchError } = await supabase
      .from('calendar_events')
      .select('id, event_type, google_event_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !booking) {
      return errorResponse('Booking not found', 404)
    }

    if (booking.event_type !== 'booking') {
      return errorResponse('Can only delete bookings', 400)
    }

    // 2. Delete from Google Calendar (if exists)
    if (booking.google_event_id) {
      try {
        await deleteGoogleCalendarEvent(booking.google_event_id)
        console.log(`[Delete API] Deleted from Google Calendar: ${booking.google_event_id}`)
      } catch (googleError) {
        console.error('[Delete API] Google Calendar delete failed:', googleError)
        // Continue even if Google fails
      }
    }

    // 3. Delete from database
    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[Delete API] Database delete failed:', deleteError)
      return errorResponse('Failed to delete booking', 500)
    }

    console.log(`[Delete API] Booking deleted: ${id}`)

    return successResponse({
      success: true,
      message: 'Booking deleted',
      deletedId: id,
    })

  } catch (error) {
    console.error('[Delete API] Error:', error)
    return errorResponse('Internal server error', 500)
  }
}
