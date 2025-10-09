'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { EmployeeSettings } from '@/lib/types/time-tracking'

interface ActionResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// Get employee compensation settings
export async function getEmployeeSettings(
  employeeId: string
): Promise<ActionResponse<EmployeeSettings | null>> {
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

    // Use Admin Client to fetch settings
    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
      .from('employee_settings')
      .select('*')
      .eq('employee_id', employeeId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching employee settings:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as EmployeeSettings | null }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Save employee compensation settings - Admin only
export async function saveEmployeeSettings(data: {
  employee_id: string
  compensation_type: 'hourly' | 'salary'
  hourly_rate?: number
  monthly_salary?: number
}): Promise<ActionResponse<EmployeeSettings>> {
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

    // Validate inputs
    if (data.compensation_type === 'hourly' && (!data.hourly_rate || data.hourly_rate <= 0)) {
      return { success: false, error: 'Stundenlohn muss größer als 0 sein' }
    }

    if (data.compensation_type === 'salary' && (!data.monthly_salary || data.monthly_salary <= 0)) {
      return { success: false, error: 'Monatsgehalt muss größer als 0 sein' }
    }

    // For salary type, ensure hourly_rate is set (needed for calculation)
    if (data.compensation_type === 'salary' && (!data.hourly_rate || data.hourly_rate <= 0)) {
      return { success: false, error: 'Stundensatz muss auch bei Festgehalt angegeben werden' }
    }

    // Prepare upsert data
    const settingsData = {
      employee_id: data.employee_id,
      compensation_type: data.compensation_type,
      hourly_rate: data.compensation_type === 'hourly' ? data.hourly_rate : data.hourly_rate,
      monthly_salary: data.compensation_type === 'salary' ? data.monthly_salary : null,
      currency: 'EUR',
      updated_by: user.id
    }

    // Use Admin Client to upsert settings
    const adminSupabase = createAdminClient()
    const { data: result, error } = await adminSupabase
      .from('employee_settings')
      .upsert(settingsData, {
        onConflict: 'employee_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving employee settings:', error)
      return { success: false, error: error.message }
    }

    // Also save to compensation history for tracking
    const today = new Date().toISOString().split('T')[0]
    const historyData = {
      employee_id: data.employee_id,
      compensation_type: data.compensation_type,
      hourly_rate: data.compensation_type === 'hourly' ? data.hourly_rate : data.hourly_rate,
      monthly_salary: data.compensation_type === 'salary' ? data.monthly_salary : null,
      currency: 'EUR',
      valid_from: today,
      created_by: user.id,
      reason: 'Configuration update via admin panel'
    }

    await adminSupabase
      .from('employee_compensation_history')
      .insert(historyData)

    return { success: true, data: result as EmployeeSettings }
  } catch (error: any) {
    console.error('Error in saveEmployeeSettings:', error)
    return { success: false, error: error.message }
  }
}
