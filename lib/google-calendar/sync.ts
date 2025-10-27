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
 */
export async function syncGoogleCalendarToDatabase(
  options: SyncOptions = {}
): Promise<SyncResult> {
  const supabase = await createClient()
  const result: SyncResult = {
    success: true,
    imported: 0,
    exported: 0,
    updated: 0,
    errors: []
  }

  try {
    // Default time range: -1 month to +12 months
    const timeMin = options.timeMin || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
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
 * Process a single Google Calendar event
 * Creates or updates in Supabase using UPSERT to prevent duplicates
 */
async function processGoogleEvent(
  googleEvent: GoogleCalendarEvent,
  supabase: any,
  result: SyncResult
): Promise<void> {
  // Skip events without start time or summary
  if (!googleEvent.start || !googleEvent.summary) {
    return
  }

  // Extract start/end times
  const startTime = googleEvent.start.dateTime || googleEvent.start.date
  const endTime = googleEvent.end.dateTime || googleEvent.end.date

  if (!startTime || !endTime) {
    return
  }

  // Parse customer name from summary
  const nameParts = googleEvent.summary.split(' ')
  const firstName = nameParts[0] || 'Unknown'
  const lastName = nameParts.slice(1).join(' ') || 'Customer'

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
    title: googleEvent.summary,
    description: googleEvent.description || '',
    customer_first_name: firstName,
    customer_last_name: lastName,
    customer_phone: parsedData.customer_phone,
    customer_email: parsedData.customer_email,
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

  // UPSERT: Insert or update on conflict (prevents duplicates)
  const { data, error } = await supabase
    .from('calendar_events')
    .upsert(eventData, {
      onConflict: 'google_event_id',
      ignoreDuplicates: false
    })
    .select()

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  // Track whether this was an insert or update
  if (data && data.length > 0) {
    const isNewRecord = !data[0].id // Simplified check
    if (isNewRecord) {
      result.imported++
    } else {
      result.updated++
    }
  }
}

/**
 * Export local events to Google Calendar
 * Upload direction: Database → Google
 */
export async function exportLocalEventsToGoogle(): Promise<SyncResult> {
  const supabase = await createClient()
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
        // Create event in Google Calendar
        const googleEvent = await createGoogleCalendarEvent({
          customer_first_name: event.customer_first_name,
          customer_last_name: event.customer_last_name,
          customer_phone: event.customer_phone,
          customer_email: event.customer_email,
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
 */
export async function fullSync(options: SyncOptions = {}): Promise<SyncResult> {
  console.log('[Sync] Starting full bidirectional sync...')

  // Step 1: Import from Google Calendar
  const importResult = await syncGoogleCalendarToDatabase({ ...options, fullSync: true })

  // Step 2: Export local events to Google
  const exportResult = await exportLocalEventsToGoogle()

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
