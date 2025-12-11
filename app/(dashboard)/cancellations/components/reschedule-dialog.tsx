'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Calendar, Clock, Loader2, CalendarPlus } from 'lucide-react'
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
import { toast } from 'sonner'
import { rescheduleEvent } from '@/app/actions/calendar-events'
import { convertToISOWithTimezone } from '@/lib/utils/timezone'

interface CancelledEvent {
  id: string
  event_type: string
  customer_first_name: string | null
  customer_last_name: string | null
  start_time: string
  end_time: string
  duration: number | null
}

interface RescheduleDialogProps {
  event: CancelledEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RescheduleDialog({ event, open, onOpenChange }: RescheduleDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newStartTime, setNewStartTime] = useState('')
  const [newEndTime, setNewEndTime] = useState('')

  // Initialize with original duration when event changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && event) {
      // Set default time based on original event
      const originalStart = new Date(event.start_time)
      const originalEnd = new Date(event.end_time)
      setNewStartTime(format(originalStart, 'HH:mm'))
      setNewEndTime(format(originalEnd, 'HH:mm'))
      setNewDate('')
    }
    onOpenChange(isOpen)
  }

  const handleSubmit = async () => {
    if (!event || !newDate || !newStartTime || !newEndTime) {
      toast.error('Bitte füllen Sie alle Felder aus')
      return
    }

    setIsLoading(true)
    try {
      // Convert to ISO with timezone
      const startISO = convertToISOWithTimezone(newDate, newStartTime)
      const endISO = convertToISOWithTimezone(newDate, newEndTime)

      // Validate
      if (new Date(endISO) <= new Date(startISO)) {
        toast.error('Endzeit muss nach der Startzeit liegen')
        setIsLoading(false)
        return
      }

      const result = await rescheduleEvent(event.id, startISO, endISO)

      if (result.success) {
        toast.success('Termin wurde erfolgreich neu geplant')
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Fehler beim Neuplanen')
      }
    } catch (error) {
      toast.error('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }

  if (!event) return null

  const eventTitle = event.event_type === 'booking'
    ? `${event.customer_first_name || ''} ${event.customer_last_name || ''}`.trim() || 'Buchung'
    : event.customer_first_name || 'Event'

  const originalDate = format(new Date(event.start_time), 'EEEE, dd.MM.yyyy', { locale: de })
  const originalTime = `${format(new Date(event.start_time), 'HH:mm')} - ${format(new Date(event.end_time), 'HH:mm')} Uhr`

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Termin neu planen
          </DialogTitle>
          <DialogDescription>
            Wählen Sie ein neues Datum und neue Uhrzeiten für den abgesagten Termin.
            Der Termin wird wieder im Google Kalender erstellt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Original Event Info */}
          <div className="p-3 bg-muted rounded-lg space-y-1">
            <p className="text-sm font-medium">{eventTitle}</p>
            <p className="text-sm text-muted-foreground">
              Ursprünglich: {originalDate}
            </p>
            <p className="text-sm text-muted-foreground">
              {originalTime}
            </p>
          </div>

          {/* New Date */}
          <div>
            <Label htmlFor="new_date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Neues Datum *
            </Label>
            <Input
              id="new_date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          {/* New Times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new_start_time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Startzeit *
              </Label>
              <Input
                id="new_start_time"
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="new_end_time">Endzeit *</Label>
              <Input
                id="new_end_time"
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                className="mt-1"
                required
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !newDate || !newStartTime || !newEndTime}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Wird geplant...
              </>
            ) : (
              'Termin wiederherstellen'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
