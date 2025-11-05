/**
 * Notification Cleanup Cron Job
 * Deletes read notifications older than 30 days
 * Called by external cron service daily
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 60 // 1 minute
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoffDate = thirtyDaysAgo.toISOString()

    console.log('[Notification Cleanup] Deleting read notifications older than:', cutoffDate)

    // Delete read notifications older than 30 days
    const { error, count } = await supabase
      .from('notifications')
      .delete({ count: 'exact' })
      .eq('read', true)
      .lt('created_at', cutoffDate)

    if (error) {
      console.error('[Notification Cleanup] Error:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    console.log('[Notification Cleanup] Deleted', count, 'notifications')

    return NextResponse.json({
      success: true,
      deleted: count || 0,
      message: `Deleted ${count || 0} read notifications older than 30 days`
    })

  } catch (error) {
    console.error('[Notification Cleanup] Fatal error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
