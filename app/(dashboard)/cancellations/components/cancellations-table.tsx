'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  Calendar,
  User,
  Phone,
  Mail,
  Clock,
  Trash2,
  CalendarPlus,
  AlertTriangle,
  Users,
  CheckCircle2,
  Archive,
  Eye
} from 'lucide-react'
import { StatusBadge } from '@/components/nextadmin'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { permanentlyDeleteEvent, archiveCalendarEvent, manuallyConfirmCancellation } from '@/app/actions/calendar-events'
import { RescheduleDialog } from './reschedule-dialog'
import { CompensationNotice } from './compensation-notice'
import { EventDetailDialog } from './event-detail-dialog'

interface CancelledEvent {
  id: string
  event_type: string
  customer_first_name: string | null
  customer_last_name: string | null
  customer_email: string | null
  customer_phone: string | null
  start_time: string
  end_time: string
  duration: number | null
  attendee_count: number | null
  location: string | null
  remarks: string | null
  has_video_recording?: boolean
  on_site_payment_amount?: number | null
  cancelled_at: string
  cancelled_by: string | null
  cancellation_reason: 'cancelled_by_us' | 'cancelled_by_customer'
  cancellation_note?: string | null
  canceller_name?: string
  rebooked_at?: string | null
  rebooked_event_id?: string | null
  mayday_confirmed?: boolean
  mayday_confirmed_at?: string | null
  archived_at?: string | null
}

interface CancellationsTableProps {
  events: CancelledEvent[]
}

