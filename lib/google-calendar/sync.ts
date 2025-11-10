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

    const totalEvents = events.length
    console.log(`[Sync] Starting to process ${totalEvents} events...`)

    // 1. Cache user ID (avoid repeated lookups)
    let cachedUserId: string | null = null
    const { data: { user } } = await supabase.auth.getUser()
    cachedUserId = user?.id || null

    if (!cachedUserId) {
      // Fallback: Get first admin user
      const { data: adminUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single()

      cachedUserId = adminUser?.id
      if (!cachedUserId) {
        throw new Error('[Sync] No user available for sync')
      }
    }

    console.log(`[Sync] Using user ID: ${cachedUserId}`)

    // 2. Bulk check which events already exist - BATCH QUERIES to avoid URI length limit
    const googleEventIds = events.map(e => e.id)
    console.log(`[Sync] Querying database for ${googleEventIds.length} google_event_ids in batches...`)
    console.log(`[Sync] Sample Google IDs to search:`, googleEventIds.slice(0, 3))

    // Split into batches to avoid "URI too long" error with .in() operator
    // PostgreSQL/Supabase has URL length limits (~8KB), 500 IDs is safe
    const QUERY_BATCH_SIZE = 500
    const existingEventsArray: any[] = []

    for (let i = 0; i < googleEventIds.length; i += QUERY_BATCH_SIZE) {
      const batch = googleEventIds.slice(i, i + QUERY_BATCH_SIZE)
      const batchNum = Math.floor(i / QUERY_BATCH_SIZE) + 1
      const totalBatches = Math.ceil(googleEventIds.length / QUERY_BATCH_SIZE)

      console.log(`[Sync] Query batch ${batchNum}/${totalBatches}: ${batch.length} IDs`)

      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, google_event_id')
        .in('google_event_id', batch)

      if (error) {
        console.error(`[Sync] Error in batch ${batchNum}:`, error)
        console.error(`[Sync] Batch ${batchNum} error details:`, JSON.stringify(error, null, 2))
        // Continue with other batches even if one fails
      } else if (data) {
        existingEventsArray.push(...data)
        console.log(`[Sync] Batch ${batchNum} returned ${data.length} events`)
      }
    }

    const existingEvents = existingEventsArray
    console.log(`[Sync] Query returned ${existingEvents.length} total existing events from ${Math.ceil(googleEventIds.length / QUERY_BATCH_SIZE)} batches`)

    if (existingEvents.length > 0) {
      console.log(`[Sync] Sample existing events:`, existingEvents.slice(0, 3).map((e: any) => ({
        id: e.id,
        google_event_id: e.google_event_id
      })))
    }

    // Create map: google_event_id -> database id
    const existingEventMap = new Map<string, string>(
      existingEvents.map((e: any) => [e.google_event_id, e.id])
    )
    console.log(`[Sync] Created map with ${existingEventMap.size} existing events`)

    // 3. Handle cancelled events first (separate logic)
    const cancelledEvents = events.filter(e => e.status === 'cancelled')
    for (const googleEvent of cancelledEvents) {
      try {
        await handleDeletedEvent(googleEvent, supabase, result)
      } catch (error) {
        console.error(`[Sync] Error handling cancelled event ${googleEvent.id}:`, error)
        result.errors.push(`Cancelled event ${googleEvent.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // 4. Batch-process active events - Split into inserts and updates
    const activeEvents = events.filter(e => e.status !== 'cancelled')
    const BATCH_SIZE = 50
    let processed = 0

    for (let i = 0; i < activeEvents.length; i += BATCH_SIZE) {
      const batch = activeEvents.slice(i, i + BATCH_SIZE)

      // Separate into new events (inserts) and existing events (updates)
      const newEvents = batch.filter(e => !existingEventMap.has(e.id))
      const existingEventsToUpdate = batch.filter(e => existingEventMap.has(e.id))

      console.log(`[Sync] Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${newEvents.length} new, ${existingEventsToUpdate.length} updates`)

      // Process NEW events (with id field)
      if (newEvents.length > 0) {
        const insertData = newEvents
          .map(googleEvent => prepareEventData(googleEvent, cachedUserId!, existingEventMap, false))
          .filter(data => data !== null)

        try {
          const { error: insertError } = await supabase
            .from('calendar_events')
            .insert(insertData)

          if (insertError) {
            console.error(`[Sync] Batch INSERT error:`, insertError)
            result.errors.push(`Batch ${i}-${i + BATCH_SIZE} (INSERT): ${insertError.message}`)
          } else {
            result.imported += insertData.length
          }
        } catch (error) {
          console.error(`[Sync] Batch INSERT exception:`, error)
          result.errors.push(`Batch ${i} (INSERT): ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Process EXISTING events (without id field)
      if (existingEventsToUpdate.length > 0) {
        const updateData = existingEventsToUpdate
          .map(googleEvent => prepareEventData(googleEvent, cachedUserId!, existingEventMap, true))
          .filter(data => data !== null)

        try {
          // Update each event individually to avoid id conflicts
          for (const eventData of updateData) {
            const { error: updateError } = await supabase
              .from('calendar_events')
              .update(eventData)
              .eq('google_event_id', eventData.google_event_id)

            if (updateError) {
              console.error(`[Sync] UPDATE error for ${eventData.google_event_id}:`, updateError)
              result.errors.push(`Update ${eventData.google_event_id}: ${updateError.message}`)
            } else {
              result.updated++
            }
          }
        } catch (error) {
          console.error(`[Sync] Batch UPDATE exception:`, error)
          result.errors.push(`Batch ${i} (UPDATE): ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      processed += batch.length

      // Progress logging every batch
      if (processed % 100 === 0 || processed === activeEvents.length) {
        console.log(`[Sync] Progress: ${processed}/${activeEvents.length} active events processed (${Math.round(processed/activeEvents.length*100)}%)`)
      }
    }

    console.log(`[Sync] ✅ Processing complete: ${result.imported} imported, ${result.updated} updated, ${cancelledEvents.length} cancelled`)

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
 * Prepare event data from Google Calendar event
 * Returns null for invalid events, otherwise returns EventData object for INSERT or UPDATE
 *
 * @param googleEvent - The Google Calendar event
 * @param userId - The user ID to assign the event to
 * @param existingEventMap - Map of google_event_id to database id
 * @param isUpdate - If true, excludes 'id' field (for UPDATE queries)
 */
function prepareEventData(
  googleEvent: GoogleCalendarEvent,
  userId: string,
  existingEventMap: Map<string, string>,
  isUpdate: boolean = false
): any | null {
  // Skip cancelled events (handled separately by handleDeletedEvent)
  if (googleEvent.status === 'cancelled') {
    return null
  }

  // Skip events without start time or summary
  if (!googleEvent.start || !googleEvent.summary) {
    return null
  }

  // Extract start/end times
  const startTime = googleEvent.start.dateTime || googleEvent.start.date
  const endTime = googleEvent.end?.dateTime || googleEvent.end?.date

  if (!startTime || !endTime) {
    return null
  }

  // Parse additional data from description (including EVENT_TYPE marker)
  const parsedData = parseGoogleEventDescription(googleEvent.description || '')

  // Detect event type - Priority: 1) Description marker, 2) Title prefix, 3) Default to booking
  let eventType: 'fi_assignment' | 'booking' | 'blocker' = 'booking'
  let firstName = ''
  let lastName = ''
  let assignedInstructorName = ''
  let assignedInstructorNumber = null

  // Priority 1: Check for EVENT_TYPE marker in description
  if (parsedData.event_type) {
    eventType = parsedData.event_type
  }
  // Priority 2: Fallback to title-based detection (for backwards compatibility)
  else if (googleEvent.summary.startsWith('FI:')) {
    eventType = 'fi_assignment'
  }

  // Parse event-specific fields based on type
  if (eventType === 'blocker') {
    // Blocker: customer_first_name = title, customer_last_name = empty
    firstName = googleEvent.summary || 'Blocker'
    lastName = ''
    assignedInstructorName = ''
    assignedInstructorNumber = null
  } else if (eventType === 'fi_assignment') {
    // FI event: Parse "FI: Max Mustermann (123)" or "FI: Max Mustermann"
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
  } else {
    // Regular booking event - parse customer name
    const nameParts = googleEvent.summary.split(' ')
    firstName = nameParts[0] || 'Unknown'
    lastName = nameParts.slice(1).join(' ') || 'Customer'
  }

  // Calculate duration in minutes
  const duration = Math.round(
    (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60)
  )

  // Prepare base event data (without id)
  const baseEventData = {
    user_id: userId, // Required by schema
    google_event_id: googleEvent.id,
    event_type: eventType, // 'fi_assignment', 'booking', or 'blocker'
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

  // For INSERT operations, add the id field
  if (!isUpdate) {
    const existingId = existingEventMap.get(googleEvent.id)
    const eventId = existingId || crypto.randomUUID()

    return {
      id: eventId, // Use existing ID or generate new UUID
      ...baseEventData
    }
  }

  // For UPDATE operations, do NOT include id (prevents FK violations)
  return baseEventData
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
