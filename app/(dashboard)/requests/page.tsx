/**
 * Work Requests Page (Employee View)
 *
 * Read-only calendar view showing all events
 * Uses the same CalendarView component as manager view but in read-only mode
 */

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCalendarEvents } from '@/app/actions/calendar-events'
import { CalendarView } from '@/app/(dashboard)/kalender/components/calendar-view'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Mein Kalender | Flighthour',
  description: 'Kalenderübersicht (nur lesend)'
}

// Dummy sync action that does nothing (required by CalendarView)
async function dummySyncAction() {
  'use server'
  // No-op for read-only view
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

  // Load only current month's events
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const events = await getCalendarEvents(
    startOfMonth.toISOString(),
    endOfMonth.toISOString()
  )

  return (
    <CalendarView
      events={events}
      lastSync={null}
      userName={userName}
      syncAction={dummySyncAction}
      isReadOnly={true}
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
