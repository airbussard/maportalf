import { createAdminClient } from '@/lib/supabase/admin'

interface CreateNotificationParams {
  userId: string
  type: 'new_ticket' | 'work_request' | 'ticket_assignment'
  title: string
  message: string
  link?: string
  ticketId?: string
  workRequestId?: string
}

/**
 * Create an in-app notification for a user
 * Checks user's notification preferences before creating
 *
 * @param params Notification parameters
 * @returns true if notification was created, false otherwise
 */
export async function createNotification(params: CreateNotificationParams): Promise<boolean> {
  try {
    const supabase = createAdminClient()

    // Get user's notification preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('notification_settings')
      .eq('id', params.userId)
      .single()

    if (profileError || !profile) {
      console.error('Error fetching user notification settings:', profileError)
      return false
    }

    // Check if user wants this type of notification
    const settings = profile.notification_settings || {
      new_ticket: true,
      work_request: true,
      ticket_assignment: true
    }

    // Map notification type to setting key
    const settingKey = params.type === 'new_ticket' ? 'new_ticket'
      : params.type === 'work_request' ? 'work_request'
      : 'ticket_assignment'

    if (!settings[settingKey]) {
      console.log(`User ${params.userId} has disabled ${params.type} notifications`)
      return false
    }

    // Create notification
    const { error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link || null,
        ticket_id: params.ticketId || null,
        work_request_id: params.workRequestId || null,
        read: false
      })

    if (insertError) {
      console.error('Error creating notification:', insertError)
      return false
    }

    console.log(`Created ${params.type} notification for user ${params.userId}`)
    return true

  } catch (error) {
    console.error('Error in createNotification:', error)
    return false
  }
}

/**
 * Create notifications for all Manager/Admin users
 * Used for new tickets and work requests
 *
 * @param type Notification type
 * @param title Notification title
 * @param message Notification message
 * @param link Optional link URL
 * @param ticketId Optional ticket ID
 * @param workRequestId Optional work request ID
 * @returns Number of notifications created
 */
export async function createNotificationForManagers(
  type: 'new_ticket' | 'work_request',
  title: string,
  message: string,
  link?: string,
  ticketId?: string,
  workRequestId?: string
): Promise<number> {
  try {
    const supabase = createAdminClient()

    // Get all Manager/Admin users
    const { data: managers, error: managersError } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['manager', 'admin'])

    if (managersError || !managers || managers.length === 0) {
      console.log('No managers found for notifications')
      return 0
    }

    let count = 0

    // Create notification for each manager
    for (const manager of managers) {
      const created = await createNotification({
        userId: manager.id,
        type,
        title,
        message,
        link,
        ticketId,
        workRequestId
      })

      if (created) {
        count++
      }
    }

    console.log(`Created ${count} notifications for managers`)
    return count

  } catch (error) {
    console.error('Error creating notifications for managers:', error)
    return 0
  }
}
