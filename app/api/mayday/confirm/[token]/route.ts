/**
 * MAYDAY Confirmation API
 *
 * Handles confirmation of MAYDAY notifications (shift/cancel)
 * When customer clicks "Verstanden" button in email
 *
 * For SHIFT confirmations: Also applies the pending shift to the calendar event
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { applyPendingShift } from '@/app/actions/mayday-actions'

const BASE_URL = 'https://flighthour.getemergence.com'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = createAdminClient()

    // 1. Find token in database
    const { data: tokenData, error: tokenError } = await supabase
      .from('mayday_confirmation_tokens')
      .select('*')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      console.error('[MAYDAY Confirm] Token not found:', token)
      return NextResponse.redirect(`${BASE_URL}/mayday/confirmed?status=invalid`)
    }

    // 2. Check if already confirmed
    if (tokenData.confirmed) {
      console.log('[MAYDAY Confirm] Token already confirmed:', token)
      return NextResponse.redirect(`${BASE_URL}/mayday/confirmed?status=already`)
    }

    // 3. Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log('[MAYDAY Confirm] Token expired:', token)
      return NextResponse.redirect(`${BASE_URL}/mayday/confirmed?status=expired`)
    }

    // 4. Mark as confirmed
    const { error: updateError } = await supabase
      .from('mayday_confirmation_tokens')
      .update({
        confirmed: true,
        confirmed_at: new Date().toISOString()
      })
      .eq('id', tokenData.id)

    if (updateError) {
      console.error('[MAYDAY Confirm] Update error:', updateError)
      return NextResponse.redirect(`${BASE_URL}/mayday/confirmed?status=error`)
    }

    console.log('[MAYDAY Confirm] Successfully confirmed:', token)

    // 5. For SHIFT confirmations: Apply the pending shift to the event
    if (tokenData.action_type === 'shift' && tokenData.event_id) {
      console.log('[MAYDAY Confirm] Applying pending shift for event:', tokenData.event_id)

      const shiftResult = await applyPendingShift(tokenData.event_id)

      if (shiftResult.success) {
        // Mark shift as applied in the token
        await supabase
          .from('mayday_confirmation_tokens')
          .update({
            shift_applied: true,
            shift_applied_at: new Date().toISOString()
          })
          .eq('id', tokenData.id)

        console.log('[MAYDAY Confirm] Pending shift applied successfully')
      } else {
        console.error('[MAYDAY Confirm] Failed to apply pending shift:', shiftResult.error)
        // Still show success to customer - the shift will be visible in admin panel
        // Manager can manually handle if Google Calendar update failed
      }
    }

    // 6. Redirect to success page with action type
    return NextResponse.redirect(`${BASE_URL}/mayday/confirmed?status=success&type=${tokenData.action_type}`)

  } catch (error) {
    console.error('[MAYDAY Confirm] Unexpected error:', error)
    return NextResponse.redirect(`${BASE_URL}/mayday/confirmed?status=error`)
  }
}