export function CancellationsTable({ events }: CancellationsTableProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'cancelled_by_us' | 'cancelled_by_customer'>('all')
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [archiveEventId, setArchiveEventId] = useState<string | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)
  const [rescheduleEvent, setRescheduleEvent] = useState<CancelledEvent | null>(null)
  const [detailEvent, setDetailEvent] = useState<CancelledEvent | null>(null)
  const [confirmingEventId, setConfirmingEventId] = useState<string | null>(null)

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true
    return event.cancellation_reason === filter
  })

  const handleDelete = async () => {
    if (!deleteEventId) return

    setIsDeleting(true)
    try {
      const result = await permanentlyDeleteEvent(deleteEventId)
      if (result.success) {
        toast.success('Termin wurde endgültig gelöscht')
        router.refresh()
      } else {
        toast.error(result.error || 'Fehler beim Löschen')
      }
    } catch (error) {
      toast.error('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setIsDeleting(false)
      setDeleteEventId(null)
    }
  }

  const handleArchive = async () => {
    if (!archiveEventId) return

    setIsArchiving(true)
    try {
      const result = await archiveCalendarEvent(archiveEventId)
      if (result.success) {
        toast.success('Termin wurde archiviert')
        router.refresh()
      } else {
        toast.error(result.error || 'Fehler beim Archivieren')
      }
    } catch (error) {
      toast.error('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setIsArchiving(false)
      setArchiveEventId(null)
    }
  }

  const handleManualConfirm = async (eventId: string) => {
    setConfirmingEventId(eventId)
    try {
      const result = await manuallyConfirmCancellation(eventId)
      if (result.success) {
        toast.success('Absage wurde manuell bestätigt')
        router.refresh()
      } else {
        toast.error(result.error || 'Fehler beim Bestätigen')
      }
    } catch (error) {
      toast.error('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setConfirmingEventId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd.MM.yyyy', { locale: de })
  }

  const formatDayName = (dateString: string) => {
    return format(new Date(dateString), 'EEEE', { locale: de })
  }

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: de })
  }

  const formatCancelledAt = (dateString: string) => {
    return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de })
  }

  const getEventTitle = (event: CancelledEvent) => {
    if (event.event_type === 'booking') {
      return `${event.customer_first_name || ''} ${event.customer_last_name || ''}`.trim() || 'Unbekannt'
    }
    return event.customer_first_name || 'Unbekannt'
  }

  const getInitials = (event: CancelledEvent) => {
    const first = event.customer_first_name?.[0]?.toUpperCase() || ''
    const last = event.customer_last_name?.[0]?.toUpperCase() || ''
    if (first || last) return `${first}${last}`
    return '?'
  }

  return (
    <>
      <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-7.5 pt-7.5 pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Abgesagte Termine</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filteredEvents.length} {filteredEvents.length === 1 ? 'Termin' : 'Termine'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
              <SelectTrigger className="w-[200px] rounded-lg border-[1.5px] border-border bg-transparent text-sm outline-none transition focus:border-[#fbb928] dark:border-dark-3 dark:bg-dark-2">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Absagen</SelectItem>
                <SelectItem value="cancelled_by_us">Von uns abgesagt</SelectItem>
                <SelectItem value="cancelled_by_customer">Vom Kunden abgesagt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        {filteredEvents.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Calendar className="mx-auto mb-4 size-12 opacity-30" />
            <p className="text-sm">Keine abgesagten Termine gefunden</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-t border-border bg-[#F7F9FC] dark:bg-dark-2 [&>th]:py-4 [&>th]:text-sm [&>th]:font-medium [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
                  <th className="pl-7.5 text-left min-w-[200px]">Kunde</th>
                  <th className="text-left min-w-[140px]">Datum</th>
                  <th className="text-left min-w-[100px]">Uhrzeit</th>
                  <th className="text-left min-w-[180px]">Grund</th>
                  <th className="text-left min-w-[160px]">Status</th>
                  <th className="pr-7.5 text-right min-w-[160px]">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr
                    key={event.id}
                    onClick={() => setDetailEvent(event)}
                    className="border-b border-border transition-colors hover:bg-accent/30 cursor-pointer"
                  >
                    {/* Kunde */}
                    <td className="py-4 pl-7.5">
                      <div className="flex items-center gap-3.5">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fbb928] text-sm font-bold text-zinc-900">
                          {getInitials(event)}
                        </div>
                        <div>
                          <h5 className="font-medium text-foreground leading-tight">
                            {getEventTitle(event)}
                          </h5>
                          {event.customer_email && (
                            <p className="mt-0.5 text-sm text-muted-foreground truncate max-w-[180px]">
                              {event.customer_email}
                            </p>
                          )}
                          {event.attendee_count && event.attendee_count > 1 && (
                            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="size-3" />
                              {event.attendee_count} Personen
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Datum */}
                    <td className="py-4">
                      <div>
                        <span className="text-sm font-medium text-foreground">{formatDate(event.start_time)}</span>
                        <p className="mt-0.5 text-xs text-muted-foreground capitalize">{formatDayName(event.start_time)}</p>
                      </div>
                    </td>

                    {/* Uhrzeit */}
                    <td className="py-4">
                      <span className="text-sm text-foreground">
                        {formatTime(event.start_time)} - {formatTime(event.end_time)}
                      </span>
                    </td>

                    {/* Grund */}
                    <td className="py-4">
                      <div className="space-y-1.5">
                        <StatusBadge
                          variant={event.cancellation_reason === 'cancelled_by_customer' ? 'error' : 'warning'}
                        >
                          {event.cancellation_reason === 'cancelled_by_us' ? 'Von uns' : 'Vom Kunden'}
                        </StatusBadge>
                        {event.cancellation_note && (
                          <p className="text-xs text-muted-foreground line-clamp-2 max-w-[180px]">
                            {event.cancellation_note}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {event.mayday_confirmed ? (
                          <StatusBadge variant="info">Bestätigt</StatusBadge>
                        ) : (
                          <StatusBadge variant="neutral">Offen</StatusBadge>
                        )}
                        {event.rebooked_at && (
                          <StatusBadge variant="success">Umgebucht</StatusBadge>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {formatCancelledAt(event.cancelled_at)}
                        {event.canceller_name && (
                          <span className="ml-1">von {event.canceller_name}</span>
                        )}
                      </p>
                    </td>

                    {/* Aktionen */}
                    <td className="py-4 pr-7.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDetailEvent(event)
                          }}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-[#fbb928]"
                          title="Details anzeigen"
                        >
                          <Eye className="size-[18px]" />
                        </button>
                        {!event.mayday_confirmed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleManualConfirm(event.id)
                            }}
                            disabled={confirmingEventId === event.id}
                            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-[#3C50E0] disabled:opacity-50"
                            title="Manuell bestätigen"
                          >
                            <CheckCircle2 className="size-[18px]" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setRescheduleEvent(event)
                          }}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-[#219653]"
                          title="Neues Datum"
                        >
                          <CalendarPlus className="size-[18px]" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setArchiveEventId(event.id)
                          }}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-[#FF9C55]"
                          title="Archivieren"
                        >
                          <Archive className="size-[18px]" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteEventId(event.id)
                          }}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-[#F23030]"
                          title="Endgültig löschen"
                        >
                          <Trash2 className="size-[18px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compensation Notice for customer cancellations */}
      {filteredEvents.some(e => e.cancellation_reason === 'cancelled_by_customer') && (
        <CompensationNotice />
      )}

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={!!archiveEventId} onOpenChange={(open) => !open && setArchiveEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-muted-foreground" />
              Termin archivieren?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Der Termin wird aus der Übersicht entfernt, bleibt aber in der Datenbank erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={isArchiving}
            >
              {isArchiving ? 'Wird archiviert...' : 'Archivieren'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEventId} onOpenChange={(open) => !open && setDeleteEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Termin endgültig löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Der Termin wird vollständig aus der Datenbank entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Wird gelöscht...' : 'Endgültig löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Dialog */}
      <RescheduleDialog
        event={rescheduleEvent}
        open={!!rescheduleEvent}
        onOpenChange={(open) => !open && setRescheduleEvent(null)}
      />

      {/* Event Detail Dialog */}
      <EventDetailDialog
        event={detailEvent}
        open={!!detailEvent}
        onOpenChange={(open) => !open && setDetailEvent(null)}
      />
    </>
  )
}
