/**
 * Work Requests Page (Employee View)
 *
 * Main page for employees to manage their work requests and view calendar
 * Features: Tab navigation (Requests List / Calendar), Create/Edit dialogs
 */

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyWorkRequests } from '@/app/actions/work-requests'
import { getCalendarEvents } from '@/app/actions/calendar-events'
import { RequestsContent } from './requests-content'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Meine Requests | Flighthour',
  description: 'Arbeitstage verwalten und Kalender einsehen'
}

async function RequestsPageContent() {
  // Check authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, last_name')
    .eq('id', user.id)
    .single()

  const userName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : user.email || 'Unbekannt'

  // Load work requests
  const requests = await getMyWorkRequests()

  // Load calendar events for current month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const calendarEvents = await getCalendarEvents(
    startOfMonth.toISOString(),
    endOfMonth.toISOString()
  )

  return (
    <RequestsContent
      requests={requests}
      calendarEvents={calendarEvents}
      userId={user.id}
      userName={userName}
    />
  )
}

export default function RequestsPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Suspense fallback={<RequestsPageSkeleton />}>
        <RequestsPageContent />
      </Suspense>
    </div>
  )
}

function RequestsPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-[600px] w-full" />
    </div>
  )
}
