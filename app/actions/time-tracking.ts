'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TimeEntry, TimeEntryFormData, MonthlyStats } from '@/lib/types/time-tracking'

interface ActionResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// Get time entries for a specific month
export async function getTimeEntries(
  year: number,
  month: number,
  employeeId?: string
): Promise<ActionResponse<TimeEntry[]>> {
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

    const isAdmin = profile?.role === 'admin'
    const targetEmployeeId = employeeId || user.id

    // Use Admin Client if admin is viewing other employee's data
    const dbClient = (isAdmin && employeeId && employeeId !== user.id)
      ? createAdminClient()
      : supabase

    // Build date range
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const { data, error } = await dbClient
      .from('time_entries')
      .select('*, category:time_categories(*)')
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('employee_id', targetEmployeeId)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })

    if (error) {
      console.error('Error fetching time entries:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TimeEntry[] }
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return { success: false, error: error.message }
  }
}

// Get monthly statistics
export async function getMonthlyStats(
  year: number,
  month: number,
  employeeId?: string
): Promise<ActionResponse<MonthlyStats>> {
  try {
    const result = await getTimeEntries(year, month, employeeId)

    if (!result.success || !result.data) {
      return { success: false, error: result.error }
    }

    const entries = result.data
    const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration_minutes, 0)

    // Count unique days worked
    const uniqueDays = new Set(entries.map(e => e.date))
    const daysWorked = uniqueDays.size

    const averagePerDay = daysWorked > 0 ? Math.round(totalMinutes / daysWorked) : 0

    const stats: MonthlyStats = {
      total_minutes: totalMinutes,
      total_hours: Number((totalMinutes / 60).toFixed(2)),
      days_worked: daysWorked,
      average_per_day: averagePerDay,
      entries_count: entries.length
    }

    return { success: true, data: stats }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Check if month is closed
export async function isMonthClosed(
  year: number,
  month: number,
  employeeId?: string
): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    const targetEmployeeId = employeeId || user.id

    const { data } = await supabase
      .from('time_reports')
      .select('is_closed')
      .eq('employee_id', targetEmployeeId)
      .eq('year', year)
      .eq('month', month)
      .eq('is_closed', true)
      .single()

    return !!data
  } catch (error) {
    return false
  }
}

// Create time entry
export async function createTimeEntry(
  formData: TimeEntryFormData
): Promise<ActionResponse<TimeEntry>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Validate duration
    if (formData.duration_minutes <= 0) {
      return { success: false, error: 'Dauer muss größer als 0 sein' }
    }

    // Extract year and month from date string directly (avoid timezone issues)
    // formData.date is in format "YYYY-MM-DD"
    const [year, month] = formData.date.split('-').map(Number)

    // Check if month is closed
    const monthClosed = await isMonthClosed(year, month)
    if (monthClosed) {
      return { success: false, error: 'Dieser Monat wurde bereits abgeschlossen' }
    }

    // Prepare data
    const data = {
      employee_id: user.id,
      date: formData.date,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      duration_minutes: formData.duration_minutes,
      category_id: formData.category_id || null,
      description: formData.description || null,
      is_approved: false
    }

    const { data: entry, error } = await supabase
      .from('time_entries')
      .insert(data)
      .select('*, category:time_categories(*)')
      .single()

    if (error) {
      console.error('Error creating time entry:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: entry as TimeEntry }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Update time entry
export async function updateTimeEntry(
  id: string,
  formData: TimeEntryFormData
): Promise<ActionResponse<TimeEntry>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Check if entry exists and belongs to user
    const { data: existingEntry } = await supabase
      .from('time_entries')
      .select('*')
      .eq('id', id)
      .eq('employee_id', user.id)
      .single()

    if (!existingEntry) {
      return { success: false, error: 'Eintrag nicht gefunden' }
    }

    if (existingEntry.is_approved) {
      return { success: false, error: 'Genehmigte Einträge können nicht bearbeitet werden' }
    }

    // Extract year and month from date string directly (avoid timezone issues)
    // formData.date is in format "YYYY-MM-DD"
    const [year, month] = formData.date.split('-').map(Number)

    // Check if month is closed
    const monthClosed = await isMonthClosed(year, month)
    if (monthClosed) {
      return { success: false, error: 'Dieser Monat wurde bereits abgeschlossen' }
    }

    // Update data
    const updateData = {
      date: formData.date,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      duration_minutes: formData.duration_minutes,
      category_id: formData.category_id || null,
      description: formData.description || null
    }

    const { data: entry, error } = await supabase
      .from('time_entries')
      .update(updateData)
      .eq('id', id)
      .select('*, category:time_categories(*)')
      .single()

    if (error) {
      console.error('Error updating time entry:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: entry as TimeEntry }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Delete time entry
export async function deleteTimeEntry(id: string): Promise<ActionResponse> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Check if entry exists and belongs to user
    const { data: existingEntry } = await supabase
      .from('time_entries')
      .select('*')
      .eq('id', id)
      .eq('employee_id', user.id)
      .single()

    if (!existingEntry) {
      return { success: false, error: 'Eintrag nicht gefunden' }
    }

    if (existingEntry.is_approved) {
      return { success: false, error: 'Genehmigte Einträge können nicht gelöscht werden' }
    }

    // Extract year and month from date
    const entryDate = new Date(existingEntry.date)
    const year = entryDate.getFullYear()
    const month = entryDate.getMonth() + 1

    // Check if month is closed
    const monthClosed = await isMonthClosed(year, month)
    if (monthClosed) {
      return { success: false, error: 'Dieser Monat wurde bereits abgeschlossen' }
    }

    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting time entry:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Get single time entry
export async function getTimeEntry(id: string): Promise<ActionResponse<TimeEntry>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const { data, error } = await supabase
      .from('time_entries')
      .select('*, category:time_categories(*)')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching time entry:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TimeEntry }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
