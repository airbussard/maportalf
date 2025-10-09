'use server'

import { createClient } from '@/lib/supabase/server'
import type { TimeReport } from '@/lib/types/time-tracking'

interface ActionResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// Get time report for a specific month
export async function getTimeReport(
  year: number,
  month: number,
  employeeId: string
): Promise<ActionResponse<TimeReport | null>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const { data, error } = await supabase
      .from('time_reports')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('year', year)
      .eq('month', month)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching time report:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TimeReport | null }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Close a month - Admin only
export async function closeMonth(
  year: number,
  month: number,
  employeeId: string,
  totalMinutes: number,
  notes?: string
): Promise<ActionResponse<TimeReport>> {
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

    // Check if report already exists
    const existingReport = await getTimeReport(year, month, employeeId)

    let data, error

    if (existingReport.data) {
      // Update existing report
      const response = await supabase
        .from('time_reports')
        .update({
          total_minutes: totalMinutes,
          is_closed: true,
          closed_by: user.id,
          closed_at: new Date().toISOString(),
          notes: notes || null
        })
        .eq('employee_id', employeeId)
        .eq('year', year)
        .eq('month', month)
        .select()
        .single()

      data = response.data
      error = response.error
    } else {
      // Create new report
      const response = await supabase
        .from('time_reports')
        .insert({
          employee_id: employeeId,
          year,
          month,
          total_minutes: totalMinutes,
          is_closed: true,
          closed_by: user.id,
          closed_at: new Date().toISOString(),
          notes: notes || null
        })
        .select()
        .single()

      data = response.data
      error = response.error
    }

    if (error) {
      console.error('Error closing month:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TimeReport }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Reopen a month - Admin only
export async function reopenMonth(
  year: number,
  month: number,
  employeeId: string
): Promise<ActionResponse<TimeReport>> {
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
      .from('time_reports')
      .update({
        is_closed: false,
        closed_by: null,
        closed_at: null
      })
      .eq('employee_id', employeeId)
      .eq('year', year)
      .eq('month', month)
      .select()
      .single()

    if (error) {
      console.error('Error reopening month:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TimeReport }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Get all reports for a specific month (all employees) - Admin only
export async function getAllReportsForMonth(
  year: number,
  month: number
): Promise<ActionResponse<TimeReport[]>> {
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
      .from('time_reports')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reports:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TimeReport[] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
