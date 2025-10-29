/**
 * Calendar Events Server Actions
 *
 * Server-side actions for managing calendar events
 * Includes Google Calendar synchronization
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent
} from '@/lib/google-calendar/service'
import { fullSync } from '@/lib/google-calendar/sync'
import type { CalendarEventData, SyncResult } from '@/lib/google-calendar/types'

/**
 * Helper: Convert empty strings to null for UUID fields
 * PostgreSQL UUID fields cannot accept empty strings
 */
function sanitizeUuidFields(data: Partial<CalendarEventData>) {
  return {
    ...data,
    assigned_instructor_id: data.assigned_instructor_id || null,
    request_id: data.request_id || null
  }
}

/**
 * Get calendar events for a date range
 * If no dates provided, gets all events
 */
export async function getCalendarEvents(
  startDate?: string,
  endDate?: string
) {
  const supabase = await createClient()

  let query = supabase
    .from('calendar_events')
    .select('*')
    .order('start_time', { ascending: true })
    .limit(5000) // Explicit limit to override Supabase default of 1000

  if (startDate) {
    query = query.gte('start_time', startDate)
  }

  if (endDate) {
    query = query.lte('start_time', endDate)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch calendar events: ${error.message}`)
  }

  return data || []
}

/**
 * Get a single calendar event by ID
 */
export async function getCalendarEvent(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch calendar event: ${error.message}`)
  }

  return data
}

/**
 * Create a new calendar event
 * Automatically syncs to Google Calendar
 */
export async function createCalendarEvent(eventData: CalendarEventData) {
  const supabase = await createClient()

  // Check user permissions
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Validate required fields based on event type
  if (eventData.event_type === 'fi_assignment') {
    if (!eventData.assigned_instructor_name) {
      throw new Error('Instructor name is required')
    }
  } else {
    if (!eventData.customer_first_name || !eventData.customer_last_name) {
      throw new Error('Customer name is required')
    }
  }

  if (!eventData.start_time || !eventData.end_time) {
    throw new Error('Start and end time are required')
  }

  try {
    // Create event in Google Calendar first
    const googleEvent = await createGoogleCalendarEvent(eventData)

    // Generate UUID for id (calendar_events.id is TEXT type)
    const eventId = crypto.randomUUID()

    // Create in Supabase with google_event_id
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        id: eventId,
        user_id: user.id, // Schema uses user_id, not created_by
        google_event_id: googleEvent.id,
        title: eventData.event_type === 'fi_assignment'
          ? `FI: ${eventData.assigned_instructor_name}${eventData.assigned_instructor_number ? ` (${eventData.assigned_instructor_number})` : ''}`
          : `${eventData.customer_first_name} ${eventData.customer_last_name}`,
        description: eventData.remarks || '',
        event_type: eventData.event_type || 'booking',
        customer_first_name: eventData.customer_first_name || '',
        customer_last_name: eventData.customer_last_name || '',
        customer_phone: eventData.customer_phone,
        customer_email: eventData.customer_email,
        assigned_instructor_id: eventData.assigned_instructor_id || null,
        assigned_instructor_number: eventData.assigned_instructor_number,
        assigned_instructor_name: eventData.assigned_instructor_name,
        is_all_day: eventData.is_all_day || false,
        request_id: eventData.request_id || null,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        duration: eventData.duration,
        attendee_count: eventData.attendee_count,
        remarks: eventData.remarks,
        location: eventData.location || 'FLIGHTHOUR Flugsimulator',
        status: eventData.status || 'confirmed',
        attendees: [], // Required by schema (jsonb, default [])
        etag: googleEvent.etag,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      // Rollback: Delete from Google Calendar if database insert fails
      try {
        await deleteGoogleCalendarEvent(googleEvent.id)
      } catch (rollbackError) {
        console.error('Failed to rollback Google Calendar event:', rollbackError)
      }
      throw new Error(`Failed to create calendar event: ${error.message}`)
    }

    revalidatePath('/kalender')
    revalidatePath('/dashboard')

    return data

  } catch (error) {
    console.error('Error creating calendar event:', error)
    throw error
  }
}

/**
 * Update an existing calendar event
 * Syncs changes to Google Calendar
 */
