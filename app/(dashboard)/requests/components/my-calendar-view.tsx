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
  userEmployeeNumber: string | null
}

export function MyCalendarView({ userId, userName, userEmployeeNumber }: MyCalendarViewProps) {
  const [isLoadingMonth, setIsLoadingMonth] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])

  // Load initial month events
  useEffect(() => {
    loadMonth(selectedDate.getFullYear(), selectedDate.getMonth())
  }, [])

  // Debug logging for FI events filtering
  useEffect(() => {
    const fiEvents = events.filter(e => e.event_type === 'fi_assignment' && e.status !== 'cancelled')

    if (fiEvents.length > 0) {
      console.log('=== REQUESTS CALENDAR DEBUG ===')
      console.log('Your employee_number:', userEmployeeNumber || 'NULL/UNDEFINED')
      console.log('Your userId:', userId)
      console.log('Your userName:', userName)
      console.log('Total FI Events loaded:', fiEvents.length)
      console.log('FI Events Details:', fiEvents.map(e => ({
        id: e.id.slice(0, 8) + '...',
        date: new Date(e.start_time).toLocaleDateString('de-DE'),
        instructor_name: e.assigned_instructor_name || 'NULL',
        instructor_number: e.assigned_instructor_number || 'NULL',
        instructor_id: e.assigned_instructor_id || 'NULL',
        matches: {
          byNumber: e.assigned_instructor_number === userEmployeeNumber,
          byId: e.assigned_instructor_id === userId,
          byName: e.assigned_instructor_name === userName
        }
      })))

      const matchedEvents = fiEvents.filter(e =>
        (userEmployeeNumber && e.assigned_instructor_number === userEmployeeNumber) ||
        e.assigned_instructor_id === userId ||
        e.assigned_instructor_name === userName
      )
      console.log('Matched FI Events (your events):', matchedEvents.length)
    }
  }, [events, userId, userName, userEmployeeNumber])

  // Group events by date (exclude cancelled events, show all event types)
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

  // Get events for current month (all event types)
  const currentMonth = selectedDate.getMonth()
  const currentYear = selectedDate.getFullYear()
  const eventsThisMonth = events.filter(event => {
    const eventDate = new Date(event.start_time)
    return (
      eventDate.getMonth() === currentMonth &&
      eventDate.getFullYear() === currentYear &&
      event.status !== 'cancelled'
    )
  })

  // Helper: Check if FI event belongs to current user
  const isUserFIEvent = (event: CalendarEvent) => {
    if (event.event_type !== 'fi_assignment') return false

    // Match by employee number (primary) - trim and case-insensitive
    if (userEmployeeNumber && event.assigned_instructor_number) {
      const userNum = userEmployeeNumber.trim().toLowerCase()
      const eventNum = event.assigned_instructor_number.trim().toLowerCase()
      if (userNum === eventNum) return true
    }

    // Fallback: Match by ID
    if (event.assigned_instructor_id === userId) return true

    // Fallback: Match by name (trim and case-insensitive)
    if (userName && event.assigned_instructor_name) {
      const userNameTrimmed = userName.trim().toLowerCase()
      const eventNameTrimmed = event.assigned_instructor_name.trim().toLowerCase()
      if (userNameTrimmed === eventNameTrimmed) return true
    }

    return false
  }

  // Filter events by selected day (if any) - show only user's FI events
  const displayedEvents = (selectedDay
    ? eventsThisMonth.filter(event => {
        const eventDate = new Date(event.start_time)
        const isRightDay = eventDate.toDateString() === selectedDay.toDateString()
        return isRightDay && isUserFIEvent(event)
      })
    : eventsThisMonth.filter(isUserFIEvent)
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
            Übersicht aller Termine (nur lesend)
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
                {/* FI Names - only show user's own FI events */}
                {dayEvents.filter(isUserFIEvent).length > 0 && (
                  <div className="mt-1 space-y-0.5 max-h-16 overflow-y-auto">
                    {dayEvents
                      .filter(isUserFIEvent)
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
                {/* Blocker - always show if present (no checkbox) */}
                {dayEvents.some(e => e.event_type === 'blocker') && (
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
                />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
