import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getAllEmployeeSettings } from '@/app/actions/employee-settings'
import { AdminTimeTrackingView } from './components/admin-time-tracking-view'

export default async function ZeiterfassungVerwaltungPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; employee?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/zeiterfassung')
  }

  // Get current date info
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const params = await searchParams
  const selectedYear = params.year ? parseInt(params.year) : currentYear
  const selectedMonth = params.month ? parseInt(params.month) : currentMonth
  const selectedEmployee = params.employee || 'all'

  // Fetch all employees using Admin Client (bypasses RLS)
  // Include employees that are:
  // 1. is_active = true AND no exit_date
  // 2. OR exit_date >= first day of selected month (still active in that month)
  const adminSupabase = createAdminClient()
  const firstDayOfMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`

  const { data: allEmployees } = await adminSupabase
    .from('profiles')
    .select('id, first_name, last_name, email, is_active, exit_date')
    .order('first_name', { ascending: true })

  // Filter employees: show if active in the selected month
  const employees = (allEmployees || []).filter(emp => {
    // Always exclude if is_active is false
    if (emp.is_active === false) return false

    // If no exit_date, employee is active
    if (!emp.exit_date) return true

    // Include if exit_date is >= first day of selected month
    return new Date(emp.exit_date) >= new Date(firstDayOfMonth)
  })

  // Load employee settings in parallel
  const settingsResult = await getAllEmployeeSettings()

  return (
    <AdminTimeTrackingView
      initialYear={selectedYear}
      initialMonth={selectedMonth}
      selectedEmployee={selectedEmployee}
      employees={employees}
      employeeSettings={settingsResult.data || []}
    />
  )
}
