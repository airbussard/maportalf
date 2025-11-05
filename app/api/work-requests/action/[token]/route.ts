import { NextRequest, NextResponse } from 'next/server'
import { validateActionToken } from '@/lib/utils/generate-action-token'
import { createClient } from '@/lib/supabase/server'

/**
 * Handle work request approve/reject via email link
 * GET /api/work-requests/action/[token]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await params
    const token = resolvedParams.token

    // Validate token
    const tokenData = await validateActionToken(token)

    if (!tokenData) {
      // Token invalid, expired, or already used
      return NextResponse.redirect(
        new URL('/requests/manage?error=invalid_token', request.url)
      )
    }

    const supabase = await createClient()

    // Fetch work request to verify it exists and is pending
    const { data: workRequest, error: fetchError } = await supabase
      .from('work_requests')
      .select('*, profiles:user_id(*)')
      .eq('id', tokenData.workRequestId)
      .single()

    if (fetchError || !workRequest) {
      console.error('Work request not found:', fetchError)
      return NextResponse.redirect(
        new URL('/requests/manage?error=not_found', request.url)
      )
    }

    // Check if already processed
    if (workRequest.status !== 'pending') {
      return NextResponse.redirect(
        new URL(`/requests/manage?error=already_processed&status=${workRequest.status}`, request.url)
      )
    }

    // Get current user (the manager/admin clicking the link)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      // Not authenticated - redirect to login with return URL
      const returnUrl = `/api/work-requests/action/${token}`
      return NextResponse.redirect(
        new URL(`/login?redirect=${encodeURIComponent(returnUrl)}`, request.url)
      )
    }

    // Update work request status
    const newStatus = tokenData.action === 'approve' ? 'approved' : 'rejected'

    const { error: updateError } = await supabase
      .from('work_requests')
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', tokenData.workRequestId)

    if (updateError) {
      console.error('Error updating work request:', updateError)
      return NextResponse.redirect(
        new URL('/requests/manage?error=update_failed', request.url)
      )
    }

    // Create notification for the employee
    const employeeName = `${workRequest.profiles?.first_name || ''} ${workRequest.profiles?.last_name || ''}`.trim() || workRequest.profiles?.email || 'Mitarbeiter'

    const notificationTitle = tokenData.action === 'approve'
      ? 'Arbeitsantrag genehmigt'
      : 'Arbeitsantrag abgelehnt'

    const notificationMessage = tokenData.action === 'approve'
      ? `Ihr Arbeitsantrag vom ${new Date(workRequest.start_date).toLocaleDateString('de-DE')} wurde genehmigt.`
      : `Ihr Arbeitsantrag vom ${new Date(workRequest.start_date).toLocaleDateString('de-DE')} wurde abgelehnt.`

    await supabase.from('notifications').insert({
      user_id: workRequest.user_id,
      type: 'work_request',
      title: notificationTitle,
      message: notificationMessage,
      link: '/requests',
      work_request_id: workRequest.id
    })

    // Redirect to success page
    const successMessage = tokenData.action === 'approve'
      ? `Der Arbeitsantrag von ${employeeName} wurde genehmigt.`
      : `Der Arbeitsantrag von ${employeeName} wurde abgelehnt.`

    return NextResponse.redirect(
      new URL(`/requests/manage?success=${encodeURIComponent(successMessage)}`, request.url)
    )

  } catch (error) {
    console.error('Error processing work request action:', error)
    return NextResponse.redirect(
      new URL('/requests/manage?error=server_error', request.url)
    )
  }
}
