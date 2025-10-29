/**
 * Google Calendar Sync Logic
 *
 * Bidirectional synchronization between Google Calendar and Supabase
 * Features: Duplicate prevention, conflict resolution, incremental syncs
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import {
  listGoogleCalendarEvents,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  parseGoogleEventDescription
} from './service'
import type { GoogleCalendarEvent, CalendarEventData, SyncResult, SyncOptions } from './types'

/**
 * Sync events from Google Calendar to Supabase
 * Import direction: Google → Database
 *
 * @param options - Sync options (time range, syncToken, etc.)
 * @param supabaseClient - Optional Supabase client (for background jobs)
 */
export async function syncGoogleCalendarToDatabase(
  options: SyncOptions = {},
  supabaseClient?: any
): Promise<SyncResult> {
  const supabase = supabaseClient || await createClient()
  const result: SyncResult = {
    success: true,
    imported: 0,
    exported: 0,
    updated: 0,
    errors: []
  }

  try {
    // Default time range: -12 months to +12 months
    const timeMin = options.timeMin || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
    const timeMax = options.timeMax || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

    // Fetch events from Google Calendar
    const { events, nextSyncToken } = await listGoogleCalendarEvents(
      timeMin,
      timeMax,
      options.syncToken
    )

    console.log(`[Sync] Fetched ${events.length} events from Google Calendar`)

    // Process each Google event
    for (const googleEvent of events) {
      try {
        await processGoogleEvent(googleEvent, supabase, result)
      } catch (error) {
        console.error(`[Sync] Error processing event ${googleEvent.id}:`, error)
        result.errors.push(`Event ${googleEvent.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Store sync token for next incremental sync
    result.syncToken = nextSyncToken

    // Log sync to database
    await logSync(supabase, result, options.fullSync ? 'full' : 'incremental')

  } catch (error) {
    console.error('[Sync] Fatal error:', error)
    result.success = false
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
  }

  return result
}

/**
 * Handle deleted/cancelled events from Google Calendar
 * Soft delete: Mark event as 'cancelled' in database instead of hard delete
 */
async function handleDeletedEvent(
  googleEvent: GoogleCalendarEvent,
  supabase: any,
  result: SyncResult
): Promise<void> {
  try {
    // Check if event exists in database
    const { data: existingEvent } = await supabase
      .from('calendar_events')
      .select('id, status')
      .eq('google_event_id', googleEvent.id)
      .single()

    if (!existingEvent) {
      // Event doesn't exist in database, nothing to do
      return
    }

    // Only update if status is not already cancelled
    if (existingEvent.status !== 'cancelled') {
      const { error } = await supabase
        .from('calendar_events')
        .update({
          status: 'cancelled',
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('google_event_id', googleEvent.id)

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      result.updated++
      console.log(`[Sync] Soft deleted event ${googleEvent.id}`)
    }
  } catch (error) {
    console.error(`[Sync] Error handling deleted event ${googleEvent.id}:`, error)
    throw error
  }
}

/**
 * Process a single Google Calendar event
 * Creates or updates in Supabase using UPSERT to prevent duplicates
 */
async function processGoogleEvent(
  googleEvent: GoogleCalendarEvent,
  supabase: any,
  result: SyncResult
): Promise<void> {
  // Handle deleted/cancelled events (soft delete)
  if (googleEvent.status === 'cancelled') {
    await handleDeletedEvent(googleEvent, supabase, result)
    return
  }

  // Skip events without start time or summary
  if (!googleEvent.start || !googleEvent.summary) {
    console.log(`[Sync] Skipping event ${googleEvent.id}: Missing start time or summary`, {
      hasStart: !!googleEvent.start,
      hasSummary: !!googleEvent.summary,
      summary: googleEvent.summary
    })
    return
  }

  // Extract start/end times
  const startTime = googleEvent.start.dateTime || googleEvent.start.date
  const endTime = googleEvent.end.dateTime || googleEvent.end.date

  if (!startTime || !endTime) {
    console.log(`[Sync] Skipping event ${googleEvent.id}: Missing start/end time`, {
      summary: googleEvent.summary,
      hasStartTime: !!startTime,
      hasEndTime: !!endTime
    })
    return
  }

  // Detect if this is an FI event
  const isFIEvent = googleEvent.summary.startsWith('FI:')
  let eventType: 'fi_assignment' | 'booking' = 'booking'
  let firstName = ''
  let lastName = ''
  let assignedInstructorName = ''
  let assignedInstructorNumber = null

  if (isFIEvent) {
    eventType = 'fi_assignment'
    // Parse "FI: Max Mustermann (123)" or "FI: Max Mustermann"
    const fiMatch = googleEvent.summary.match(/^FI:\s*(.+?)(?:\s*\((\d+)\))?$/)
    if (fiMatch) {
      assignedInstructorName = fiMatch[1].trim()
      assignedInstructorNumber = fiMatch[2] || null
    } else {
      // Fallback: just remove "FI: " prefix
      assignedInstructorName = googleEvent.summary.replace(/^FI:\s*/, '').trim()
    }
    // FI events don't have customer names
    firstName = ''
    lastName = ''

    console.log(`[Sync] Detected FI Event:`, {
      summary: googleEvent.summary,
      assignedInstructorName,
      assignedInstructorNumber
    })
  } else {
    // Regular booking event - parse customer name
    const nameParts = googleEvent.summary.split(' ')
    firstName = nameParts[0] || 'Unknown'
    lastName = nameParts.slice(1).join(' ') || 'Customer'
  }

  // Parse additional data from description
  const parsedData = parseGoogleEventDescription(googleEvent.description || '')

  // Calculate duration in minutes
  const duration = Math.round(
    (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60)
  )

  // Try to get current user, but don't fail if none (for background sync)
  // For background syncs, we'll use a system user ID or the first admin
  const { data: { user } } = await supabase.auth.getUser()

  let userId = user?.id
  if (!userId) {
    // Background sync: Get first admin user as fallback
    const { data: adminUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single()

    userId = adminUser?.id
    if (!userId) {
      console.error('[Sync] No user available for sync - skipping event')
      return
    }
  }

  // Prepare event data matching existing schema
  const eventData = {
    id: googleEvent.id, // Use Google event ID as primary key (schema uses TEXT)
    user_id: userId, // Required by schema
    google_event_id: googleEvent.id,
    event_type: eventType, // 'fi_assignment' or 'booking'
    title: googleEvent.summary,
    description: googleEvent.description || '',
    customer_first_name: firstName,
    customer_last_name: lastName,
    customer_phone: parsedData.customer_phone,
    customer_email: parsedData.customer_email,
    assigned_instructor_id: null, // We don't have the DB ID from Google
    assigned_instructor_name: assignedInstructorName || null,
    assigned_instructor_number: assignedInstructorNumber,
    is_all_day: !googleEvent.start.dateTime, // dateTime missing means all-day
    start_time: startTime,
    end_time: endTime,
    duration,
    attendee_count: parsedData.attendee_count || 1,
    remarks: parsedData.remarks,
    location: googleEvent.location || 'FLIGHTHOUR Flugsimulator',
    status: googleEvent.status,
    attendees: [], // Required jsonb field
    etag: googleEvent.etag,
    last_synced_at: new Date().toISOString(),
    sync_status: 'synced',
    last_modified_at: googleEvent.updated,
    updated_at: new Date().toISOString()
  }

  // Check if event exists BEFORE upsert (for correct import/update counting)
  const { data: existingEvent } = await supabase
    .from('calendar_events')
    .select('id')
    .eq('google_event_id', googleEvent.id)
    .maybeSingle()

  // UPSERT: Insert or update on conflict (prevents duplicates)
  const { data, error } = await supabase
    .from('calendar_events')
    .upsert(eventData, {
      onConflict: 'google_event_id',
      ignoreDuplicates: false
    })
    .select()

  if (error) {
    console.error(`[Sync] Database error for event ${googleEvent.id}:`, {
      summary: googleEvent.summary,
      error: error.message,
      eventType,
      eventData
    })
    throw new Error(`Database error: ${error.message}`)
  }

  // Track whether this was an insert or update
  if (data && data.length > 0) {
    if (!existingEvent) {
      result.imported++
      console.log(`[Sync] ✅ IMPORTED new event: ${googleEvent.summary}`)
    } else {
      result.updated++
    }
  }
}

/**
 * Export local events to Google Calendar
 * Upload direction: Database → Google
 *
 * @param supabaseClient - Optional Supabase client (for background jobs)
 */
export async function exportLocalEventsToGoogle(
  supabaseClient?: any
): Promise<SyncResult> {
  const supabase = supabaseClient || await createClient()
  const result: SyncResult = {
    success: true,
    imported: 0,
    exported: 0,
    updated: 0,
    errors: []
  }

  try {
    // Find events without google_event_id (not yet synced to Google)
    const { data: unsyncedEvents, error } = await supabase
      .from('calendar_events')
      .select('*')
      .is('google_event_id', null)
      .eq('sync_status', 'pending')
      .limit(50) // Process in batches

    if (error) throw new Error(`Database error: ${error.message}`)

    console.log(`[Export] Found ${unsyncedEvents?.length || 0} unsynced events`)

    for (const event of unsyncedEvents || []) {
      try {
        // Create event in Google Calendar with all fields (including FI-event fields)
        const googleEvent = await createGoogleCalendarEvent({
          event_type: event.event_type,
          customer_first_name: event.customer_first_name,
          customer_last_name: event.customer_last_name,
          customer_phone: event.customer_phone,
          customer_email: event.customer_email,
          assigned_instructor_id: event.assigned_instructor_id,
          assigned_instructor_name: event.assigned_instructor_name,
          assigned_instructor_number: event.assigned_instructor_number,
          is_all_day: event.is_all_day,
          start_time: event.start_time,
          end_time: event.end_time,
          duration: event.duration,
          attendee_count: event.attendee_count,
          remarks: event.remarks,
          location: event.location,
          status: event.status
        })

        // Update local event with google_event_id
        await supabase
          .from('calendar_events')
          .update({
            google_event_id: googleEvent.id,
            etag: googleEvent.etag,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString()
          })
          .eq('id', event.id)

        result.exported++

      } catch (error) {
        console.error(`[Export] Error exporting event ${event.id}:`, error)
        result.errors.push(`Event ${event.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)

        // Mark as error
        await supabase
          .from('calendar_events')
          .update({
            sync_status: 'error',
            sync_error: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', event.id)
      }
    }

  } catch (error) {
    console.error('[Export] Fatal error:', error)
    result.success = false
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
  }

  return result
}

/**
 * Full bidirectional sync
 * Import from Google + Export local changes
 *
 * @param supabaseClient - Optional Supabase client (for background jobs)
 * @param options - Sync options
 */
export async function fullSync(
  supabaseClient?: any,
  options: SyncOptions = {}
): Promise<SyncResult> {
  console.log('[Sync] Starting full bidirectional sync...')

  // Step 1: Import from Google Calendar
  const importResult = await syncGoogleCalendarToDatabase(
    { ...options, fullSync: true },
    supabaseClient
  )

  // Step 2: Export local events to Google
  const exportResult = await exportLocalEventsToGoogle(supabaseClient)

  // Combine results
  const combinedResult: SyncResult = {
    success: importResult.success && exportResult.success,
    imported: importResult.imported,
    exported: exportResult.exported,
    updated: importResult.updated + exportResult.updated,
    errors: [...importResult.errors, ...exportResult.errors],
    syncToken: importResult.syncToken
  }

  console.log('[Sync] Full sync completed:', combinedResult)

  // Debug: Show event distribution by month
  await logEventDistribution(supabaseClient || await createClient())

  return combinedResult
}

/**
 * Log sync operation to database
 */
async function logSync(
  supabase: any,
  result: SyncResult,
  syncType: 'full' | 'incremental' | 'manual'
): Promise<void> {
  try {
    await supabase
      .from('calendar_sync_logs')
      .insert({
        sync_type: syncType,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        status: result.success ? 'success' : 'error',
        events_imported: result.imported,
        events_exported: result.exported,
        events_updated: result.updated,
        error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
        sync_token: result.syncToken
      })
  } catch (error) {
    console.error('[Sync] Failed to log sync:', error)
  }
}

/**
 * Debug: Log event distribution by month
 */
async function logEventDistribution(supabase: any): Promise<void> {
  try {
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('start_time, status, event_type')
      .order('start_time', { ascending: true })

    if (error) {
      console.error('[Debug] Failed to fetch events:', error)
      return
    }

    // Group by month
    const byMonth: Record<string, { total: number, fi: number, booking: number, cancelled: number }> = {}

    events?.forEach((event: any) => {
      const date = new Date(event.start_time)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { total: 0, fi: 0, booking: 0, cancelled: 0 }
      }

      byMonth[monthKey].total++
      if (event.status === 'cancelled') byMonth[monthKey].cancelled++
      if (event.event_type === 'fi_assignment') byMonth[monthKey].fi++
      if (event.event_type === 'booking') byMonth[monthKey].booking++
    })

    console.log('[Debug] ============================================')
    console.log('[Debug] Event Distribution by Month in Database:')
    console.log('[Debug] ============================================')
    Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([month, stats]) => {
        console.log(`[Debug] ${month}: ${stats.total} total (${stats.booking} bookings, ${stats.fi} FI, ${stats.cancelled} cancelled)`)
      })
    console.log('[Debug] ============================================')
    console.log(`[Debug] Total events in database: ${events?.length || 0}`)
    console.log('[Debug] ============================================')

  } catch (error) {
    console.error('[Debug] Error logging event distribution:', error)
  }
}
