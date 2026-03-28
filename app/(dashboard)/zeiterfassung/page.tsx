import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TimesheetView } from './components/timesheet-view'

export default async function ZeiterfassungPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const now = new Date()

  return (
    <TimesheetView
      userId={user.id}
      initialYear={now.getFullYear()}
      initialMonth={now.getMonth() + 1}
    />
  )
}
