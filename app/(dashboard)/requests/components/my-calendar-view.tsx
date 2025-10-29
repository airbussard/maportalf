'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EventCard } from '@/app/(dashboard)/kalender/components/event-card'
import { getCalendarEventsByMonth } from '@/app/actions/calendar-events'
import { toast } from 'sonner'

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

interface MyCalendarViewProps {
  userId: string
  userName: string
}

export function MyCalendarView({ userId, userName }: MyCalendarViewProps) {
  const [isLoadingMonth, setIsLoadingMonth] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])

  // Load initial month events
  useEffect(() => {
    loadMonth(selectedDate.getFullYear(), selectedDate.getMonth())
  }, [])

  // Group events by date (exclude cancelled events, show all FI events)
  const eventsByDate = events
    .filter(event => event.status !== 'cancelled' && event.event_type === 'fi_assignment')
    .reduce((acc, event) => {
      const date = new Date(event.start_time).toDateString()
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(event)
      return acc
    }, {} as Record<string, CalendarEvent[]>)

  // Get events for current month (only FI events)
  const currentMonth = selectedDate.getMonth()
  const currentYear = selectedDate.getFullYear()
  const eventsThisMonth = events.filter(event => {
    const eventDate = new Date(event.start_time)
    return (
      eventDate.getMonth() === currentMonth &&
      eventDate.getFullYear() === currentYear &&
      event.status !== 'cancelled' &&
      event.event_type === 'fi_assignment'
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
            Mein Kalender
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Übersicht Ihrer FI-Einsätze (nur lesend)
          </p>
        </div>
      </div>

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

            // Check if user has FI events on this day
            const userEventsOnDay = dayEvents.filter(e => e.assigned_instructor_id === userId)
            const hasUserEvents = userEventsOnDay.length > 0

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
                    {/* Show user's name ONLY on days they have FI events */}
                    {hasUserEvents && (
                      <div className="mt-1 space-y-0.5 max-h-16 overflow-y-auto">
                        <div
                          className="text-[9px] sm:text-[10px] px-1 py-0.5 bg-[#FCD34D]/30 border border-[#FCD34D]/50 rounded truncate leading-tight"
                          title={userName}
                        >
                          {userName}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Upcoming Events List (Read-only) */}
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
                <span className="hidden sm:inline">FI-Events diesen Monat ({eventsThisMonth.length})</span>
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
            <p className="text-sm sm:text-base">{selectedDay ? 'Keine FI-Events an diesem Tag' : 'Keine FI-Events in diesem Monat'}</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {displayedEvents
              .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
              .map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
