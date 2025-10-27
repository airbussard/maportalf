/**
 * Calendar Page (Manager/Admin View)
 *
 * View and manage Google Calendar events
 */

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCalendarEvents } from '@/app/actions/calendar-events'
import { CalendarView } from './components/calendar-view'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Kalender | Flighthour',
  description: 'Google Calendar Events verwalten'
}

async function CalendarPageContent() {
  // Check authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is manager or admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, last_name')
    .eq('id', user.id)
    .single()

  const isManager = profile?.role === 'manager'
  const isAdmin = profile?.role === 'admin'

  if (!isManager && !isAdmin) {
    redirect('/dashboard')
  }

  // Load calendar events
  const events = await getCalendarEvents()

  // Get last sync info
  const { data: lastSync } = await supabase
    .from('calendar_sync_logs')
    .select('completed_at, events_imported, events_exported, events_updated, status')
    .eq('status', 'success')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <CalendarView
      events={events}
      lastSync={lastSync}
      userName={`${profile?.first_name} ${profile?.last_name}`}
    />
  )
}

export default function CalendarPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarPageContent />
      </Suspense>
    </div>
  )
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-[600px] w-full" />
    </div>
  )
}
