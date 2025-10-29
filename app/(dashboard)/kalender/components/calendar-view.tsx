'use client'

import { useState } from 'react'
import { Calendar, Plus, RefreshCw, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EventDialog } from './event-dialog'
import { EventCard } from './event-card'
import { syncGoogleCalendar } from '@/app/actions/calendar-events'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface CalendarEvent {
  id: string
  title: string
  description: string | null
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
}

export function CalendarView({ events, lastSync, userName }: CalendarViewProps) {
  const router = useRouter()
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

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

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const result = await syncGoogleCalendar()
      if (result.success) {
        toast.success(`Sync erfolgreich! ${result.imported} importiert, ${result.exported} exportiert, ${result.updated} aktualisiert`)
        router.refresh()
      } else {
        toast.error('Sync fehlgeschlagen: ' + (result.errors?.[0] || 'Unbekannter Fehler'))
      }
    } catch (error) {
      toast.error('Sync fehlgeschlagen')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsEventDialogOpen(true)
  }

  const handleNewEvent = () => {
    setSelectedEvent(null)
    setIsEventDialogOpen(true)
  }

  const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
  const weekDays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

  const previousMonth = () => {
    setSelectedDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const nextMonth = () => {
    setSelectedDate(new Date(currentYear, currentMonth + 1, 1))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            Kalender
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Google Calendar Events verwalten
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={isSyncing}
            className="flex-1 md:flex-none"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Synchronisiere...' : 'Sync'}</span>
            <span className="sm:hidden">{isSyncing ? '...' : 'Sync'}</span>
          </Button>
          <Button onClick={handleNewEvent} className="flex-1 md:flex-none">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Neues Event</span>
            <span className="sm:hidden">Neu</span>
          </Button>
        </div>
      </div>

      {/* Last Sync Info */}
      {lastSync && (
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
      <Card className="p-3 sm:p-4 md:p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <Button variant="outline" size="sm" onClick={previousMonth} className="h-9 w-9 p-0">
            ←
          </Button>
          <h2 className="text-base sm:text-lg md:text-xl font-semibold">
            <span className="hidden sm:inline">{monthNames[currentMonth]} {currentYear}</span>
            <span className="sm:hidden">{monthNames[currentMonth].slice(0, 3)} {currentYear}</span>
          </h2>
          <Button variant="outline" size="sm" onClick={nextMonth} className="h-9 w-9 p-0">
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
                {dayEvents.length > 0 && (
                  <>
                    {/* Mobile: Show dot indicator */}
                    <div className="sm:hidden flex justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                    </div>
                    {/* Desktop: Show event count */}
                    <div className="hidden sm:block text-xs text-muted-foreground">
                      {dayEvents.length} {dayEvents.length === 1 ? 'Event' : 'Events'}
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
      />
    </div>
  )
}
