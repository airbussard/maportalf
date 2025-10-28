/**
 * Vercel Cron Job: Google Calendar Sync
 *
 * Runs every 5 minutes to sync Google Calendar with Supabase
 * Authentication: CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server'
import { fullSync } from '@/lib/google-calendar/sync'
import { supabaseAdmin } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max (Vercel Pro plan)

/**
 * POST /api/cron/sync-calendar
 *
 * Triggered by Vercel Cron every 5 minutes
 * Performs full bidirectional sync: Google ↔ Supabase
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[Cron] Starting scheduled calendar sync...')

    // 2. Perform full sync with admin client
    const result = await fullSync(supabaseAdmin)

    const duration = Date.now() - startTime

    // 3. Log results
    console.log('[Cron] Sync completed:', {
      success: result.success,
      imported: result.imported,
      exported: result.exported,
      updated: result.updated,
      errors: result.errors.length,
      duration: `${duration}ms`
    })

    // 4. Return detailed response
    return NextResponse.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      duration,
      stats: {
        imported: result.imported,
        exported: result.exported,
        updated: result.updated,
        errors: result.errors.length
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
      syncToken: result.syncToken
    })

  } catch (error) {
    const duration = Date.now() - startTime

    console.error('[Cron] Sync failed:', error)

    // Log error to Supabase for monitoring
    try {
      await supabaseAdmin
        .from('calendar_sync_logs')
        .insert({
          sync_type: 'cron',
          started_at: new Date(startTime).toISOString(),
          completed_at: new Date().toISOString(),
          status: 'error',
          events_imported: 0,
          events_exported: 0,
          events_updated: 0,
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
    } catch (logError) {
      console.error('[Cron] Failed to log error:', logError)
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/sync-calendar
 *
 * Info endpoint - shows how to use the cron job
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Google Calendar Cron Job',
    method: 'POST',
    auth: 'Query parameter: ?key=CRON_SECRET',
    example: 'POST /api/cron/sync-calendar?key=YOUR_SECRET',
    schedule: 'Every 5 minutes (*/5 * * * *)',
    endpoint: '/api/cron/sync-calendar'
  })
}
