/**
 * MAYDAY Rebook Actions
 *
 * Server-side actions for the public rebooking portal
 * Allows customers to rebook cancelled appointments via secure token
 */

'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  createGoogleCalendarEvent,
} from '@/lib/google-calendar/service'
import { generateBookingConfirmationEmail } from '@/lib/email-templates/booking-confirmation'

export interface TimeSlot {
  start: string  // ISO string
  end: string    // ISO string
}

export interface RebookTokenData {
  id: string
  token: string
  original_event_id: string
  customer_email: string
  customer_first_name: string | null
  customer_last_name: string | null
  customer_phone: string | null
  original_duration: number
  original_attendee_count: number
  original_location: string | null
  used: boolean
  expires_at: string
  created_at: string
}

/**
 * Validate a rebook token and return token data if valid
 */
export async function validateRebookToken(token: string): Promise<{
  valid: boolean
  error?: 'invalid' | 'expired' | 'used'
  data?: RebookTokenData
}> {
  const supabase = createAdminClient()

  const { data: tokenData, error } = await supabase
    .from('rebook_tokens')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !tokenData) {
    return { valid: false, error: 'invalid' }
  }

  if (tokenData.used) {
    return { valid: false, error: 'used' }
  }

  if (new Date(tokenData.expires_at) < new Date()) {
    return { valid: false, error: 'expired' }
  }

  return { valid: true, data: tokenData }
}

/**
 * Get available time slots for rebooking
 *
 * Rules:
 * 1. Find all fi_assignment events (FI working hours)
 * 2. Subtract all existing booking/blocker events
 * 3. Return slots that fit the required duration
 */