export async function updateCalendarEvent(
  id: string,
  eventData: Partial<CalendarEventData>
) {
  const supabase = await createClient()

  // Check user permissions
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    // Get existing event
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingEvent) {
      throw new Error('Calendar event not found')
    }

    // Merge with existing data for Google Calendar update
    const mergedData: CalendarEventData = {
      event_type: eventData.event_type || existingEvent.event_type,
      customer_first_name: eventData.customer_first_name || existingEvent.customer_first_name,
      customer_last_name: eventData.customer_last_name || existingEvent.customer_last_name,
      customer_phone: eventData.customer_phone ?? existingEvent.customer_phone,
      customer_email: eventData.customer_email ?? existingEvent.customer_email,
      assigned_instructor_id: eventData.assigned_instructor_id ?? existingEvent.assigned_instructor_id,
      assigned_instructor_number: eventData.assigned_instructor_number ?? existingEvent.assigned_instructor_number,
      assigned_instructor_name: eventData.assigned_instructor_name ?? existingEvent.assigned_instructor_name,
      is_all_day: eventData.is_all_day ?? existingEvent.is_all_day,
      start_time: eventData.start_time || existingEvent.start_time,
      end_time: eventData.end_time || existingEvent.end_time,
      duration: eventData.duration || existingEvent.duration,
      attendee_count: eventData.attendee_count ?? existingEvent.attendee_count,
      remarks: eventData.remarks ?? existingEvent.remarks,
      location: eventData.location || existingEvent.location,
      status: eventData.status || existingEvent.status
    }

    // Update in Google Calendar if google_event_id exists
    if (existingEvent.google_event_id) {
      const googleEvent = await updateGoogleCalendarEvent(
        existingEvent.google_event_id,
        mergedData
      )

      // Update in Supabase with new etag
      const { data, error } = await supabase
        .from('calendar_events')
        .update({
          ...sanitizeUuidFields(eventData),
          etag: googleEvent.etag,
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          last_modified_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update calendar event: ${error.message}`)
      }

      revalidatePath('/kalender')
      revalidatePath('/dashboard')

      return data

    } else {
      // No Google event ID - just update locally
      const { data, error } = await supabase
        .from('calendar_events')
        .update({
          ...sanitizeUuidFields(eventData),
          sync_status: 'pending',
          last_modified_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update calendar event: ${error.message}`)
      }

      revalidatePath('/kalender')
      revalidatePath('/dashboard')

      return data
    }

  } catch (error) {
    console.error('Error updating calendar event:', error)
    throw error
  }
}

/**
 * Delete a calendar event
 * Removes from both Supabase and Google Calendar
 */
export async function deleteCalendarEvent(id: string) {
  const supabase = await createClient()

  // Check user permissions
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    // Get existing event
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingEvent) {
      throw new Error('Calendar event not found')
    }

    // Delete from Google Calendar if google_event_id exists
    if (existingEvent.google_event_id) {
      try {
        await deleteGoogleCalendarEvent(existingEvent.google_event_id)
      } catch (googleError) {
        console.error('Failed to delete from Google Calendar:', googleError)
        // Continue with database deletion even if Google delete fails
      }
    }

    // Delete from Supabase
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete calendar event: ${error.message}`)
    }

    // Reverse sync: If this was a request-generated FI event, withdraw the request
    if (existingEvent.request_id && existingEvent.event_type === 'fi_assignment') {
      try {
        // Get the associated work request
        const { data: workRequest } = await supabase
          .from('work_requests')
          .select('status')
          .eq('id', existingEvent.request_id)
          .single()

        // Only withdraw if still approved
        if (workRequest && workRequest.status === 'approved') {
          await supabase
            .from('work_requests')
            .update({
              status: 'withdrawn',
              calendar_event_id: null
            })
            .eq('id', existingEvent.request_id)

          console.log(`[Reverse Sync] Auto-withdrew request ${existingEvent.request_id} due to calendar event deletion`)

          // Revalidate request pages
          revalidatePath('/requests')
          revalidatePath('/requests/manage')
        }
      } catch (reverseError) {
        console.error('[Reverse Sync] Error auto-withdrawing request:', reverseError)
        // Don't throw - event deletion succeeded, this is bonus
      }
    }

    revalidatePath('/kalender')
    revalidatePath('/dashboard')

    return { success: true }

  } catch (error) {
    console.error('Error deleting calendar event:', error)
    throw error
  }
}

/**
 * Manually trigger Google Calendar sync
 * Manager/Admin only
 */
export async function syncGoogleCalendar(): Promise<SyncResult> {
  const supabase = await createClient()

  // Check user permissions
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Check if user is manager or admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !['manager', 'admin'].includes(profile.role)) {
    throw new Error('Unauthorized - Manager or Admin access required')
  }

  try {
    const result = await fullSync()

    revalidatePath('/kalender')
    revalidatePath('/dashboard')

    return result

  } catch (error) {
    console.error('Error syncing Google Calendar:', error)
    throw error
  }
}

/**
 * Get upcoming events (for dashboard widget)
 */
export async function getUpcomingEvents(limit: number = 5) {
  const supabase = await createClient()

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .gte('start_time', now)
    .order('start_time', { ascending: true })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch upcoming events: ${error.message}`)
  }

  return data || []
}

/**
 * Get last sync status
 */
export async function getLastSyncStatus() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calendar_sync_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') { // Ignore "no rows" error
    throw new Error(`Failed to fetch sync status: ${error.message}`)
  }

  return data || null
}

/**
 * Get all employees with their employee numbers
 * For FI assignment autocomplete
 */
export async function getEmployees() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, employee_number')
    .order('first_name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch employees: ${error.message}`)
  }

  return data || []
}
