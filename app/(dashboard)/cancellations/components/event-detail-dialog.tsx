'use client'

import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  Calendar,
  User,
  Phone,
  Mail,
  Clock,
  MapPin,
  Users,
  Video,
  Euro,
  FileText,
  CalendarX2,
  UserCheck
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

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
}

interface EventDetailDialogProps {
  event: CancelledEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EventDetailDialog({ event, open, onOpenChange }: EventDetailDialogProps) {
  if (!event) return null

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'EEEE, dd. MMMM yyyy', { locale: de })
  }

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: de })
  }

  const formatCancelledAt = (dateString: string) => {
    return format(new Date(dateString), 'dd.MM.yyyy \'um\' HH:mm \'Uhr\'', { locale: de })
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-'
    if (minutes < 60) return `${minutes} Minuten`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) return `${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`
    return `${hours}:${mins.toString().padStart(2, '0')} Stunden`
  }

  const customerName = event.event_type === 'booking'
    ? `${event.customer_first_name || ''} ${event.customer_last_name || ''}`.trim() || 'Unbekannt'
    : event.customer_first_name || 'Unbekannt'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarX2 className="h-5 w-5 text-orange-500" />
            Abgesagter Termin - Details
          </DialogTitle>
          <DialogDescription>
            Vollständige Informationen zum abgesagten Termin
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Info Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Kundendaten
            </h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{customerName}</span>
              </div>
              {event.customer_email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${event.customer_email}`} className="text-primary hover:underline">
                    {event.customer_email}
                  </a>
                </div>
              )}
              {event.customer_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${event.customer_phone}`} className="text-primary hover:underline">
                    {event.customer_phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          <hr className="border-border" />

          {/* Event Details Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Termin-Details
            </h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(event.start_time)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{formatTime(event.start_time)} - {formatTime(event.end_time)} Uhr ({formatDuration(event.duration)})</span>
              </div>
              {event.attendee_count && event.attendee_count > 0 && (
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{event.attendee_count} {event.attendee_count === 1 ? 'Person' : 'Personen'}</span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{event.location}</span>
                </div>
              )}
              {event.has_video_recording && (
                <div className="flex items-center gap-3">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <span>Videoaufnahme gebucht</span>
                </div>
              )}
              {event.on_site_payment_amount && event.on_site_payment_amount > 0 && (
                <div className="flex items-center gap-3">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  <span>Vor Ort zu zahlen: {event.on_site_payment_amount.toFixed(2)} €</span>
                </div>
              )}
              {event.remarks && (
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm text-muted-foreground">Bemerkungen:</span>
                    <p className="text-sm mt-1">{event.remarks}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <hr className="border-border" />

          {/* Cancellation Info Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Absage-Informationen
            </h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <CalendarX2 className="h-4 w-4 text-muted-foreground" />
                <span>Abgesagt am {formatCancelledAt(event.cancelled_at)}</span>
              </div>
              <div className="flex items-center gap-3">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <span>Abgesagt von: {event.canceller_name || 'System'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Grund:</span>
                <Badge
                  variant={event.cancellation_reason === 'cancelled_by_customer' ? 'destructive' : 'secondary'}
                >
                  {event.cancellation_reason === 'cancelled_by_us' ? 'Von uns abgesagt' : 'Vom Kunden abgesagt'}
                </Badge>
              </div>
              {event.cancellation_note && (
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Begründung:</span>
                  <p className="text-sm mt-1">{event.cancellation_note}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
