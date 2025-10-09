import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getEmployees } from '@/app/actions/employees'
import { getAllEmployeeSettings } from '@/app/actions/employee-settings'
import { EmployeesTable } from './components/employees-table'

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

  // Load employees and settings in parallel
  const [employeesResult, settingsResult] = await Promise.all([
    getEmployees(),
    getAllEmployeeSettings()
  ])

  if (!employeesResult.success) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
          {employeesResult.error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Mitarbeiter</h1>
          <p className="text-muted-foreground mt-1">
            Übersicht aller Mitarbeiter und deren Rollen
          </p>
        </div>
      </div>

      <EmployeesTable
        employees={employeesResult.data || []}
        employeeSettings={settingsResult.data || []}
        isAdmin={isAdmin}
        isManager={isManager}
      />
    </div>
  )
}
