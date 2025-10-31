'use client'

import { useState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import Image from 'next/image'
import { Calendar, Plus, RefreshCw, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { EventDialog } from './event-dialog'
import { EventCard } from './event-card'
import { getCalendarEventsByMonth } from '@/app/actions/calendar-events'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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
}

export function CalendarView({ events: initialEvents, lastSync, userName, syncAction, isReadOnly = false }: CalendarViewProps) {
  const router = useRouter()
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isLoadingMonth, setIsLoadingMonth] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [showFINames, setShowFINames] = useState(true)
  const [showBlockers, setShowBlockers] = useState(true)

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

  const calendarDays = []
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null)
  }
  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  const handleEventClick = (event: CalendarEvent) => {
    // In read-only mode, don't open the dialog
    if (isReadOnly) return

    setSelectedEvent(event)
    setIsEventDialogOpen(true)
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
  const weekDays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            {isReadOnly ? 'Mein Kalender' : 'Kalender'}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {isReadOnly ? 'Übersicht aller Termine (nur lesend)' : 'Google Calendar Events verwalten'}
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full md:w-auto">
          {!isReadOnly && syncAction && (
            <div className="flex gap-2">
              <form action={syncAction}>
                <SyncButton />
              </form>
              <Button onClick={handleNewEvent} className="flex-1 md:flex-none">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Neues Event</span>
                <span className="sm:hidden">Neu</span>
              </Button>
            </div>
          )}
          {!isReadOnly && !syncAction && (
            <Button onClick={handleNewEvent} className="flex-1 md:flex-none">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Neues Event</span>
              <span className="sm:hidden">Neu</span>
            </Button>
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
        <Card className="p-3 md:p-4">
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

      {/* Calendar Grid */}
      <Card className="p-3 sm:p-4 md:p-6 relative">
        {/* Loading Overlay */}
        {isLoadingMonth && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
            <div className="flex flex-col items-center gap-4">
              {/* Flighthour Logo */}
              <Image
                src="/logo.png"
                alt="FLIGHTHOUR"
                width={128}
                height={128}
                className="object-contain"
                priority
              />

              {/* Gelber Fortschrittsbalken */}
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
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={previousMonth}
            className="h-9 w-9 p-0"
            disabled={isLoadingMonth}
          >
            ←
          </Button>
          <h2 className="text-base sm:text-lg md:text-xl font-semibold">
            <span className="hidden sm:inline">{monthNames[currentMonth]} {currentYear}</span>
            <span className="sm:hidden">{monthNames[currentMonth].slice(0, 3)} {currentYear}</span>
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={nextMonth}
            className="h-9 w-9 p-0"
            disabled={isLoadingMonth}
          >
            →
          </Button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground p-1 sm:p-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />
            }

            const dayDate = new Date(currentYear, currentMonth, day)
            const dateStr = dayDate.toDateString()
            const dayEvents = eventsByDate[dateStr] || []
            const isToday = dateStr === new Date().toDateString()
            const isSelected = selectedDay && dateStr === selectedDay.toDateString()
            // Only count booking events (exclude FI events and blockers from count)
            const bookingEvents = dayEvents.filter(e => e.event_type !== 'fi_assignment' && e.event_type !== 'blocker')

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(dayDate)}
                className={`aspect-square border rounded-md sm:rounded-lg p-1 sm:p-2 ${
                  isSelected
                    ? 'border-primary bg-primary/20 ring-1 sm:ring-2 ring-primary'
                    : isToday
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                } hover:bg-accent transition-colors cursor-pointer`}
              >
                <div className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${isSelected || isToday ? 'text-primary' : ''}`}>
                  {day}
                </div>
                {/* FI Names when checkbox is enabled - always show if present */}
                {showFINames && dayEvents.some(e => e.event_type === 'fi_assignment') && (
                  <div className="mt-1 space-y-0.5 max-h-16 overflow-y-auto">
                    {dayEvents
                      .filter(e => e.event_type === 'fi_assignment')
                      .map(e => (
                        <div
                          key={e.id}
                          className="text-[9px] sm:text-[10px] px-1 py-0.5 bg-[#FCD34D]/30 border border-[#FCD34D]/50 rounded truncate leading-tight"
                          title={`${e.assigned_instructor_name} ${e.assigned_instructor_number ? `(${e.assigned_instructor_number})` : ''}`}
                        >
                          {e.assigned_instructor_name}
                          {e.assigned_instructor_number && ` (${e.assigned_instructor_number})`}
                        </div>
                      ))
                    }
                  </div>
                )}
                {/* Blocker when checkbox is enabled - always show if present */}
                {showBlockers && dayEvents.some(e => e.event_type === 'blocker') && (
                  <div className="mt-1 space-y-0.5 max-h-16 overflow-y-auto">
                    {dayEvents
                      .filter(e => e.event_type === 'blocker')
                      .map(e => (
                        <div
                          key={e.id}
                          className="text-[9px] sm:text-[10px] px-1 py-0.5 bg-red-500/30 border border-red-500/50 rounded truncate leading-tight"
                          title={e.title || e.customer_first_name || 'Blocker'}
                        >
                          {e.title || e.customer_first_name || 'Blocker'}
                        </div>
                      ))
                    }
                  </div>
                )}
                {/* Event count displayed last - after FI names and blockers */}
                {bookingEvents.length > 0 && (
                  <>
                    {/* Mobile: Show dot indicator */}
                    <div className="sm:hidden flex justify-center mt-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                    </div>
                    {/* Desktop: Show event count */}
                    <div className="hidden sm:block text-xs text-muted-foreground mt-1">
                      {bookingEvents.length} {bookingEvents.length === 1 ? 'Event' : 'Events'}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Upcoming Events List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold truncate">
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
              <>
                <span className="hidden sm:inline">Events diesen Monat ({eventsThisMonth.length})</span>
                <span className="sm:hidden">Events ({eventsThisMonth.length})</span>
              </>
            )}
          </h2>
          {selectedDay && (
            <Button variant="outline" size="sm" onClick={() => setSelectedDay(null)} className="flex-shrink-0">
              <span className="hidden sm:inline">Alle anzeigen</span>
              <span className="sm:hidden">Alle</span>
            </Button>
          )}
        </div>
        {displayedEvents.length === 0 ? (
          <Card className="p-6 sm:p-8 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
            <p className="text-sm sm:text-base">{selectedDay ? 'Keine Events an diesem Tag' : 'Keine Events in diesem Monat'}</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {displayedEvents
              .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
              .map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => handleEventClick(event)}
                />
              ))}
          </div>
        )}
      </div>

      {/* Event Dialog */}
      <EventDialog
        open={isEventDialogOpen}
        onOpenChange={setIsEventDialogOpen}
        event={selectedEvent}
        onRefresh={handleRefresh}
      />
    </div>
  )
}
