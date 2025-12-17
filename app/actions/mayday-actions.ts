/**
 * MAYDAY Center Server Actions
 *
 * Server-side actions for emergency appointment management
 * Includes shifting events, cancellation, and notifications
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent
} from '@/lib/google-calendar/service'
import { cancelCalendarEvent } from './calendar-events'
import { generateMaydayShiftEmail } from '@/lib/email-templates/mayday-shift'
import { generateMaydayCancelEmail } from '@/lib/email-templates/mayday-cancel'

export type MaydayReason = 'technical_issue' | 'staff_illness' | 'other'

export const MAYDAY_REASONS = {
  technical_issue: {
    label: 'Technische Probleme',
    emailText: 'Aufgrund eines technischen Problems',
    smsText: 'wegen techn. Probleme'
  },
  staff_illness: {
    label: 'Krankheitsfall',
    emailText: 'Aufgrund eines kurzfristigen Krankheitsfalls',
    smsText: 'wegen Krankheit'
  },
  other: {
    label: 'Sonstiges',
    emailText: 'Aus organisatorischen Gründen',
    smsText: 'aus org. Gründen'
  }
} as const

interface CalendarEvent {
  id: string
  google_event_id: string | null
  event_type: string
  title: string
  start_time: string
  end_time: string
  customer_first_name: string | null
  customer_last_name: string | null
  customer_email: string | null
  customer_phone: string | null
  attendee_count: number | null
  location: string | null
}

/**
 * Get upcoming booking events for MAYDAY Center
 */
