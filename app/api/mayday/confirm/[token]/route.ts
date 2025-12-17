/**
 * MAYDAY Confirmation API
 *
 * Handles confirmation of MAYDAY notifications (shift/cancel)
 * When customer clicks "Verstanden" button in email
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    // 5. Redirect to success page with action type
    return NextResponse.redirect(`${BASE_URL}/mayday/confirmed?status=success&type=${tokenData.action_type}`)

  } catch (error) {
    console.error('[MAYDAY Confirm] Unexpected error:', error)
    return NextResponse.redirect(`${BASE_URL}/mayday/confirmed?status=error`)
  }
}
