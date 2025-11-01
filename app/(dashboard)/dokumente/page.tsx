import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DocumentsView } from './components/documents-view'

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, last_name')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Get all employees for the upload form (admin only needs this)
  let employees: Array<{
    id: string
    first_name: string | null
    last_name: string | null
    email: string
  }> = []

  if (profile.role === 'admin') {
    const { data: employeeData } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .order('first_name')

    employees = employeeData || []
  }

  return (
    <DocumentsView
      userRole={profile.role}
      employees={employees}
    />
  )
}
