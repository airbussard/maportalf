/**
 * SMS Queue Processor Cron Job
 *
 * Processes pending SMS from sms_queue table
 * Should be called every 1-2 minutes via CapRover cron
 *
 * Endpoint: POST /api/cron/process-sms-queue
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSMS, isTwilioConfigured } from '@/lib/sms/twilio-client'

const MAX_ATTEMPTS = 3
const BATCH_SIZE = 10

export async function GET() {
  // Check if Twilio is configured
  if (!isTwilioConfigured()) {
    console.log('[SMS Cron] Twilio not configured, skipping')
    return NextResponse.json({
      success: true,
      message: 'Twilio not configured',
      processed: 0,
      sent: 0,
      failed: 0
    })
  }

  const supabase = createAdminClient()

  try {
    // Fetch pending SMS with attempts < MAX_ATTEMPTS
    const { data: pendingSMS, error: fetchError } = await supabase
      .from('sms_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE)

    if (fetchError) {
      console.error('[SMS Cron] Failed to fetch pending SMS:', fetchError)
      return NextResponse.json({
        success: false,
        error: fetchError.message
      }, { status: 500 })
    }

    if (!pendingSMS || pendingSMS.length === 0) {
      console.log('[SMS Cron] No pending SMS to process')
      return NextResponse.json({
        success: true,
        message: 'No pending SMS',
        processed: 0,
        sent: 0,
        failed: 0
      })
    }

    console.log(`[SMS Cron] Processing ${pendingSMS.length} pending SMS`)

    let sent = 0
    let failed = 0

    for (const sms of pendingSMS) {
      try {
        // Attempt to send
        const result = await sendSMS({
          to: sms.phone_number,
          message: sms.message
        })

        if (result.success && result.messageId) {
          // Mark as sent
          await supabase
            .from('sms_queue')
            .update({
              status: 'sent',
              twilio_message_id: result.messageId,
              sent_at: new Date().toISOString(),
              attempts: sms.attempts + 1
            })
            .eq('id', sms.id)

          console.log(`[SMS Cron] Sent SMS ${sms.id} to ${sms.phone_number}`)
          sent++
        } else {
          // Increment attempts and log error
          const newAttempts = sms.attempts + 1
          const newStatus = newAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending'

          await supabase
            .from('sms_queue')
            .update({
              status: newStatus,
              error_message: result.error || 'Unknown error',
              attempts: newAttempts
            })
            .eq('id', sms.id)

          console.error(`[SMS Cron] Failed SMS ${sms.id}: ${result.error}`)
          if (newStatus === 'failed') {
            failed++
          }
        }
      } catch (error) {
        // Unexpected error - increment attempts
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const newAttempts = sms.attempts + 1
        const newStatus = newAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending'

        await supabase
          .from('sms_queue')
          .update({
            status: newStatus,
            error_message: errorMessage,
            attempts: newAttempts
          })
          .eq('id', sms.id)

        console.error(`[SMS Cron] Error processing SMS ${sms.id}:`, error)
        if (newStatus === 'failed') {
          failed++
        }
      }
    }

    console.log(`[SMS Cron] Completed: ${sent} sent, ${failed} failed`)

    return NextResponse.json({
      success: true,
      processed: pendingSMS.length,
      sent,
      failed
    })

  } catch (error) {
    console.error('[SMS Cron] Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Also allow POST for compatibility with different cron job setups
export async function POST() {
  return GET()
}
