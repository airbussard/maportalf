'use client'

import { useState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import Image from 'next/image'
import { Calendar, Plus, RefreshCw, Clock, Users, Video, Euro } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { EventDialog } from './event-dialog'
import { cn } from '@/lib/utils'
import { ShiftCoverageDialog } from './shift-coverage-dialog'
import { ShiftCoverageList } from './shift-coverage-list'
import { getCalendarEventsByMonth } from '@/app/actions/calendar-events'
import { getShiftCoverageRequests, getActiveEmployeesForCoverage } from '@/app/actions/shift-coverage'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { ShiftCoverageRequestWithRelations, CoverageEmployee } from '@/lib/types/shift-coverage'

/**
 * Sync Button Component with loading state
 * Uses useFormStatus to show spinner during server-side sync
 */
function SyncButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      className="flex-1 md:flex-none"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${pending ? 'animate-spin' : ''}`} />
      <span className="hidden sm:inline">{pending ? 'Synchronisiere...' : 'Sync'}</span>
      <span className="sm:hidden">{pending ? '...' : 'Sync'}</span>
    </Button>
  )
}

interface MaydayToken {
  id: string
  action_type: 'shift' | 'cancel'
  confirmed: boolean
  confirmed_at: string | null
  created_at: string
  shift_applied: boolean
}

interface RebookToken {
  id: string
  used: boolean
  used_at: string | null
}

interface CalendarEvent {
  id: string
  title: string
  description: string | null
  event_type?: 'booking' | 'fi_assignment' | 'blocker'
  customer_first_name: string
  customer_last_name: string
  customer_phone: string | null
  customer_email: string | null
  start_time: string
  end_time: string
  duration: number
  location: string
  status: string
  sync_status: string
  google_event_id: string | null
  assigned_instructor_name?: string
  assigned_instructor_number?: string
  assigned_instructor_id?: string
  is_all_day?: boolean
  actual_work_start_time?: string
  actual_work_end_time?: string
  // Pending shift fields (for deferred shift until customer confirms)
  pending_start_time?: string | null
  pending_end_time?: string | null
  shift_notified_at?: string | null
  shift_reason?: string | null
  // Rebook tracking
  rebooked_at?: string | null
  rebooked_event_id?: string | null
  // Video & Payment
  has_video_recording?: boolean
  on_site_payment_amount?: number | null
  // MAYDAY tokens (joined data)
  mayday_tokens?: MaydayToken[]
  rebook_token?: RebookToken | null
}

interface LastSync {
  completed_at: string
  events_imported: number
  events_exported: number
  events_updated: number
  status: string
}

interface CalendarViewProps {
  events: CalendarEvent[]
  lastSync: LastSync | null
  userName: string
  syncAction?: () => Promise<void>
  isReadOnly?: boolean
  canConfirmShift?: boolean
}

export function CalendarView({ events: initialEvents, lastSync, userName, syncAction, isReadOnly = false, canConfirmShift = false }: CalendarViewProps) {
  const router = useRouter()
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isLoadingMonth, setIsLoadingMonth] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [showFINames, setShowFINames] = useState(true)
  const [showBlockers, setShowBlockers] = useState(true)

  // Shift Coverage State
  const [isShiftCoverageDialogOpen, setIsShiftCoverageDialogOpen] = useState(false)
  const [shiftCoverageRequests, setShiftCoverageRequests] = useState<ShiftCoverageRequestWithRelations[]>([])
  const [coverageEmployees, setCoverageEmployees] = useState<CoverageEmployee[]>([])

  // Load shift coverage requests and employees
  useEffect(() => {
    if (!isReadOnly) {
      loadShiftCoverageRequests()
      loadCoverageEmployees()
    }
  }, [isReadOnly])

  const loadShiftCoverageRequests = async () => {
    try {
      const requests = await getShiftCoverageRequests()
      setShiftCoverageRequests(requests)
    } catch (error) {
      console.error('Error loading shift coverage requests:', error)
    }
  }

  const loadCoverageEmployees = async () => {
    try {
      const employees = await getActiveEmployeesForCoverage()
      setCoverageEmployees(employees)
    } catch (error) {
      console.error('Error loading coverage employees:', error)
    }
  }

  // Show sync result toast based on URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const syncSuccess = params.get('syncSuccess')

    if (syncSuccess === 'true') {
      const imported = params.get('imported') || '0'
      const exported = params.get('exported') || '0'
      const updated = params.get('updated') || '0'
      toast.success(`Sync erfolgreich! ${imported} importiert, ${exported} exportiert, ${updated} aktualisiert`)

      // Clean URL
      window.history.replaceState({}, '', '/kalender')
    } else if (syncSuccess === 'false') {
      const error = params.get('error') || 'Unbekannter Fehler'
      toast.error(`Sync fehlgeschlagen: ${decodeURIComponent(error)}`)

      // Clean URL
      window.history.replaceState({}, '', '/kalender')
    }
  }, [])

  // Auto-refresh every 60 seconds (silent background refresh)
  useEffect(() => {
    // Skip if dialog is open (don't interrupt user while editing)
    if (isEventDialogOpen) return

    const interval = setInterval(() => {
      // Silent refresh - reload current month without loading overlay
      const year = selectedDate.getFullYear()
      const month = selectedDate.getMonth()

      getCalendarEventsByMonth(year, month)
        .then(newEvents => {
          setEvents(newEvents)
        })
        .catch(error => {
          console.error('Auto-refresh failed:', error)

          // Check if this is a Server Action deployment mismatch error
          const errorMessage = error?.message || String(error)
          if (errorMessage.includes('Failed to find Server Action')) {
            console.warn('Server Action version mismatch detected - deployment likely occurred. Reloading page in 3 seconds...')

            // Give user a moment to see what they're working on, then reload
            setTimeout(() => {
              window.location.reload()
            }, 3000)
          }
        })
    }, 60000) // 60 seconds

    return () => clearInterval(interval)
  }, [selectedDate, isEventDialogOpen])

  // Group events by date (exclude cancelled events)
  const eventsByDate = events
    .filter(event => event.status !== 'cancelled')
    .reduce((acc, event) => {
      const date = new Date(event.start_time).toDateString()
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(event)
      return acc
    }, {} as Record<string, CalendarEvent[]>)

  // Get events for current month (exclude cancelled events)
  const currentMonth = selectedDate.getMonth()
  const currentYear = selectedDate.getFullYear()
  const eventsThisMonth = events.filter(event => {
    const eventDate = new Date(event.start_time)
    return (
      eventDate.getMonth() === currentMonth &&
      eventDate.getFullYear() === currentYear &&
      event.status !== 'cancelled' // Filter out cancelled/deleted events
    )
  })

  // Filter events by selected day (if any)
  const displayedEvents = (selectedDay
    ? eventsThisMonth.filter(event => {
        const eventDate = new Date(event.start_time)
        return eventDate.toDateString() === selectedDay.toDateString()
      })
    : eventsThisMonth
  ).sort((a, b) => {
    // FI events first
    if (a.event_type === 'fi_assignment' && b.event_type !== 'fi_assignment') return -1
    if (a.event_type !== 'fi_assignment' && b.event_type === 'fi_assignment') return 1
    // Then sort by start time
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  })

  // Generate calendar days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  const firstDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const calendarDays: (number | null)[] = []
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null)
  }
  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  const handleEventClick = (event: CalendarEvent) => {
    if (isReadOnly) return
    router.push(`/kalender/${event.id}`)
  }

  const handleNewEvent = () => {
    setSelectedEvent(null)
    setIsEventDialogOpen(true)
  }

  // Manual refresh function (called after create/update/delete)
  const handleRefresh = async () => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()

    try {
      const newEvents = await getCalendarEventsByMonth(year, month)
      setEvents(newEvents)
    } catch (error) {
      console.error('Manual refresh failed:', error)
    }
  }

  const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

  const loadMonth = async (year: number, month: number) => {
    setIsLoadingMonth(true)
    setLoadProgress(0)

    // Progress simulation: 0 → 90% during fetch
    const progressInterval = setInterval(() => {
      setLoadProgress(prev => Math.min(prev + 10, 90))
    }, 100)

    try {
      const newEvents = await getCalendarEventsByMonth(year, month)
      setEvents(newEvents)
      setSelectedDay(null) // Reset selected day when changing months

      // Complete: 90% → 100%
      clearInterval(progressInterval)
      setLoadProgress(100)

      // Hide overlay after short delay
      setTimeout(() => {
        setIsLoadingMonth(false)
        setLoadProgress(0)
      }, 300)

    } catch (error) {
      clearInterval(progressInterval)
      toast.error('Fehler beim Laden der Events')
      console.error('Error loading month:', error)
      setIsLoadingMonth(false)
      setLoadProgress(0)
    }
  }

  const previousMonth = async () => {
    const newDate = new Date(currentYear, currentMonth - 1, 1)
    setSelectedDate(newDate)
    await loadMonth(newDate.getFullYear(), newDate.getMonth())
  }

  const nextMonth = async () => {
    const newDate = new Date(currentYear, currentMonth + 1, 1)
    setSelectedDate(newDate)
    await loadMonth(newDate.getFullYear(), newDate.getMonth())
  }

  return (
    <div className="space-y-7.5">
      {/* Action Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          {isReadOnly ? 'Übersicht aller Termine (nur lesend)' : 'Google Calendar Events verwalten'}
        </p>

        <div className="flex flex-col gap-2 w-full md:w-auto">
          {!isReadOnly && syncAction && (
            <div className="flex gap-2 flex-wrap">
              <form action={syncAction}>
                <SyncButton />
              </form>
              <Button onClick={handleNewEvent} className="flex-1 md:flex-none">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Neues Event</span>
                <span className="sm:hidden">Neu</span>
              </Button>
              <Button
                onClick={() => setIsShiftCoverageDialogOpen(true)}
                variant="outline"
                className="flex-1 md:flex-none border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950"
              >
                <Users className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Schicht anfragen</span>
                <span className="sm:hidden">Anfragen</span>
              </Button>
            </div>
          )}
          {!isReadOnly && !syncAction && (
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleNewEvent} className="flex-1 md:flex-none">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Neues Event</span>
                <span className="sm:hidden">Neu</span>
              </Button>
              <Button
                onClick={() => setIsShiftCoverageDialogOpen(true)}
                variant="outline"
                className="flex-1 md:flex-none border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950"
              >
                <Users className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Schicht anfragen</span>
                <span className="sm:hidden">Anfragen</span>
              </Button>
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-fi-names"
                checked={showFINames}
                onCheckedChange={(checked) => setShowFINames(checked === true)}
              />
              <Label htmlFor="show-fi-names" className="text-sm cursor-pointer">
                FI-Namen anzeigen
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-blockers"
                checked={showBlockers}
                onCheckedChange={(checked) => setShowBlockers(checked === true)}
              />
              <Label htmlFor="show-blockers" className="text-sm cursor-pointer">
                Blocker anzeigen
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Last Sync Info */}
      {!isReadOnly && lastSync && (
        <Card className="p-3 md:p-4 rounded-[10px] border-0 shadow-1 dark:shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                <span className="hidden sm:inline">Letzter Sync: </span>
                {new Date(lastSync.completed_at).toLocaleString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <span className="hidden sm:inline mx-2">•</span>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {lastSync.events_imported} imp.
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {lastSync.events_exported} exp.
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {lastSync.events_updated} akt.
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Calendar Grid - NextAdmin CalendarBox pattern */}
      <div className="w-full max-w-full rounded-[10px] bg-card shadow-1 dark:shadow-card relative">
        {/* Loading Overlay */}
        {isLoadingMonth && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-10 flex items-center justify-center rounded-[10px]">
            <div className="flex flex-col items-center gap-4">
              <Image
                src="/logo.png"
                alt="FLIGHTHOUR"
                width={128}
                height={128}
                className="object-contain"
                priority
              />
              <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#EAB308] transition-all duration-300 ease-out"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Month Navigation */}
        <div className="flex items-center justify-between px-4 sm:px-7.5 py-5">
          <button
            onClick={previousMonth}
            disabled={isLoadingMonth}
            className="flex size-9 items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50"
          >
            ←
          </button>
          <h2 className="text-lg font-bold text-foreground">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <button
            onClick={nextMonth}
            disabled={isLoadingMonth}
            className="flex size-9 items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50"
          >
            →
          </button>
        </div>

        <table className="w-full">
          <thead>
            <tr className="grid grid-cols-7 bg-foreground text-background dark:bg-dark-2 dark:text-foreground">
              {['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'].map((day, i) => (
                <th key={day} className="flex h-12 items-center justify-center p-1 text-sm font-medium sm:h-15 sm:text-base">
                  <span className="hidden sm:block">
                    {['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][i]}
                  </span>
                  <span className="sm:hidden">{day}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.ceil(calendarDays.length / 7) }, (_, weekIndex) => (
              <tr key={weekIndex} className="grid grid-cols-7">
                {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => {
                  if (day === null) {
                    return (
                      <td
                        key={`empty-${weekIndex}-${dayIndex}`}
                        className="ease h-24 border border-stroke p-2 dark:border-dark-3 md:h-32 md:p-3 xl:h-36"
                      />
                    )
                  }

                  const dayDate = new Date(currentYear, currentMonth, day)
                  const dateStr = dayDate.toDateString()
                  const dayEvents = eventsByDate[dateStr] || []
                  const isToday = dateStr === new Date().toDateString()
                  const isSelected = selectedDay && dateStr === selectedDay.toDateString()
                  const bookingEvents = dayEvents.filter(e => e.event_type !== 'fi_assignment' && e.event_type !== 'blocker')
                  const hasPendingShift = dayEvents.some(e => e.pending_start_time)

                  return (
                    <td
                      key={day}
                      onClick={() => setSelectedDay(dayDate)}
                      className={cn(
                        "ease relative h-24 cursor-pointer border border-stroke p-2 transition duration-300 dark:border-dark-3 md:h-32 md:p-3 xl:h-36",
                        isSelected
                          ? "bg-[#fbb928]/10 ring-2 ring-[#fbb928] ring-inset"
                          : isToday
                            ? "bg-[#fbb928]/5"
                            : "hover:bg-accent/50"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <span className={cn(
                          "text-sm font-medium",
                          (isSelected || isToday) ? "text-[#fbb928]" : "text-foreground"
                        )}>
                          {day}
                        </span>
                        {hasPendingShift && (
                          <span className="size-2 rounded-full bg-[#FFA70B] animate-pulse" title="Verschiebung ausstehend" />
                        )}
                      </div>

                      {/* FI Names */}
                      {showFINames && dayEvents.filter(e => e.event_type === 'fi_assignment').map(e => (
                        <div
                          key={e.id}
                          className="mt-0.5 text-[9px] sm:text-[10px] px-1 py-0.5 bg-[#B87308]/[0.12] text-[#8B5700] dark:bg-[#FFA70B]/[0.15] dark:text-[#FFB84D] rounded truncate leading-tight font-semibold"
                          title={`${e.assigned_instructor_name || ''} ${e.assigned_instructor_number ? `(${e.assigned_instructor_number})` : ''}`}
                        >
                          {e.assigned_instructor_name}
                          {e.assigned_instructor_number && ` (${e.assigned_instructor_number})`}
                        </div>
                      ))}

                      {/* Blockers */}
                      {showBlockers && dayEvents.filter(e => e.event_type === 'blocker').map(e => (
                        <div
                          key={e.id}
                          className="mt-0.5 text-[9px] sm:text-[10px] px-1 py-0.5 bg-[#B91C1C]/[0.12] text-[#991B1B] dark:bg-[#F23030]/[0.15] dark:text-[#FCA5A5] rounded truncate leading-tight font-semibold"
                          title={e.title || e.customer_first_name || 'Blocker'}
                        >
                          {e.title || e.customer_first_name || 'Blocker'}
                        </div>
                      ))}

                      {/* Booking count */}
                      {bookingEvents.length > 0 && (
                        <>
                          <div className="sm:hidden flex justify-center mt-1">
                            <span className="size-1.5 rounded-full bg-[#fbb928]" />
                          </div>
                          <div className="hidden sm:block text-[10px] text-foreground/60 font-medium mt-0.5">
                            {bookingEvents.length} {bookingEvents.length === 1 ? 'Event' : 'Events'}
                          </div>
                        </>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Events List - NextAdmin chat card style */}
      <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
        <div className="flex items-center justify-between px-4 sm:px-7.5 pt-6 pb-4">
          <h2 className="text-lg font-bold text-foreground truncate">
            {selectedDay ? (
              <>
                <span className="hidden md:inline">
                  Events am {selectedDay.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })} ({displayedEvents.length})
                </span>
                <span className="md:hidden">
                  {selectedDay.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })} ({displayedEvents.length})
                </span>
              </>
            ) : (
              <>Events diesen Monat ({eventsThisMonth.length})</>
            )}
          </h2>
          {selectedDay && (
            <button
              onClick={() => setSelectedDay(null)}
              className="shrink-0 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              <span className="hidden sm:inline">Alle anzeigen</span>
              <span className="sm:hidden">Alle</span>
            </button>
          )}
        </div>

        {displayedEvents.length === 0 ? (
          <div className="px-7.5 pb-8 text-center">
            <Calendar className="size-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {selectedDay ? 'Keine Events an diesem Tag' : 'Keine Events in diesem Monat'}
            </p>
          </div>
        ) : (
          <ul className="pb-2">
            {displayedEvents
              .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
              .map(event => {
                const startTime = new Date(event.start_time)
                const endTime = new Date(event.end_time)
                const timeStr = event.is_all_day
                  ? 'Ganztägig'
                  : `${startTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`

                const iconColor =
                  event.event_type === 'fi_assignment' ? '#FFA70B' :
                  event.event_type === 'blocker' ? '#F23030' : '#3C50E0'

                const customerName = [event.customer_first_name, event.customer_last_name].filter(Boolean).join(' ')
                const displayName =
                  event.event_type === 'fi_assignment'
                    ? (event.assigned_instructor_name || event.title || 'FI Einsatz')
                    : event.event_type === 'blocker'
                      ? (event.title || 'Blocker')
                      : (customerName || event.title || 'Buchung')

                return (
                  <li key={event.id}>
                    <button
                      onClick={() => handleEventClick(event)}
                      className="flex w-full items-center gap-4 px-4 sm:px-7.5 py-3.5 text-left outline-none hover:bg-accent/50 transition-colors"
                    >
                      {/* Event type icon */}
                      <div
                        className="flex size-11 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${iconColor}15` }}
                      >
                        <Calendar className="size-5" style={{ color: iconColor }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">{displayName}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm text-muted-foreground">{timeStr}</span>
                          {event.location && (
                            <>
                              <span className="text-muted-foreground hidden sm:inline">·</span>
                              <span className="text-sm text-muted-foreground truncate hidden sm:inline">{event.location}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Video & Payment indicators */}
                      {event.event_type === 'booking' && (
                        <div className="hidden sm:flex items-center gap-2 shrink-0">
                          {event.has_video_recording && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#8155FF]/[0.08] px-2.5 py-0.5 text-xs font-medium text-[#8155FF]">
                              <Video className="size-3.5" />
                              Video
                            </span>
                          )}
                          {(event.on_site_payment_amount ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#219653]/[0.08] px-2.5 py-0.5 text-xs font-medium text-[#219653]">
                              <Euro className="size-3.5" />
                              €{Number(event.on_site_payment_amount).toFixed(2)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Status badge */}
                      <div className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium hidden sm:block",
                        event.status === 'confirmed' ? 'bg-[#219653]/[0.08] text-[#219653]' :
                        event.status === 'tentative' ? 'bg-[#FFA70B]/[0.08] text-[#FFA70B]' :
                        event.status === 'cancelled' ? 'bg-[#F23030]/[0.08] text-[#F23030]' :
                        'bg-[#3C50E0]/[0.08] text-[#3C50E0]'
                      )}>
                        {event.status === 'confirmed' ? 'Bestätigt' :
                         event.status === 'tentative' ? 'Vorläufig' :
                         event.status === 'cancelled' ? 'Abgesagt' : event.status}
                      </div>
                    </button>
                  </li>
                )
              })}
          </ul>
        )}
      </div>

      {/* Event Dialog */}
      <EventDialog
        open={isEventDialogOpen}
        onOpenChange={setIsEventDialogOpen}
        event={null}
        onRefresh={handleRefresh}
        defaultDate={selectedDay}
      />

      {/* Shift Coverage Dialog */}
      {!isReadOnly && (
        <ShiftCoverageDialog
          open={isShiftCoverageDialogOpen}
          onOpenChange={(open) => {
            setIsShiftCoverageDialogOpen(open)
            if (!open) {
              // Reload coverage requests when dialog closes
              loadShiftCoverageRequests()
            }
          }}
          employees={coverageEmployees}
          defaultDate={selectedDay}
        />
      )}

      {/* Shift Coverage List */}
      {!isReadOnly && shiftCoverageRequests.length > 0 && (
        <div className="mt-6">
          <ShiftCoverageList requests={shiftCoverageRequests} />
        </div>
      )}
    </div>
  )
}
