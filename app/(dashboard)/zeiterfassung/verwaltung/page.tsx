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
  const adminSupabase = createAdminClient()
  const { data: employees } = await adminSupabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .eq('is_active', true)
    .order('first_name', { ascending: true })

  // Load employee settings in parallel
  const settingsResult = await getAllEmployeeSettings()

  return (
    <AdminTimeTrackingView
      initialYear={selectedYear}
      initialMonth={selectedMonth}
      selectedEmployee={selectedEmployee}
      employees={employees || []}
      employeeSettings={settingsResult.data || []}
    />
  )
}
