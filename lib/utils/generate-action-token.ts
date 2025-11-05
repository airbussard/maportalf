import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

interface ActionToken {
  token: string
  expiresAt: Date
}

/**
 * Generate a secure action token for work request approve/reject actions
 * @param workRequestId - The ID of the work request
 * @param action - 'approve' or 'reject'
 * @param validDays - Number of days the token is valid (default: 7)
 * @returns Object with token and expiry date
 */
export async function generateActionToken(
  workRequestId: string,
  action: 'approve' | 'reject',
  validDays: number = 7
): Promise<ActionToken> {
  const supabase = await createClient()

  // Generate unique token
  const token = uuidv4()

  // Calculate expiry date
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + validDays)

  // Store token in database
  const { error } = await supabase
    .from('work_request_action_tokens')
    .insert({
      token,
      work_request_id: workRequestId,
      action,
      expires_at: expiresAt.toISOString(),
      used: false
    })

  if (error) {
    console.error('Error generating action token:', error)
    throw new Error('Failed to generate action token')
  }

  return {
    token,
    expiresAt
  }
}

/**
 * Validate and consume an action token
 * @param token - The token to validate
 * @returns Object with work request ID and action, or null if invalid
 */
export async function validateActionToken(
  token: string
): Promise<{ workRequestId: string; action: 'approve' | 'reject' } | null> {
  const supabase = await createClient()

  // Fetch token from database
  const { data: tokenData, error } = await supabase
    .from('work_request_action_tokens')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !tokenData) {
    console.error('Token not found:', error)
    return null
  }

  // Check if token is already used
  if (tokenData.used) {
    console.error('Token already used')
    return null
  }

  // Check if token is expired
  const now = new Date()
  const expiresAt = new Date(tokenData.expires_at)
  if (now > expiresAt) {
    console.error('Token expired')
    return null
  }

  // Mark token as used
  await supabase
    .from('work_request_action_tokens')
    .update({ used: true })
    .eq('token', token)

  return {
    workRequestId: tokenData.work_request_id,
    action: tokenData.action
  }
}
