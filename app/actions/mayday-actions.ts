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
import { fromZonedTime } from 'date-fns-tz'
import { generateMaydayShiftEmail } from '@/lib/email-templates/mayday-shift'
import { generateMaydayCancelEmail } from '@/lib/email-templates/mayday-cancel'
import { generateShiftSMS, generateCancelSMS } from '@/lib/sms/templates'
import { normalizePhoneNumber, isValidPhoneNumber } from '@/lib/sms/twilio-client'
import { MAYDAY_REASONS, MAYDAY_SMS_REASONS, type MaydayReason } from '@/lib/mayday-constants'

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
  filterDate: 'today' | 'tomorrow' | 'week' | 'custom',
  filterFromTime?: string,
  customDate?: string // ISO date string YYYY-MM-DD
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

    if (filterDate === 'custom' && customDate) {
      // Custom date selected - customDate is YYYY-MM-DD in Berlin timezone
      // We need to convert Berlin local time to UTC for the DB query
      // Using date-fns-tz for correct timezone handling (incl. DST)

      const [year, month, day] = customDate.split('-').map(Number)

      // Berlin 00:00:00 → UTC (handles DST automatically)
      const startUTC = fromZonedTime(new Date(year, month - 1, day, 0, 0, 0), 'Europe/Berlin')
      // Berlin 23:59:59 → UTC
      const endUTC = fromZonedTime(new Date(year, month - 1, day, 23, 59, 59), 'Europe/Berlin')

      const { data, error } = await supabase
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
        .gte('start_time', startUTC.toISOString())
        .lte('start_time', endUTC.toISOString())
        .order('start_time', { ascending: true })

      if (error) {
        console.error('[MAYDAY] Failed to fetch events:', error)
        return { success: false, error: error.message }
      }

      return { success: true, events: data || [] }
    }

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
  sendSMS?: boolean
}): Promise<{
  success: boolean
  shifted: number
  notified: number
  smsQueued: number
  error?: string
}> {
  const { eventIds, shiftMinutes, reason, reasonNote, sendNotifications, sendSMS = false } = params

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
      return { success: false, shifted: 0, notified: 0, smsQueued: 0, error: fetchError?.message }
    }

    let shifted = 0
    let notified = 0
    let smsQueued = 0

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
            // Create confirmation token
            const { data: tokenData, error: tokenError } = await adminSupabase
              .from('mayday_confirmation_tokens')
              .insert({
                event_id: event.id,
                action_type: 'shift',
                customer_email: event.customer_email,
                customer_name: `${event.customer_first_name || ''} ${event.customer_last_name || ''}`.trim() || null,
                reason: MAYDAY_REASONS[reason].emailText,
                shift_minutes: shiftMinutes,
                old_start_time: event.start_time,
                new_start_time: newStartTime.toISOString()
              })
              .select('token')
              .single()

            if (tokenError) {
              console.error('[MAYDAY] Failed to create token:', tokenError)
            }

            const confirmUrl = tokenData?.token
              ? `https://flighthour.getemergence.com/api/mayday/confirm/${tokenData.token}`
              : undefined

            const emailContent = generateMaydayShiftEmail({
              customerFirstName: event.customer_first_name || '',
              customerLastName: event.customer_last_name || '',
              oldStartTime: event.start_time,
              oldEndTime: event.end_time,
              newStartTime: newStartTime.toISOString(),
              newEndTime: newEndTime.toISOString(),
              reason: MAYDAY_REASONS[reason].emailText,
              reasonNote,
              location: event.location || 'FLIGHTHOUR GmbH',
              confirmUrl
            })

            const { error: emailInsertError } = await adminSupabase.from('email_queue').insert({
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

            if (emailInsertError) {
              console.error('[MAYDAY] Failed to insert email into queue:', emailInsertError)
            } else {
              notified++
              console.log(`[MAYDAY] Email queued for ${event.customer_email}`)
            }
          } catch (emailError) {
            console.error('[MAYDAY] Failed to queue notification:', event.id, emailError)
            // Continue anyway - event is shifted
          }
        }

        // Queue SMS if requested and phone exists
        if (sendSMS && event.customer_phone && isValidPhoneNumber(event.customer_phone)) {
          try {
            const smsMessage = generateShiftSMS({
              originalStartTime: event.start_time,
              newStartTime: newStartTime.toISOString(),
              reason: MAYDAY_SMS_REASONS[reason]
            })

            await adminSupabase.from('sms_queue').insert({
              phone_number: normalizePhoneNumber(event.customer_phone),
              message: smsMessage,
              event_id: event.id,
              notification_type: 'shift',
              status: 'pending'
            })

            smsQueued++
            console.log(`[MAYDAY] SMS queued for ${event.customer_phone}`)
          } catch (smsError) {
            console.error('[MAYDAY] Failed to queue SMS:', event.id, smsError)
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

    return { success: true, shifted, notified, smsQueued }
  } catch (error) {
    console.error('[MAYDAY] Unexpected error in shiftEvents:', error)
    return {
      success: false,
      shifted: 0,
      notified: 0,
      smsQueued: 0,
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
  sendSMS?: boolean
}): Promise<{
  success: boolean
  cancelled: number
  notified: number
  smsQueued: number
  error?: string
}> {
  const { eventIds, reason, reasonNote, sendNotifications, offerRebooking, sendSMS = false } = params

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
      return { success: false, cancelled: 0, notified: 0, smsQueued: 0, error: fetchError?.message }
    }

    let cancelled = 0
    let notified = 0
    let smsQueued = 0

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
            // Create confirmation token
            const { data: tokenData, error: tokenError } = await adminSupabase
              .from('mayday_confirmation_tokens')
              .insert({
                event_id: event.id,
                action_type: 'cancel',
                customer_email: event.customer_email,
                customer_name: `${event.customer_first_name || ''} ${event.customer_last_name || ''}`.trim() || null,
                reason: MAYDAY_REASONS[reason].emailText,
                shift_minutes: null,
                old_start_time: event.start_time,
                new_start_time: null
              })
              .select('token')
              .single()

            if (tokenError) {
              console.error('[MAYDAY] Failed to create token:', tokenError)
            }

            const confirmUrl = tokenData?.token
              ? `https://flighthour.getemergence.com/api/mayday/confirm/${tokenData.token}`
              : undefined

            // Create rebook token if rebooking is offered
            let rebookUrl: string | undefined
            if (offerRebooking) {
              // Calculate duration from event times
              const startTime = new Date(event.start_time)
              const endTime = new Date(event.end_time)
              const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000)

              const { data: rebookTokenData, error: rebookTokenError } = await adminSupabase
                .from('rebook_tokens')
                .insert({
                  original_event_id: event.id,
                  customer_email: event.customer_email,
                  customer_first_name: event.customer_first_name || null,
                  customer_last_name: event.customer_last_name || null,
                  customer_phone: event.customer_phone || null,
                  original_duration: event.duration || durationMinutes || 60,
                  original_attendee_count: event.attendee_count || 1,
                  original_location: event.location || 'FLIGHTHOUR Flugsimulator'
                })
                .select('token')
                .single()

              if (rebookTokenError) {
                console.error('[MAYDAY] Failed to create rebook token:', rebookTokenError)
              } else if (rebookTokenData?.token) {
                rebookUrl = `https://flighthour.getemergence.com/rebook/${rebookTokenData.token}`
              }
            }

            const emailContent = generateMaydayCancelEmail({
              customerFirstName: event.customer_first_name || '',
              customerLastName: event.customer_last_name || '',
              originalStartTime: event.start_time,
              originalEndTime: event.end_time,
              reason: MAYDAY_REASONS[reason].emailText,
              reasonNote,
              location: event.location || 'FLIGHTHOUR GmbH',
              offerRebooking,
              rebookUrl,
              confirmUrl
            })

            const { error: emailInsertError } = await adminSupabase.from('email_queue').insert({
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

            if (emailInsertError) {
              console.error('[MAYDAY] Failed to insert cancel email into queue:', emailInsertError)
            } else {
              notified++
              console.log(`[MAYDAY] Cancel email queued for ${event.customer_email}`)
            }
          } catch (emailError) {
            console.error('[MAYDAY] Failed to queue notification:', event.id, emailError)
            // Continue anyway - event is cancelled
          }
        }

        // Queue SMS if requested and phone exists
        if (sendSMS && event.customer_phone && isValidPhoneNumber(event.customer_phone)) {
          try {
            const smsMessage = generateCancelSMS({
              originalStartTime: event.start_time,
              reason: MAYDAY_SMS_REASONS[reason]
            })

            await adminSupabase.from('sms_queue').insert({
              phone_number: normalizePhoneNumber(event.customer_phone),
              message: smsMessage,
              event_id: event.id,
              notification_type: 'cancel',
              status: 'pending'
            })

            smsQueued++
            console.log(`[MAYDAY] SMS queued for ${event.customer_phone}`)
          } catch (smsError) {
            console.error('[MAYDAY] Failed to queue SMS:', event.id, smsError)
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

    return { success: true, cancelled, notified, smsQueued }
  } catch (error) {
    console.error('[MAYDAY] Unexpected error in cancelEvents:', error)
    return {
      success: false,
      cancelled: 0,
      notified: 0,
      smsQueued: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
