import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * API Route to complete 2FA authentication
 * Creates a session using the verification token
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing_token', request.url))
  }

  try {
    const adminSupabase = createAdminClient()

    // Verify token
    const { data: tokenData, error: tokenError } = await adminSupabase
      .from('verification_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single()

    if (tokenError || !tokenData) {
      console.error('[Complete 2FA] Token not found:', tokenError)
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url))
    }

    // Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.redirect(new URL('/login?error=token_expired', request.url))
    }

    // Mark token as used
    await adminSupabase
      .from('verification_tokens')
      .update({
        used: true,
        used_at: new Date().toISOString()
      })
      .eq('token', token)

    // Get user
    const { data: { user }, error: userError } = await adminSupabase.auth.admin.getUserById(
      tokenData.user_id
    )

    if (userError || !user || !user.email) {
      console.error('[Complete 2FA] User not found:', userError)
      return NextResponse.redirect(new URL('/login?error=user_not_found', request.url))
    }

    // Create session using admin.createUser with a temporary password
    // Actually, Supabase doesn't support creating sessions via admin API directly
    // We need to use a different approach:
    // Generate a one-time link that will create a session

    const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email
    })

    if (linkError || !linkData) {
      console.error('[Complete 2FA] Error generating link:', linkError)
      return NextResponse.redirect(new URL('/login?error=session_creation_failed', request.url))
    }

    // Extract the hash from the link and redirect to it
    // The hash contains the session tokens
    const url = new URL(linkData.properties.action_link)
    const hash = url.hash

    // Redirect to dashboard with the session hash
    return NextResponse.redirect(new URL(`/dashboard${hash}`, request.url))

  } catch (error) {
    console.error('[Complete 2FA] Exception:', error)
    return NextResponse.redirect(new URL('/login?error=unexpected_error', request.url))
  }
}
