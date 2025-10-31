import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SystemStatusWidget } from './components/system-status'
import { getTodaysEvents } from '@/app/actions/calendar-events'
import { getOpenTicketsCount, getInProgressTicketsCount } from '@/app/actions/tickets'
import { getPendingRequestsCount } from '@/app/actions/work-requests'
import { EventCard } from '@/app/(dashboard)/kalender/components/event-card'
import { Calendar, Ticket, FileText } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single()

  const fullName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : user?.email

  const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'admin'

  // Fetch today's events
  const todaysEvents = await getTodaysEvents()
  const filteredEvents = todaysEvents.filter(event => event.status !== 'cancelled')

  // Fetch stats for managers/admins
  const openTicketsCount = isManagerOrAdmin ? await getOpenTicketsCount() : 0
  const inProgressTicketsCount = isManagerOrAdmin ? await getInProgressTicketsCount() : 0
  const pendingRequestsCount = isManagerOrAdmin ? await getPendingRequestsCount() : 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Willkommen zurück, {fullName}!</h1>
        <p className="text-muted-foreground mt-2">
          Hier ist Ihre Übersicht für heute
        </p>
      </div>

      {/* Manager/Admin Stats */}
      {isManagerOrAdmin && (
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/tickets?status=open">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Offene Tickets</CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{openTicketsCount}</div>
                <p className="text-xs text-muted-foreground">Status: Offen →</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tickets?status=in_progress">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Bearbeitung</CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inProgressTicketsCount}</div>
                <p className="text-xs text-muted-foreground">Status: In Bearbeitung →</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/requests/manage">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Offene Requests</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingRequestsCount}</div>
                <p className="text-xs text-muted-foreground">Ausstehende Genehmigungen →</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Today's Events */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>Termine heute ({filteredEvents.length})</CardTitle>
          </div>
          <CardDescription>
            {filteredEvents.length === 0 ? 'Keine Termine für heute' : 'Heutige Termine'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Keine Termine heute</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEvents
                .sort((a, b) => {
                  // FI events first
                  if (a.event_type === 'fi_assignment' && b.event_type !== 'fi_assignment') return -1
                  if (a.event_type !== 'fi_assignment' && b.event_type === 'fi_assignment') return 1
                  // Then by time
                  return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
                })
                .map(event => (
                  <EventCard key={event.id} event={event} />
                ))
              }
            </div>
          )}
        </CardContent>
      </Card>

      <SystemStatusWidget />
    </div>
  )
}
