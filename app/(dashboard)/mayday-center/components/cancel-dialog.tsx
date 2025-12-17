'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { CalendarX2, Mail, Phone, Loader2, AlertTriangle, ExternalLink } from 'lucide-react'
import { ReasonSelector, MaydayReason, MAYDAY_REASONS } from './reason-selector'
import { cancelEventsWithNotification } from '@/app/actions/mayday-actions'
import { toast } from 'sonner'

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

interface CancelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  events: CalendarEvent[]
  onSuccess: () => void
}

export function CancelDialog({ open, onOpenChange, events, onSuccess }: CancelDialogProps) {
  const [reason, setReason] = useState<MaydayReason>('technical_issue')
  const [reasonNote, setReasonNote] = useState('')
  const [sendNotifications, setSendNotifications] = useState(true)
  const [offerRebooking, setOfferRebooking] = useState(true)
  const [loading, setLoading] = useState(false)

  const eventsWithEmail = events.filter(e => e.customer_email).length
  const eventsWithPhone = events.filter(e => e.customer_phone).length

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const result = await cancelEventsWithNotification({
        eventIds: events.map(e => e.id),
        reason,
        reasonNote: reason === 'other' ? reasonNote : undefined,
        sendNotifications,
        offerRebooking
      })

      if (result.success) {
        toast.success(`${result.cancelled} Termine abgesagt`, {
          description: sendNotifications
            ? `${result.notified} Benachrichtigungen gesendet`
            : undefined
        })
        onOpenChange(false)
        onSuccess()
        // Reset form
        setReason('technical_issue')
        setReasonNote('')
      } else {
        toast.error('Fehler beim Absagen', {
          description: result.error
        })
      }
    } catch (error) {
      console.error('Cancel error:', error)
      toast.error('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: de })
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'EEE, dd.MM.', { locale: de })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <CalendarX2 className="h-5 w-5" />
            Termine absagen
          </DialogTitle>
          <DialogDescription>
            Sage {events.length} {events.length === 1 ? 'Termin' : 'Termine'} ab.
            Die Termine werden in die Absagen-Liste verschoben.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Reason */}
          <ReasonSelector
            value={reason}
            onChange={setReason}
            note={reasonNote}
            onNoteChange={setReasonNote}
          />

          <Separator />

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="send-notifications"
                checked={sendNotifications}
                onCheckedChange={(checked) => setSendNotifications(checked === true)}
              />
              <Label htmlFor="send-notifications" className="cursor-pointer">
                Kunden automatisch benachrichtigen
              </Label>
            </div>

            {sendNotifications && (
              <div className="ml-6 space-y-3">
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{eventsWithEmail} Kunden erhalten eine E-Mail</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-50">
                    <Phone className="h-4 w-4" />
                    <span>{eventsWithPhone} Kunden mit Telefonnummer (SMS kommt bald)</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="offer-rebooking"
                    checked={offerRebooking}
                    onCheckedChange={(checked) => setOfferRebooking(checked === true)}
                  />
                  <Label htmlFor="offer-rebooking" className="cursor-pointer text-sm">
                    Neubuchungs-Option in E-Mail anbieten
                  </Label>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Affected Events */}
          <div className="space-y-3">
            <Label>Betroffene Termine</Label>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-sm"
                >
                  <CalendarX2 className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <div className="flex-1 truncate">
                    {event.customer_first_name || event.customer_last_name
                      ? `${event.customer_first_name || ''} ${event.customer_last_name || ''}`.trim()
                      : event.title
                    }
                  </div>
                  <div className="text-muted-foreground whitespace-nowrap">
                    {formatDate(event.start_time)} {formatTime(event.start_time)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info about Cancellations page */}
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg text-sm">
            <ExternalLink className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <p>
              Die abgesagten Termine findest du danach unter{' '}
              <span className="font-medium">Manager → Absagen</span>.
            </p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800 dark:text-red-200">
              <p className="font-medium">Achtung</p>
              <p>Diese Aktion kann nicht rückgängig gemacht werden. Die Termine werden aus dem Google Kalender entfernt.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Abbrechen
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sage ab...
              </>
            ) : (
              <>
                <CalendarX2 className="mr-2 h-4 w-4" />
                {events.length} {events.length === 1 ? 'Termin' : 'Termine'} absagen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
