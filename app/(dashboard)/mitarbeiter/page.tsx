import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getEmployees } from '@/app/actions/employees'
import { getAllEmployeeSettings } from '@/app/actions/employee-settings'
import { EmployeesTable } from './components/employees-table'
import { Breadcrumb } from '@/components/nextadmin'

export default async function MitarbeiterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is manager or admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'admin'
  const isAdmin = profile?.role === 'admin'
  const isManager = profile?.role === 'manager'

  if (!isManagerOrAdmin) {
    redirect('/dashboard')
  }

  // Load employees and settings in parallel (only admins get settings)
  const [employeesResult, settingsResult] = await Promise.all([
    getEmployees(),
    isAdmin ? getAllEmployeeSettings() : Promise.resolve({ success: true, data: [] })
  ])

  if (!employeesResult.success) {
    return (
      <div className="mx-auto max-w-screen-2xl py-8 px-4 md:px-6 2xl:px-10">
        <div className="p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-[10px]">
          {employeesResult.error}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-screen-2xl space-y-7.5 py-8 px-4 md:px-6 2xl:px-10">
      <Breadcrumb pageName="Mitarbeiter" />

      <EmployeesTable
        employees={employeesResult.data || []}
        employeeSettings={settingsResult.data || []}
        isAdmin={isAdmin}
        isManager={isManager}
      />
    </div>
  )
}
