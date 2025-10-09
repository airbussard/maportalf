'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  TimeReport,
  TimeReportRecipient,
  MonthlyReportData,
  EmployeeReportData
} from '@/lib/types/time-tracking'

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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    // Use Admin Client if admin is viewing other employee's data
    const dbClient = (isAdmin && employeeId !== user.id)
      ? createAdminClient()
      : supabase

    const { data, error } = await dbClient
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
  bonusAmount?: number,
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

    // Use Admin Client to modify reports (bypasses RLS)
    const adminSupabase = createAdminClient()
    let data, error

    if (existingReport.data) {
      // Update existing report
      const response = await adminSupabase
        .from('time_reports')
        .update({
          total_minutes: totalMinutes,
          is_closed: true,
          closed_by: user.id,
          closed_at: new Date().toISOString(),
          bonus_amount: bonusAmount || 0,
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
      const response = await adminSupabase
        .from('time_reports')
        .insert({
          employee_id: employeeId,
          year,
          month,
          total_minutes: totalMinutes,
          is_closed: true,
          closed_by: user.id,
          closed_at: new Date().toISOString(),
          bonus_amount: bonusAmount || 0,
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

    // Use Admin Client to fetch all reports (bypasses RLS)
    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
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

// Get saved email recipients - Admin only
export async function getSavedRecipients(): Promise<ActionResponse<TimeReportRecipient[]>> {
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
      .from('time_report_recipients')
      .select('*')
      .eq('is_active', true)
      .order('email', { ascending: true })

    if (error) {
      console.error('Error fetching recipients:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TimeReportRecipient[] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Save new email recipient - Admin only
export async function saveRecipient(
  email: string,
  name?: string
): Promise<ActionResponse<TimeReportRecipient>> {
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

    // Check if recipient already exists
    const { data: existing } = await supabase
      .from('time_report_recipients')
      .select('*')
      .eq('email', email)
      .single()

    if (existing) {
      return { success: true, data: existing as TimeReportRecipient }
    }

    // Extract name from email if not provided
    const recipientName = name || email.split('@')[0].replace(/[._-]/g, ' ')

    const { data, error } = await supabase
      .from('time_report_recipients')
      .insert({
        email,
        name: recipientName,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving recipient:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as TimeReportRecipient }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Generate report data for PDF/Email - Admin only
export async function generateReportData(
  year: number,
  month: number,
  employeeId: string = 'all'
): Promise<ActionResponse<MonthlyReportData>> {
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

    const MONTH_NAMES = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ]

    // Fetch employees
    const adminSupabase = createAdminClient()
    let employeesQuery = adminSupabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('is_active', true)

    if (employeeId !== 'all') {
      employeesQuery = employeesQuery.eq('id', employeeId)
    }

    const { data: employees, error: employeesError } = await employeesQuery

    if (employeesError) {
      return { success: false, error: employeesError.message }
    }

    // Fetch time entries for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    let entriesQuery = adminSupabase
      .from('time_entries')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)

    if (employeeId !== 'all') {
      entriesQuery = entriesQuery.eq('employee_id', employeeId)
    }

    const { data: entries, error: entriesError } = await entriesQuery

    if (entriesError) {
      return { success: false, error: entriesError.message }
    }

    // Fetch time reports
    let reportsQuery = adminSupabase
      .from('time_reports')
      .select('*')
      .eq('year', year)
      .eq('month', month)

    if (employeeId !== 'all') {
      reportsQuery = reportsQuery.eq('employee_id', employeeId)
    }

    const { data: reports } = await reportsQuery

    const reportsMap = new Map()
    reports?.forEach((report: any) => {
      reportsMap.set(report.employee_id, report)
    })

    // Generate employee report data
    const employeeReportData: EmployeeReportData[] = []
    const totals = {
      total_days: 0,
      total_hours: 0,
      total_interim: 0,
      total_evaluations: 0,
      total_provision: 0,
      total_salary: 0
    }

    for (const employee of employees || []) {
      const employeeEntries = entries?.filter((e: any) => e.employee_id === employee.id) || []
      const report = reportsMap.get(employee.id)

      // Calculate work days and hours
      const workDays = new Set(employeeEntries.map((e: any) => e.date)).size
      const totalMinutes = employeeEntries.reduce((sum: number, e: any) => sum + e.duration_minutes, 0)
      const totalHours = Math.round((totalMinutes / 60) * 100) / 100

      // Get compensation via RPC
      const { data: compensation } = await adminSupabase
        .rpc('get_employee_compensation', {
          p_employee_id: employee.id,
          p_date: startDate
        })

      const compensationData = compensation?.[0]
      let hourlyRate = 0
      let interimSalary = 0
      let calculatedHours = totalHours // Default to actual worked hours
      const bonusAmount = report?.bonus_amount || 0

      if (compensationData) {
        if (compensationData.compensation_type === 'hourly') {
          // Hourly compensation: salary = hours × rate + bonus
          hourlyRate = compensationData.hourly_rate || 0
          interimSalary = (totalHours * hourlyRate) + bonusAmount
          calculatedHours = totalHours // Use actual worked hours
        } else {
          // Salary compensation: salary = monthly salary + (worked hours × rate) + bonus
          // Hours are calculated for export: total salary / hourly rate
          const monthlySalary = compensationData.monthly_salary || 0
          hourlyRate = compensationData.hourly_rate || 20
          interimSalary = monthlySalary + (totalHours * hourlyRate) + bonusAmount
          calculatedHours = Math.round((interimSalary / hourlyRate) * 100) / 100 // Calculate hours for export
        }
      }

      const evaluationCount = report?.evaluation_count || 0
      const provision = evaluationCount * 50 // 50€ per evaluation
      const totalSalary = interimSalary + provision

      employeeReportData.push({
        employee_id: employee.id,
        employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.email,
        employee_email: employee.email,
        work_days: workDays,
        total_hours: calculatedHours, // Use calculated hours (important for salary type!)
        hourly_rate: hourlyRate,
        interim_salary: interimSalary,
        bonus_amount: bonusAmount,
        evaluation_count: evaluationCount,
        provision: provision,
        total_salary: totalSalary
      })

      // Update totals
      totals.total_days += workDays
      totals.total_hours += calculatedHours // Use calculated hours for totals
      totals.total_interim += interimSalary
      totals.total_evaluations += evaluationCount
      totals.total_provision += provision
      totals.total_salary += totalSalary
    }

    return {
      success: true,
      data: {
        year,
        month,
        month_name: MONTH_NAMES[month - 1],
        employees: employeeReportData,
        totals
      }
    }
  } catch (error: any) {
    console.error('Error generating report data:', error)
    return { success: false, error: error.message }
  }
}
