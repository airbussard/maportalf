'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Clock, CalendarX2, Bell, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react'
import { ShowcaseSection } from '@/components/nextadmin'
import { EventList } from './event-list'
import { ShiftDialog } from './shift-dialog'
import { CancelDialog } from './cancel-dialog'
import { getUpcomingBookings } from '@/app/actions/mayday-actions'

interface CalendarEvent {
  id: string
  event_type: string
  title: string
  start_time: string
  end_time: string
  customer_first_name: string | null
  customer_last_name: string | null
  customer_email: string | null
  customer_phone: string | null
  attendee_count: number | null
  location: string | null
}

type ActionMode = 'shift' | 'cancel' | null

export function MaydayDashboard() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [actionMode, setActionMode] = useState<ActionMode>(null)
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  // Filter states
  const [filterDate, setFilterDate] = useState<'today' | 'tomorrow' | 'week' | 'custom'>('today')
  const [filterFromTime, setFilterFromTime] = useState<string>('')
  const [customDate, setCustomDate] = useState<Date | null>(null)

  const loadEvents = async () => {
    setLoading(true)
    try {
      // Use format() to preserve local date (toISOString converts to UTC which shifts the day!)
      const customDateStr = customDate ? format(customDate, 'yyyy-MM-dd') : undefined
      const result = await getUpcomingBookings(filterDate, filterFromTime || undefined, customDateStr)
      if (result.success && result.events) {
        setEvents(result.events)
      }
    } catch (error) {
      console.error('Failed to load events:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [filterDate, filterFromTime, customDate])

  const handleSelectAll = () => {
    if (selectedEvents.length === events.length) {
      setSelectedEvents([])
    } else {
      setSelectedEvents(events.map(e => e.id))
    }
  }

  const handleSelectEvent = (eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    )
  }

  const selectedEventObjects = events.filter(e => selectedEvents.includes(e.id))

  const stats = {
    total: events.length,
    withEmail: events.filter(e => e.customer_email).length,
    withPhone: events.filter(e => e.customer_phone).length,
    selected: selectedEvents.length
  }

  return (
    <div className="space-y-6">
      {/* Action Cards */}
      <div className="grid gap-4 md:grid-cols-3 2xl:gap-7.5">
        <div className="rounded-[10px] bg-orange-50 px-7.5 py-6 shadow-1 dark:bg-orange-950/20 dark:shadow-card">
          <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 mb-1">
            <Clock className="h-5 w-5" />
            <h3 className="font-semibold">Termine verschieben</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Verschiebe ausgewählte Termine um eine bestimmte Zeit
          </p>
          <Button
            className="w-full"
            variant="outline"
            disabled={selectedEvents.length === 0}
            onClick={() => setShiftDialogOpen(true)}
          >
            {selectedEvents.length > 0
              ? `${selectedEvents.length} Termine verschieben`
              : 'Termine auswählen'
            }
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-[10px] bg-red-50 px-7.5 py-6 shadow-1 dark:bg-red-950/20 dark:shadow-card">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-1">
            <CalendarX2 className="h-5 w-5" />
            <h3 className="font-semibold">Termine absagen</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Sage ausgewählte Termine ab und benachrichtige Kunden
          </p>
          <Button
            className="w-full"
            variant="outline"
            disabled={selectedEvents.length === 0}
            onClick={() => setCancelDialogOpen(true)}
          >
            {selectedEvents.length > 0
              ? `${selectedEvents.length} Termine absagen`
              : 'Termine auswählen'
            }
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-[10px] bg-card px-7.5 py-6 shadow-1 dark:shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="h-5 w-5" />
            <h3 className="font-semibold">Status</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Übersicht der ausgewählten Termine
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gesamt:</span>
              <span className="font-medium">{stats.total} Termine</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mit E-Mail:</span>
              <span className="font-medium">{stats.withEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mit Telefon:</span>
              <span className="font-medium">{stats.withPhone}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">Ausgewählt:</span>
              <span className="font-bold text-primary">{stats.selected}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      {selectedEvents.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>{selectedEvents.length} Termine ausgewählt.</strong> Diese Aktion kann nicht rückgängig gemacht werden.
            Kunden werden automatisch benachrichtigt.
          </p>
        </div>
      )}

      {/* Event List */}
      <ShowcaseSection title="Termine">
        <p className="text-sm text-muted-foreground -mt-2 mb-4">
          Wähle die Termine aus, die du verschieben oder absagen möchtest
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <EventList
            events={events}
            selectedEvents={selectedEvents}
            onSelectEvent={handleSelectEvent}
            onSelectAll={handleSelectAll}
            filterDate={filterDate}
            onFilterDateChange={setFilterDate}
            filterFromTime={filterFromTime}
            onFilterFromTimeChange={setFilterFromTime}
            customDate={customDate}
            onCustomDateChange={setCustomDate}
          />
        )}
      </ShowcaseSection>

      {/* Dialogs */}
      <ShiftDialog
        open={shiftDialogOpen}
        onOpenChange={setShiftDialogOpen}
        events={selectedEventObjects}
        onSuccess={() => {
          setSelectedEvents([])
          loadEvents()
        }}
      />

      <CancelDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        events={selectedEventObjects}
        onSuccess={() => {
          setSelectedEvents([])
          loadEvents()
        }}
      />
    </div>
  )
}
