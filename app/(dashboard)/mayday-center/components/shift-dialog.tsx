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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Clock, Mail, Phone, Loader2, ArrowRight, AlertTriangle } from 'lucide-react'
import { ReasonSelector, MaydayReason, MAYDAY_REASONS } from './reason-selector'
import { shiftEvents } from '@/app/actions/mayday-actions'
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

interface ShiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  events: CalendarEvent[]
  onSuccess: () => void
}

export function ShiftDialog({ open, onOpenChange, events, onSuccess }: ShiftDialogProps) {
  const [shiftHours, setShiftHours] = useState<number>(0)
  const [shiftMinutes, setShiftMinutes] = useState<number>(30)
  const [reason, setReason] = useState<MaydayReason>('technical_issue')
  const [reasonNote, setReasonNote] = useState('')
  const [sendNotifications, setSendNotifications] = useState(true)
  const [sendSMS, setSendSMS] = useState(true)
  const [loading, setLoading] = useState(false)

  const totalMinutes = shiftHours * 60 + shiftMinutes
  const eventsWithEmail = events.filter(e => e.customer_email).length
  const eventsWithPhone = events.filter(e => e.customer_phone).length

  const handleSubmit = async () => {
    if (totalMinutes === 0) {
      toast.error('Bitte gib eine Verschiebungszeit an')
      return
    }

    setLoading(true)
    try {
      const result = await shiftEvents({
        eventIds: events.map(e => e.id),
        shiftMinutes: totalMinutes,
        reason,
        reasonNote: reason === 'other' ? reasonNote : undefined,
        sendNotifications,
        sendSMS: sendSMS && eventsWithPhone > 0
      })

      if (result.success) {
        const notifications = []
        if (sendNotifications && result.notified > 0) {
          notifications.push(`${result.notified} E-Mails`)
        }
        if (sendSMS && result.smsQueued > 0) {
          notifications.push(`${result.smsQueued} SMS`)
        }
        toast.success(`${result.shifted} Termine um ${formatDuration(totalMinutes)} verschoben`, {
          description: notifications.length > 0
            ? `Benachrichtigungen: ${notifications.join(', ')}`
            : undefined
        })
        onOpenChange(false)
        onSuccess()
        // Reset form
        setShiftHours(0)
        setShiftMinutes(30)
        setReason('technical_issue')
        setReasonNote('')
      } else {
        toast.error('Fehler beim Verschieben', {
          description: result.error
        })
      }
    } catch (error) {
      console.error('Shift error:', error)
      toast.error('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m} Minuten`
    if (m === 0) return `${h} ${h === 1 ? 'Stunde' : 'Stunden'}`
    return `${h}h ${m}min`
  }

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: de })
  }

  const calculateNewTime = (startTime: string) => {
    const date = new Date(startTime)
    date.setMinutes(date.getMinutes() + totalMinutes)
    return format(date, 'HH:mm', { locale: de })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Termine verschieben
          </DialogTitle>
          <DialogDescription>
            Verschiebe {events.length} {events.length === 1 ? 'Termin' : 'Termine'} um eine bestimmte Zeit nach hinten.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Shift Duration */}
          <div className="space-y-3">
            <Label>Verschiebung</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={12}
                  value={shiftHours}
                  onChange={(e) => setShiftHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">Stunden</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={59}
                  step={5}
                  value={shiftMinutes}
                  onChange={(e) => setShiftMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">Minuten</span>
              </div>
            </div>
            {totalMinutes > 0 && (
              <p className="text-sm text-muted-foreground">
                Alle Termine werden um <strong>{formatDuration(totalMinutes)}</strong> nach hinten verschoben.
              </p>
            )}
          </div>

          <Separator />

          {/* Reason */}
          <ReasonSelector
            value={reason}
            onChange={setReason}
            note={reasonNote}
            onNoteChange={setReasonNote}
          />

          <Separator />

          {/* Notification Settings */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="send-notifications"
                checked={sendNotifications}
                onCheckedChange={(checked) => setSendNotifications(checked === true)}
              />
              <Label htmlFor="send-notifications" className="cursor-pointer">
                Kunden per E-Mail benachrichtigen
              </Label>
            </div>
            {sendNotifications && (
              <div className="ml-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{eventsWithEmail} Kunden erhalten eine E-Mail</span>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="send-sms"
                checked={sendSMS}
                onCheckedChange={(checked) => setSendSMS(checked === true)}
                disabled={eventsWithPhone === 0}
              />
              <Label htmlFor="send-sms" className={`cursor-pointer ${eventsWithPhone === 0 ? 'text-muted-foreground' : ''}`}>
                Kunden per SMS benachrichtigen
              </Label>
            </div>
            {sendSMS && eventsWithPhone > 0 && (
              <div className="ml-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{eventsWithPhone} Kunden erhalten eine SMS</span>
                </div>
              </div>
            )}
            {eventsWithPhone === 0 && (
              <div className="ml-6 text-sm text-muted-foreground opacity-50">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>Keine Kunden mit Telefonnummer</span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Preview */}
          <div className="space-y-3">
            <Label>Vorschau der Änderungen</Label>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {events.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg text-sm"
                >
                  <div className="flex-1 truncate">
                    {event.customer_first_name || event.customer_last_name
                      ? `${event.customer_first_name || ''} ${event.customer_last_name || ''}`.trim()
                      : event.title
                    }
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-mono">{formatTime(event.start_time)}</span>
                    <ArrowRight className="h-4 w-4" />
                    <span className="font-mono font-medium text-foreground">
                      {calculateNewTime(event.start_time)}
                    </span>
                  </div>
                </div>
              ))}
              {events.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  ... und {events.length - 5} weitere Termine
                </p>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">Achtung</p>
              <p>Diese Aktion aktualisiert die Termine auch im Google Kalender und kann nicht rückgängig gemacht werden.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={loading || totalMinutes === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verschiebe...
              </>
            ) : (
              <>
                <Clock className="mr-2 h-4 w-4" />
                {events.length} {events.length === 1 ? 'Termin' : 'Termine'} verschieben
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
