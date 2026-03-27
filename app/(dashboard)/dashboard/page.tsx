import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SystemStatusWidget } from './components/system-status'
import { getTodaysEvents, getMyUpcomingAssignments } from '@/app/actions/calendar-events'
import { getOpenTicketsCount, getInProgressTicketsCount } from '@/app/actions/tickets'
import { getPendingRequestsCount } from '@/app/actions/work-requests'
import { EventCard } from '@/app/(dashboard)/kalender/components/event-card'
import { Calendar, Ticket, FileText, CalendarClock } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { de } from 'date-fns/locale'
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

  // Festliche Zeiträume
  const now = new Date()
  const month = now.getMonth()
  const day = now.getDate()
  const isChristmas = month === 11 && day >= 19 && day <= 26 // 19.-26. Dezember
  const isNewYear = month === 0 && day === 1 // 1. Januar

  const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'admin'

  // Fetch today's events
  const todaysEvents = await getTodaysEvents()
  const filteredEvents = todaysEvents.filter(event => event.status !== 'cancelled')

  // Fetch user's upcoming FI assignments
  const myAssignments = await getMyUpcomingAssignments(3)

  // Fetch stats for managers/admins
  const openTicketsCount = isManagerOrAdmin ? await getOpenTicketsCount() : 0
  const inProgressTicketsCount = isManagerOrAdmin ? await getInProgressTicketsCount() : 0
  const pendingRequestsCount = isManagerOrAdmin ? await getPendingRequestsCount() : 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isNewYear ? (
            <>
              <span className="text-amber-500">Frohes Neues Jahr</span>, {fullName}! 🥂
            </>
          ) : isChristmas ? (
            <>
              <span className="text-red-500">Frohe Weihnachten</span>, {fullName}! 🎅
            </>
          ) : (
            <>Willkommen zurück, {fullName}!</>
          )}
        </h1>
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

      {/* My Upcoming Assignments */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-[#fbb928]" />
            <CardTitle>Meine nächsten Termine</CardTitle>
          </div>
          <CardDescription>
            {myAssignments.length === 0 ? 'Keine anstehenden Termine' : 'Deine nächsten Arbeitseinsätze'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myAssignments.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Keine anstehenden Termine</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myAssignments.map(event => {
                const tz = 'Europe/Berlin'
                const start = new Date(event.start_time)
                const dateStr = formatInTimeZone(start, tz, 'EEEE, dd.MM.yyyy', { locale: de })
                const hasActualTimes = event.actual_work_start_time && event.actual_work_end_time
                const timeStr = hasActualTimes
                  ? `${event.actual_work_start_time?.slice(0, 5)} – ${event.actual_work_end_time?.slice(0, 5)} Uhr`
                  : event.is_all_day
                    ? 'Ganztägig'
                    : `${formatInTimeZone(start, tz, 'HH:mm')} – ${formatInTimeZone(new Date(event.end_time), tz, 'HH:mm')} Uhr`

                return (
                  <div key={event.id} className="flex items-center gap-4 rounded-lg border p-3">
                    <div className="flex flex-col items-center justify-center rounded-md bg-[#fbb928]/10 px-3 py-2 min-w-[52px]">
                      <span className="text-xs font-medium text-[#fbb928]">
                        {formatInTimeZone(start, tz, 'MMM', { locale: de }).toUpperCase()}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {formatInTimeZone(start, tz, 'dd')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize">{dateStr}</p>
                      <p className="text-xs text-muted-foreground">{timeStr}</p>
                      {event.title && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{event.title}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
