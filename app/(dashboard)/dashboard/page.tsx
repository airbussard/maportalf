import { createClient } from '@/lib/supabase/server'
import { Breadcrumb, StatCard, StatusBadge } from '@/components/nextadmin'
import { SystemStatusWidget } from './components/system-status'
import { getTodaysEvents, getMyUpcomingAssignments } from '@/app/actions/calendar-events'
import { getOpenTicketsCount, getInProgressTicketsCount } from '@/app/actions/tickets'
import { getPendingRequestsCount } from '@/app/actions/work-requests'
import { Calendar, Ticket, FileText, CalendarClock, User, Clock } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { de } from 'date-fns/locale'
import { cn } from '@/lib/utils'
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
    <div className="mx-auto max-w-screen-2xl">
      <Breadcrumb pageName="Dashboard" />

      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-heading-5 font-bold text-foreground">
          {isNewYear ? (
            <>
              <span className="text-amber-500">Frohes Neues Jahr</span>, {fullName}!
            </>
          ) : isChristmas ? (
            <>
              <span className="text-red-500">Frohe Weihnachten</span>, {fullName}!
            </>
          ) : (
            <>Willkommen zurück, {fullName}!</>
          )}
        </h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          Hier ist Ihre Übersicht für heute
        </p>
      </div>

      {/* KPI Stats Row */}
      {isManagerOrAdmin && (
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3 2xl:gap-7.5">
          <Link href="/tickets?status=open">
            <StatCard
              label="Offene Tickets"
              value={openTicketsCount}
              icon={Ticket}
              iconColor="#FF9C55"
            />
          </Link>

          <Link href="/tickets?status=in_progress">
            <StatCard
              label="In Bearbeitung"
              value={inProgressTicketsCount}
              icon={Ticket}
              iconColor="#3C50E0"
            />
          </Link>

          <Link href="/requests/manage">
            <StatCard
              label="Offene Requests"
              value={pendingRequestsCount}
              icon={FileText}
              iconColor="#fbb928"
            />
          </Link>
        </div>
      )}

      {/* Main Content Grid - 12 columns like NextAdmin */}
      <div className="mt-6 grid grid-cols-12 gap-4 md:gap-6 2xl:gap-7.5">

        {/* My Assignments - spans 7 columns */}
        <div className="col-span-12 xl:col-span-7 rounded-[10px] bg-card py-6 shadow-1 dark:shadow-card">
          <h2 className="mb-4 px-7.5 text-lg font-bold text-foreground">
            Meine nächsten Termine
          </h2>

          {myAssignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <CalendarClock className="size-10 mb-3 opacity-40" />
              <p className="text-sm">Keine anstehenden Termine</p>
            </div>
          ) : (
            <ul>
              {myAssignments.map(event => {
                const tz = 'Europe/Berlin'
                const start = new Date(event.start_time)
                const monthAbbr = formatInTimeZone(start, tz, 'MMM', { locale: de }).toUpperCase()
                const dayNum = formatInTimeZone(start, tz, 'dd')
                const dateStr = formatInTimeZone(start, tz, 'EEEE, dd.MM.yyyy', { locale: de })
                const hasActualTimes = event.actual_work_start_time && event.actual_work_end_time
                const timeStr = hasActualTimes
                  ? `${event.actual_work_start_time?.slice(0, 5)} – ${event.actual_work_end_time?.slice(0, 5)} Uhr`
                  : event.is_all_day
                    ? 'Ganztägig'
                    : `${formatInTimeZone(start, tz, 'HH:mm')} – ${formatInTimeZone(new Date(event.end_time), tz, 'HH:mm')} Uhr`

                return (
                  <li key={event.id}>
                    <div className="flex items-center gap-4 px-7.5 py-3 hover:bg-accent/50 transition-colors">
                      {/* Date badge (like avatar in chat) */}
                      <div className="flex flex-col items-center justify-center rounded-lg bg-[#fbb928]/10 px-3 py-2 min-w-[52px] shrink-0">
                        <span className="text-xs font-bold text-[#fbb928] uppercase">{monthAbbr}</span>
                        <span className="text-xl font-bold leading-none text-foreground">{dayNum}</span>
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground capitalize">{dateStr}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground">{timeStr}</span>
                        </div>
                        {event.title && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{event.title}</p>
                        )}
                      </div>
                      {/* Status indicator */}
                      <span className="size-2.5 rounded-full bg-[#219653] shrink-0" />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Today's Events - spans 5 columns */}
        <div className="col-span-12 xl:col-span-5 rounded-[10px] bg-card py-6 shadow-1 dark:shadow-card">
          <h2 className="mb-4 px-7.5 text-lg font-bold text-foreground">
            Termine heute ({filteredEvents.length})
          </h2>

          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Calendar className="size-10 mb-3 opacity-40" />
              <p className="text-sm">Keine Termine heute</p>
            </div>
          ) : (
            <ul>
              {filteredEvents
                .sort((a, b) => {
                  // FI events first
                  if (a.event_type === 'fi_assignment' && b.event_type !== 'fi_assignment') return -1
                  if (a.event_type !== 'fi_assignment' && b.event_type === 'fi_assignment') return 1
                  // Then by time
                  return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
                })
                .map(event => {
                  const tz = 'Europe/Berlin'
                  const start = new Date(event.start_time)
                  const end = new Date(event.end_time)
                  const isFI = event.event_type === 'fi_assignment'
                  const isBlocker = event.event_type === 'blocker'

                  const hasActualTimes = event.actual_work_start_time && event.actual_work_end_time
                  const timeRange = hasActualTimes
                    ? `${event.actual_work_start_time?.slice(0, 5)} – ${event.actual_work_end_time?.slice(0, 5)} Uhr`
                    : event.is_all_day
                      ? 'Ganztägig'
                      : `${formatInTimeZone(start, tz, 'HH:mm')} – ${formatInTimeZone(end, tz, 'HH:mm')} Uhr`

                  const displayTitle = isFI
                    ? `FI: ${event.assigned_instructor_name || ''}${event.assigned_instructor_number ? ` (${event.assigned_instructor_number})` : ''}`
                    : isBlocker
                      ? (event.title || 'Blocker')
                      : (event.customer_first_name && event.customer_last_name
                          ? `${event.customer_first_name} ${event.customer_last_name}`
                          : event.title || 'Termin')

                  const statusVariant = event.status === 'confirmed' ? 'success'
                    : event.status === 'tentative' ? 'warning'
                    : 'neutral'

                  const statusLabel = event.status === 'confirmed' ? 'Bestätigt'
                    : event.status === 'tentative' ? 'Vorläufig'
                    : event.status

                  const typeLabel = isFI ? 'Geplanter MA' : isBlocker ? 'Blocker' : null
                  const typeVariant = isFI ? 'warning' : isBlocker ? 'error' : null

                  return (
                    <li key={event.id}>
                      <div className="flex items-center gap-4 px-7.5 py-3 hover:bg-accent/50 transition-colors">
                        {/* Event type indicator (colored circle with icon) */}
                        <div className={cn(
                          'flex size-10 items-center justify-center rounded-full shrink-0',
                          isFI ? 'bg-[#FFA70B]/10' :
                          isBlocker ? 'bg-[#F23030]/10' : 'bg-[#3C50E0]/10'
                        )}>
                          {isFI ? (
                            <User className={cn('size-5 text-[#FFA70B]')} />
                          ) : (
                            <Calendar className={cn(
                              'size-5',
                              isBlocker ? 'text-[#F23030]' : 'text-[#3C50E0]'
                            )} />
                          )}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground truncate">
                            {displayTitle}
                          </h3>
                          <span className="text-sm text-muted-foreground">{timeRange}</span>
                        </div>
                        {/* Status badge */}
                        {typeLabel ? (
                          <StatusBadge variant={typeVariant as 'warning' | 'error'}>
                            {typeLabel}
                          </StatusBadge>
                        ) : (
                          <StatusBadge variant={statusVariant as 'success' | 'warning' | 'neutral'}>
                            {statusLabel}
                          </StatusBadge>
                        )}
                      </div>
                    </li>
                  )
                })
              }
            </ul>
          )}
        </div>

        {/* System Status - full width */}
        <div className="col-span-12">
          <SystemStatusWidget />
        </div>
      </div>
    </div>
  )
}
