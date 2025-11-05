'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Notification {
  id: string
  user_id: string
  type: 'new_ticket' | 'work_request' | 'ticket_assignment'
  title: string
  message: string
  link: string | null
  read: boolean
  created_at: string
  ticket_id: string | null
  work_request_id: string | null
}

/**
 * Get user's notifications (max 10 newest)
 * @returns Array of notifications
 */
export async function getNotifications(): Promise<Notification[]> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return []
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching notifications:', error)
      return []
    }

    return data as Notification[]
  } catch (error) {
    console.error('getNotifications error:', error)
    return []
  }
}

/**
 * Get count of unread notifications
 * @returns Number of unread notifications
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return 0
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)

    if (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('getUnreadCount error:', error)
    return 0
  }
}

/**
 * Mark a notification as read
 * @param notificationId The notification ID
 */
export async function markAsRead(notificationId: string): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return
    }

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id) // Only update own notifications

    revalidatePath('/', 'layout')
  } catch (error) {
    console.error('markAsRead error:', error)
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return
    }

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)

    revalidatePath('/', 'layout')
  } catch (error) {
    console.error('markAllAsRead error:', error)
  }
}

/**
 * Delete a notification
 * @param notificationId The notification ID
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return
    }

    await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id) // Only delete own notifications

    revalidatePath('/', 'layout')
  } catch (error) {
    console.error('deleteNotification error:', error)
  }
}

/**
 * Update notification preferences
 * @param settings Object with notification type keys and boolean values
 */
export async function updateNotificationPreferences(
  settings: Record<string, boolean>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ notification_settings: settings })
      .eq('id', user.id)

    if (error) {
      console.error('Error updating notification preferences:', error)
      return { success: false, error: 'Fehler beim Speichern' }
    }

    revalidatePath('/einstellungen')
    return { success: true }
  } catch (error) {
    console.error('updateNotificationPreferences error:', error)
    return { success: false, error: 'Ein Fehler ist aufgetreten' }
  }
}