export async function getAvailableSlots(params: {
  startDate: string
  endDate: string
  duration: number // in minutes
}): Promise<{ success: boolean; slots?: TimeSlot[]; error?: string }> {
  const { startDate, endDate, duration } = params

  try {
    const supabase = createAdminClient()

    // Get all FI assignment events in the date range
    const { data: fiEvents, error: fiError } = await supabase
      .from('calendar_events')
      .select('start_time, end_time, actual_work_start_time, actual_work_end_time')
      .eq('event_type', 'fi_assignment')
      .eq('status', 'confirmed')
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .order('start_time', { ascending: true })

    if (fiError) {
      console.error('[Rebook] Failed to fetch FI events:', fiError)
      return { success: false, error: 'Fehler beim Laden der Verfügbarkeit' }
    }

    // Get all booking and blocker events in the date range
    const { data: blockedEvents, error: blockedError } = await supabase
      .from('calendar_events')
      .select('start_time, end_time')
      .in('event_type', ['booking', 'blocker'])
      .eq('status', 'confirmed')
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .order('start_time', { ascending: true })

    if (blockedError) {
      console.error('[Rebook] Failed to fetch blocked events:', blockedError)
      return { success: false, error: 'Fehler beim Laden der Verfügbarkeit' }
    }

    const availableSlots: TimeSlot[] = []

    // Process each FI assignment day
    for (const fi of fiEvents || []) {
      // Determine actual work hours
      // FI events are stored with 08:00-09:00 for Google Calendar
      // actual_work_start_time and actual_work_end_time contain the real hours
      const eventDate = fi.start_time.split('T')[0]

      let workStart: Date
      let workEnd: Date

      if (fi.actual_work_start_time && fi.actual_work_end_time) {
        // Use actual work times
        workStart = new Date(`${eventDate}T${fi.actual_work_start_time}`)
        workEnd = new Date(`${eventDate}T${fi.actual_work_end_time}`)
      } else {
        // Fallback to event times (shouldn't happen but be safe)
        workStart = new Date(fi.start_time)
        workEnd = new Date(fi.end_time)
      }

      // Get blocked time ranges for this day
      const dayStart = new Date(`${eventDate}T00:00:00`)
      const dayEnd = new Date(`${eventDate}T23:59:59`)

      const blockedRanges = (blockedEvents || [])
        .filter(event => {
          const eventStart = new Date(event.start_time)
          return eventStart >= dayStart && eventStart <= dayEnd
        })
        .map(event => ({
          start: new Date(event.start_time),
          end: new Date(event.end_time)
        }))
        .sort((a, b) => a.start.getTime() - b.start.getTime())

      // Find free slots within FI work hours
      let currentStart = workStart

      for (const blocked of blockedRanges) {
        // If there's a gap before this blocked range
        if (blocked.start > currentStart) {
          // Calculate available duration
          const gapDuration = (blocked.start.getTime() - currentStart.getTime()) / 60000

          // If gap is large enough for the booking
          if (gapDuration >= duration) {
            // Generate 30-minute interval slots
            let slotStart = new Date(currentStart)
            while (slotStart.getTime() + duration * 60000 <= blocked.start.getTime()) {
              // Only add slots that start in the future
              if (slotStart > new Date()) {
                availableSlots.push({
                  start: slotStart.toISOString(),
                  end: new Date(slotStart.getTime() + duration * 60000).toISOString()
                })
              }
              // Move to next 30-minute interval
              slotStart = new Date(slotStart.getTime() + 30 * 60000)
            }
          }
        }
        // Move current start to end of blocked range
        currentStart = new Date(Math.max(currentStart.getTime(), blocked.end.getTime()))
      }

      // Check if there's time after the last blocked range
      if (currentStart < workEnd) {
        const remainingDuration = (workEnd.getTime() - currentStart.getTime()) / 60000

        if (remainingDuration >= duration) {
          let slotStart = new Date(currentStart)
          while (slotStart.getTime() + duration * 60000 <= workEnd.getTime()) {
            // Only add slots that start in the future
            if (slotStart > new Date()) {
              availableSlots.push({
                start: slotStart.toISOString(),
                end: new Date(slotStart.getTime() + duration * 60000).toISOString()
              })
            }
            slotStart = new Date(slotStart.getTime() + 30 * 60000)
          }
        }
      }
    }

    return { success: true, slots: availableSlots }
  } catch (error) {
    console.error('[Rebook] Unexpected error in getAvailableSlots:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Execute the rebooking - create new event and mark token as used
 */
export async function rebookEvent(params: {
  token: string
  newStartTime: string
}): Promise<{
  success: boolean
  newEventId?: string
  error?: string
}> {
  const { token, newStartTime } = params

  try {
    const supabase = createAdminClient()

    // 1. Validate token
    const validation = await validateRebookToken(token)
    if (!validation.valid || !validation.data) {
      return {
        success: false,
        error: validation.error === 'used'
          ? 'Dieser Link wurde bereits verwendet.'
          : validation.error === 'expired'
          ? 'Dieser Link ist abgelaufen.'
          : 'Ungültiger Link.'
      }
    }

    const tokenData = validation.data

    // 2. Calculate end time based on original duration
    const startDate = new Date(newStartTime)
    const endDate = new Date(startDate.getTime() + tokenData.original_duration * 60000)

    // 3. Double-check slot is still available (race condition protection)
    const slotsResult = await getAvailableSlots({
      startDate: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).toISOString(),
      endDate: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 23, 59, 59).toISOString(),
      duration: tokenData.original_duration
    })

    if (!slotsResult.success || !slotsResult.slots) {
      return { success: false, error: 'Verfügbarkeit konnte nicht geprüft werden.' }
    }

    const slotStillAvailable = slotsResult.slots.some(slot =>
      new Date(slot.start).getTime() === startDate.getTime()
    )

    if (!slotStillAvailable) {
      return { success: false, error: 'Dieser Zeitslot ist leider nicht mehr verfügbar.' }
    }

    // 4. Generate event title
    const customerName = [tokenData.customer_first_name, tokenData.customer_last_name]
      .filter(Boolean)
      .join(' ') || 'Kunde'
    const eventTitle = customerName

    // 5. Create Google Calendar event
    const googleEvent = await createGoogleCalendarEvent({
      event_type: 'booking',
      customer_first_name: tokenData.customer_first_name || '',
      customer_last_name: tokenData.customer_last_name || '',
      customer_phone: tokenData.customer_phone || undefined,
      customer_email: tokenData.customer_email,
      title: eventTitle,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      duration: tokenData.original_duration,
      attendee_count: tokenData.original_attendee_count || 1,
      location: tokenData.original_location || 'FLIGHTHOUR Flugsimulator'
    })

    // 6. Create event in database
    const eventId = crypto.randomUUID()
    const { error: insertError } = await supabase
      .from('calendar_events')
      .insert({
        id: eventId,
        google_event_id: googleEvent.id,
        title: eventTitle,
        description: 'Neu gebucht über MAYDAY Rebook-Portal',
        event_type: 'booking',
        customer_first_name: tokenData.customer_first_name || '',
        customer_last_name: tokenData.customer_last_name || '',
        customer_phone: tokenData.customer_phone,
        customer_email: tokenData.customer_email,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        duration: tokenData.original_duration,
        attendee_count: tokenData.original_attendee_count || 1,
        location: tokenData.original_location || 'FLIGHTHOUR Flugsimulator',
        status: 'confirmed',
        attendees: [],
        etag: googleEvent.etag,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('[Rebook] Failed to insert event:', insertError)
      return { success: false, error: 'Termin konnte nicht erstellt werden.' }
    }

    // 7. Mark token as used
    const { error: tokenUpdateError } = await supabase
      .from('rebook_tokens')
      .update({
        used: true,
        used_at: new Date().toISOString(),
        new_event_id: eventId
      })
      .eq('id', tokenData.id)

    if (tokenUpdateError) {
      console.error('[Rebook] Failed to mark token as used:', tokenUpdateError)
      // Don't fail - event was created successfully
    }

    // 8. Queue confirmation email
    try {
      const template = generateBookingConfirmationEmail({
        customer_first_name: tokenData.customer_first_name || '',
        customer_last_name: tokenData.customer_last_name || '',
        customer_email: tokenData.customer_email,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        duration: tokenData.original_duration,
        attendee_count: tokenData.original_attendee_count || 1,
        location: tokenData.original_location || 'FLIGHTHOUR Flugsimulator'
      })

      await supabase.from('email_queue').insert({
        type: 'booking_confirmation',
        recipient: tokenData.customer_email,
        recipient_email: tokenData.customer_email,
        subject: template.subject,
        body: template.plainText,
        content: template.htmlContent,
        status: 'pending',
        event_id: eventId,
        calendar_google_event_id: googleEvent.id
      })
    } catch (emailError) {
      console.error('[Rebook] Failed to queue confirmation email:', emailError)
      // Don't fail - booking was successful
    }

    return { success: true, newEventId: eventId }

  } catch (error) {
    console.error('[Rebook] Unexpected error in rebookEvent:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten.'
    }
  }
}