export async function getUpcomingBookings(
  filterDate: 'today' | 'tomorrow' | 'week',
  filterFromTime?: string
): Promise<{
  success: boolean
  events?: CalendarEvent[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Calculate date range based on filter
    const now = new Date()
    let startDate: Date
    let endDate: Date

    if (filterDate === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    } else if (filterDate === 'tomorrow') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59)
    } else {
      // This week (from today to end of week)
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      // Calculate days until Sunday (6 - current day of week)
      const daysUntilSunday = 6 - now.getDay()
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 23, 59, 59)
    }

    // If filterFromTime is set, adjust start time
    if (filterFromTime) {
      const [hours, minutes] = filterFromTime.split(':').map(Number)
      startDate.setHours(hours, minutes, 0, 0)
    }

    let query = supabase
      .from('calendar_events')
      .select(`
        id,
        google_event_id,
        event_type,
        title,
        start_time,
        end_time,
        customer_first_name,
        customer_last_name,
        customer_email,
        customer_phone,
        attendee_count,
        location
      `)
      .eq('event_type', 'booking')
      .eq('status', 'confirmed')
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('[MAYDAY] Failed to fetch events:', error)
      return { success: false, error: error.message }
    }

    return { success: true, events: data || [] }
  } catch (error) {
    console.error('[MAYDAY] Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Shift multiple events by a specified number of minutes
 */
export async function shiftEvents(params: {
  eventIds: string[]
  shiftMinutes: number
  reason: MaydayReason
  reasonNote?: string
  sendNotifications: boolean
}): Promise<{
  success: boolean
  shifted: number
  notified: number
  error?: string
}> {
  const { eventIds, shiftMinutes, reason, reasonNote, sendNotifications } = params

  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // Get all events to shift
    const { data: events, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .in('id', eventIds)

    if (fetchError || !events) {
      console.error('[MAYDAY] Failed to fetch events:', fetchError)
      return { success: false, shifted: 0, notified: 0, error: fetchError?.message }
    }

    let shifted = 0
    let notified = 0

    for (const event of events) {
      try {
        // Calculate new times
        const oldStartTime = new Date(event.start_time)
        const oldEndTime = new Date(event.end_time)
        const newStartTime = new Date(oldStartTime.getTime() + shiftMinutes * 60 * 1000)
        const newEndTime = new Date(oldEndTime.getTime() + shiftMinutes * 60 * 1000)

        // Update in database
        const { error: updateError } = await adminSupabase
          .from('calendar_events')
          .update({
            start_time: newStartTime.toISOString(),
            end_time: newEndTime.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', event.id)

        if (updateError) {
          console.error('[MAYDAY] Failed to update event:', event.id, updateError)
          continue
        }

        // Update in Google Calendar if google_event_id exists
        if (event.google_event_id) {
          try {
            // Build full event data for Google Calendar update
            await updateGoogleCalendarEvent(event.google_event_id, {
              event_type: event.event_type,
              customer_first_name: event.customer_first_name || '',
              customer_last_name: event.customer_last_name || '',
              customer_phone: event.customer_phone,
              customer_email: event.customer_email,
              start_time: newStartTime.toISOString(),
              end_time: newEndTime.toISOString(),
              duration: event.duration || Math.round((newEndTime.getTime() - newStartTime.getTime()) / 60000),
              attendee_count: event.attendee_count,
              remarks: event.remarks,
              location: event.location
            })
          } catch (googleError) {
            console.error('[MAYDAY] Failed to update Google Calendar:', event.id, googleError)
            // Continue anyway - DB is updated
          }
        }

        shifted++

        // Queue notification email if requested and email exists
        if (sendNotifications && event.customer_email) {
          try {
            const emailContent = generateMaydayShiftEmail({
              customerFirstName: event.customer_first_name || '',
              customerLastName: event.customer_last_name || '',
              oldStartTime: event.start_time,
              oldEndTime: event.end_time,
              newStartTime: newStartTime.toISOString(),
              newEndTime: newEndTime.toISOString(),
              reason: MAYDAY_REASONS[reason].emailText,
              reasonNote,
              location: event.location || 'FLIGHTHOUR GmbH'
            })

            await adminSupabase.from('email_queue').insert({
              type: 'mayday_notification',
              recipient: event.customer_email,
              recipient_email: event.customer_email,
              subject: emailContent.subject,
              body: emailContent.plainText,
              content: emailContent.htmlContent,
              event_id: event.id,
              status: 'pending',
              created_at: new Date().toISOString()
            })

            notified++
          } catch (emailError) {
            console.error('[MAYDAY] Failed to queue notification:', event.id, emailError)
            // Continue anyway - event is shifted
          }
        }
      } catch (eventError) {
        console.error('[MAYDAY] Error processing event:', event.id, eventError)
        continue
      }
    }

    revalidatePath('/mayday-center')
    revalidatePath('/kalender')

    return { success: true, shifted, notified }
  } catch (error) {
    console.error('[MAYDAY] Unexpected error in shiftEvents:', error)
    return {
      success: false,
      shifted: 0,
      notified: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Cancel multiple events with notifications
 */
export async function cancelEventsWithNotification(params: {
  eventIds: string[]
  reason: MaydayReason
  reasonNote?: string
  sendNotifications: boolean
  offerRebooking: boolean
}): Promise<{
  success: boolean
  cancelled: number
  notified: number
  error?: string
}> {
  const { eventIds, reason, reasonNote, sendNotifications, offerRebooking } = params

  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // Get all events to cancel
    const { data: events, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .in('id', eventIds)

    if (fetchError || !events) {
      console.error('[MAYDAY] Failed to fetch events:', fetchError)
      return { success: false, cancelled: 0, notified: 0, error: fetchError?.message }
    }

    let cancelled = 0
    let notified = 0

    for (const event of events) {
      try {
        // Use existing cancelCalendarEvent function
        // This handles Google Calendar deletion and status update
        const cancelResult = await cancelCalendarEvent(
          event.id,
          'cancelled_by_us',
          `MAYDAY: ${MAYDAY_REASONS[reason].label}${reasonNote ? ` - ${reasonNote}` : ''}`,
          false // Don't send the default cancellation email - we'll send MAYDAY version
        )

        if (!cancelResult?.success) {
          console.error('[MAYDAY] Failed to cancel event:', event.id)
          continue
        }

        cancelled++

        // Queue MAYDAY notification email if requested and email exists
        if (sendNotifications && event.customer_email) {
          try {
            const emailContent = generateMaydayCancelEmail({
              customerFirstName: event.customer_first_name || '',
              customerLastName: event.customer_last_name || '',
              originalStartTime: event.start_time,
              originalEndTime: event.end_time,
              reason: MAYDAY_REASONS[reason].emailText,
              reasonNote,
              location: event.location || 'FLIGHTHOUR GmbH',
              offerRebooking,
              rebookUrl: offerRebooking ? `https://flighthour.de/rebook/${event.id}` : undefined
            })

            await adminSupabase.from('email_queue').insert({
              type: 'mayday_notification',
              recipient: event.customer_email,
              recipient_email: event.customer_email,
              subject: emailContent.subject,
              body: emailContent.plainText,
              content: emailContent.htmlContent,
              event_id: event.id,
              status: 'pending',
              created_at: new Date().toISOString()
            })

            notified++
          } catch (emailError) {
            console.error('[MAYDAY] Failed to queue notification:', event.id, emailError)
            // Continue anyway - event is cancelled
          }
        }
      } catch (eventError) {
        console.error('[MAYDAY] Error processing event:', event.id, eventError)
        continue
      }
    }

    revalidatePath('/mayday-center')
    revalidatePath('/kalender')
    revalidatePath('/cancellations')

    return { success: true, cancelled, notified }
  } catch (error) {
    console.error('[MAYDAY] Unexpected error in cancelEvents:', error)
    return {
      success: false,
      cancelled: 0,
      notified: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
