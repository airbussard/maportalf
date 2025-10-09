'use server'

import { createClient } from '@/lib/supabase/server'
import type { TimeCategory } from '@/lib/types/time-tracking'

interface ActionResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// Get all active time categories
export async function getTimeCategories(): Promise<ActionResponse<TimeCategory[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('time_categories')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching time categories:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TimeCategory[] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Get all time categories (including inactive) - Admin only
export async function getAllTimeCategories(): Promise<ActionResponse<TimeCategory[]>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Keine Berechtigung' }
    }

    const { data, error } = await supabase
      .from('time_categories')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching all time categories:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TimeCategory[] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Create time category - Admin only
export async function createTimeCategory(
  name: string,
  description: string | null,
  color: string
): Promise<ActionResponse<TimeCategory>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Keine Berechtigung' }
    }

    const { data, error } = await supabase
      .from('time_categories')
      .insert({
        name,
        description,
        color,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating time category:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TimeCategory }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Update time category - Admin only
export async function updateTimeCategory(
  id: string,
  updates: {
    name?: string
    description?: string | null
    color?: string
    is_active?: boolean
  }
): Promise<ActionResponse<TimeCategory>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Keine Berechtigung' }
    }

    const { data, error } = await supabase
      .from('time_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating time category:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TimeCategory }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Delete time category - Admin only
export async function deleteTimeCategory(id: string): Promise<ActionResponse> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Keine Berechtigung' }
    }

    const { error } = await supabase
      .from('time_categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting time category:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
