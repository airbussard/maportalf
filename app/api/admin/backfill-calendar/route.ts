/**
 * Calendar Events Backfill API
 *
 * Parses existing event descriptions to extract customer name and phone number
 * using the new parsing rules. Updates all fields where parsed data is available.
 *
 * Only processes events WITHOUT event_type (external bookings).
 * Skips: fi_assignment, blocker, booking (all tagged internal events)
 *
 * Fixed range: -30 days to +90 days from today
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseGoogleEventDescription } from '@/lib/google-calendar/service'

export async function GET() {
  // Fixed time range: 30 days back, 90 days forward
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)

  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 90)

  console.log(`[Backfill] Starting backfill from ${startDate.toISOString()} to ${endDate.toISOString()}`)

  const supabase = createAdminClient()

  // Get events WITHOUT event_type (external bookings only)
  // Skip all tagged events (fi_assignment, blocker, booking)
  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('id, title, description, customer_first_name, customer_last_name, customer_phone')
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())
    .is('event_type', null)
    .order('start_time', { ascending: false })

  if (error || !events) {
    console.error('[Backfill] Error loading events:', error)
    return NextResponse.json({ error: error?.message || 'Fehler beim Laden' }, { status: 500 })
  }

  console.log(`[Backfill] Found ${events.length} events to process`)

  let updated = 0
  let skipped = 0
  const details: string[] = []

  for (const event of events) {
    if (!event.description) {
      skipped++
      continue
    }

    const parsed = parseGoogleEventDescription(event.description)
    const updates: Record<string, string> = {}

    // Update all fields if parsed data is available
    if (parsed.customer_first_name) {
      updates.customer_first_name = parsed.customer_first_name
    }
    if (parsed.customer_last_name) {
      updates.customer_last_name = parsed.customer_last_name
    }
    if (parsed.customer_phone) {
      updates.customer_phone = parsed.customer_phone
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', event.id)

      if (updateError) {
        console.error(`[Backfill] Error updating event ${event.id}:`, updateError)
        continue
      }

      updated++
      const changeDetails = Object.entries(updates).map(([k, v]) => `${k}=${v}`).join(', ')
      details.push(`${event.title || 'Unbenannt'}: ${changeDetails}`)
      console.log(`[Backfill] Updated: ${event.title} - ${changeDetails}`)
    } else {
      skipped++
    }
  }

  console.log(`[Backfill] Complete: ${updated} updated, ${skipped} skipped`)

  return NextResponse.json({
    message: `${updated} Events aktualisiert, ${skipped} übersprungen`,
    processed: updated,
    total: events.length,
    skipped,
    details
  })
}
