import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TimeTrackingView } from './components/time-tracking-view'

export default async function ZeiterfassungPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get current date info
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const params = await searchParams
  const selectedYear = params.year ? parseInt(params.year) : currentYear
  const selectedMonth = params.month ? parseInt(params.month) : currentMonth

  return (
    <TimeTrackingView
      initialYear={selectedYear}
      initialMonth={selectedMonth}
      userId={user.id}
    />
  )
}
