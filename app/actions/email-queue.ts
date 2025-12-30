'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

/**
 * Retry a failed email by resetting its status to pending
 */
export async function retryEmail(emailId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('email_queue')
    .update({
      status: 'pending',
      attempts: 0,
      error_message: null
    })
    .eq('id', emailId)

  if (error) {
    console.error('[Email Queue] Failed to retry email:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/email-queue')
  return { success: true }
}

/**
 * Retry all failed emails
 */
export async function retryAllFailedEmails() {
  const supabase = createAdminClient()

  const { error, count } = await supabase
    .from('email_queue')
    .update({
      status: 'pending',
      attempts: 0,
      error_message: null
    })
    .eq('status', 'failed')

  if (error) {
    console.error('[Email Queue] Failed to retry all emails:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/email-queue')
  return { success: true, count }
}
