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
  Filter,
  AlertTriangle,
  Users,
  CheckCircle2
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { permanentlyDeleteEvent } from '@/app/actions/calendar-events'
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
}

interface CancellationsTableProps {
  events: CancelledEvent[]
}

export function CancellationsTable({ events }: CancellationsTableProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'cancelled_by_us' | 'cancelled_by_customer'>('all')
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [rescheduleEvent, setRescheduleEvent] = useState<CancelledEvent | null>(null)
  const [detailEvent, setDetailEvent] = useState<CancelledEvent | null>(null)

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

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'EEEE, dd.MM.yyyy', { locale: de })
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

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Absagen</SelectItem>
            <SelectItem value="cancelled_by_us">Von uns abgesagt</SelectItem>
            <SelectItem value="cancelled_by_customer">Vom Kunden abgesagt</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-2">
          {filteredEvents.length} {filteredEvents.length === 1 ? 'Termin' : 'Termine'}
        </span>
      </div>

      {/* Table */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Keine abgesagten Termine gefunden</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ursprüngliches Datum</TableHead>
                <TableHead>Kunde / Event</TableHead>
                <TableHead>Kontakt</TableHead>
                <TableHead>Grund</TableHead>
                <TableHead>Abgesagt am</TableHead>
                <TableHead>Abgesagt von</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => (
                <TableRow
                  key={event.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setDetailEvent(event)}
                >
                  {/* Date */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{formatDate(event.start_time)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatTime(event.start_time)} - {formatTime(event.end_time)} Uhr
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Customer */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{getEventTitle(event)}</div>
                        {event.attendee_count && event.attendee_count > 1 && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {event.attendee_count} Personen
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Contact */}
                  <TableCell>
                    <div className="space-y-1">
                      {event.customer_email && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <a href={`mailto:${event.customer_email}`} className="hover:underline">
                            {event.customer_email}
                          </a>
                        </div>
                      )}
                      {event.customer_phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <a href={`tel:${event.customer_phone}`} className="hover:underline">
                            {event.customer_phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Reason */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant={event.cancellation_reason === 'cancelled_by_customer' ? 'destructive' : 'secondary'}
                        >
                          {event.cancellation_reason === 'cancelled_by_us' ? 'Von uns' : 'Vom Kunden'}
                        </Badge>
                        {event.rebooked_at && (
                          <Badge className="bg-green-600 hover:bg-green-700 text-white">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Umgebucht
                          </Badge>
                        )}
                      </div>
                      {event.cancellation_note && (
                        <p className="text-xs text-muted-foreground line-clamp-2 max-w-[200px]">
                          {event.cancellation_note}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  {/* Cancelled At */}
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {formatCancelledAt(event.cancelled_at)}
                    </div>
                  </TableCell>

                  {/* Cancelled By */}
                  <TableCell>
                    <span className="text-sm">
                      {event.canceller_name || 'System'}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setRescheduleEvent(event)
                        }}
                      >
                        <CalendarPlus className="h-4 w-4 mr-1" />
                        Neues Datum
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteEventId(event.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Compensation Notice for customer cancellations */}
      {filteredEvents.some(e => e.cancellation_reason === 'cancelled_by_customer') && (
        <CompensationNotice />
      )}

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
    </div>
  )
}
