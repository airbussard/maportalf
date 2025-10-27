'use client'

import { useState, useEffect } from 'react'
import { Calendar, User, Phone, Mail, Clock, MapPin, FileText, Loader2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/app/actions/calendar-events'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface EventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: any | null
}

export function EventDialog({ open, onOpenChange, event }: EventDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    customer_first_name: '',
    customer_last_name: '',
    customer_phone: '',
    customer_email: '',
    start_time: '',
    end_time: '',
    duration: 0,
    attendee_count: 1,
    remarks: '',
    location: 'FLIGHTHOUR Flugsimulator'
  })

  // Reset form when event changes
  useEffect(() => {
    if (event) {
      // Viewing/Editing existing event
      setFormData({
        customer_first_name: event.customer_first_name || '',
        customer_last_name: event.customer_last_name || '',
        customer_phone: event.customer_phone || '',
        customer_email: event.customer_email || '',
        start_time: event.start_time ? new Date(event.start_time).toISOString().slice(0, 16) : '',
        end_time: event.end_time ? new Date(event.end_time).toISOString().slice(0, 16) : '',
        duration: event.duration || 0,
        attendee_count: event.attendee_count || 1,
        remarks: event.remarks || '',
        location: event.location || 'FLIGHTHOUR Flugsimulator'
      })
    } else {
      // Creating new event - reset to defaults
      const now = new Date()
      const startTime = new Date(now.getTime() + 60 * 60 * 1000) // +1 hour
      const endTime = new Date(startTime.getTime() + 90 * 60 * 1000) // +90 minutes

      setFormData({
        customer_first_name: '',
        customer_last_name: '',
        customer_phone: '',
        customer_email: '',
        start_time: startTime.toISOString().slice(0, 16),
        end_time: endTime.toISOString().slice(0, 16),
        duration: 90,
        attendee_count: 1,
        remarks: '',
        location: 'FLIGHTHOUR Flugsimulator'
      })
    }
  }, [event, open])

  // Calculate duration when times change
  useEffect(() => {
    if (formData.start_time && formData.end_time) {
      const start = new Date(formData.start_time)
      const end = new Date(formData.end_time)
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
      if (durationMinutes > 0) {
        setFormData(prev => ({ ...prev, duration: durationMinutes }))
      }
    }
  }, [formData.start_time, formData.end_time])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (event) {
        // Update existing event
        await updateCalendarEvent(event.id, formData)
        toast.success('Event erfolgreich aktualisiert')
        router.refresh()
        onOpenChange(false)
      } else {
        // Create new event
        await createCalendarEvent(formData)
        toast.success('Event erfolgreich erstellt')
        router.refresh()
        onOpenChange(false)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!event) return

    const confirmed = confirm('Möchten Sie dieses Event wirklich löschen?')
    if (!confirmed) return

    setIsDeleting(true)
    try {
      await deleteCalendarEvent(event.id)
      toast.success('Event erfolgreich gelöscht')
      router.refresh()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setIsDeleting(false)
    }
  }

  const isReadOnly = event && event.sync_status === 'synced'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {event ? 'Event Details' : 'Neues Event erstellen'}
          </DialogTitle>
          <DialogDescription>
            {event
              ? isReadOnly
                ? 'Dieses Event ist mit Google synchronisiert und kann nicht bearbeitet werden.'
                : 'Event bearbeiten und mit Google Calendar synchronisieren.'
              : 'Erstelle ein neues Event. Es wird automatisch mit Google Calendar synchronisiert.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Customer Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer_first_name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Vorname *
              </Label>
              <Input
                id="customer_first_name"
                value={formData.customer_first_name}
                onChange={(e) => setFormData({ ...formData, customer_first_name: e.target.value })}
                required
                disabled={isReadOnly}
                placeholder="Max"
              />
            </div>
            <div>
              <Label htmlFor="customer_last_name">Nachname *</Label>
              <Input
                id="customer_last_name"
                value={formData.customer_last_name}
                onChange={(e) => setFormData({ ...formData, customer_last_name: e.target.value })}
                required
                disabled={isReadOnly}
                placeholder="Mustermann"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer_phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefon
              </Label>
              <Input
                id="customer_phone"
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                disabled={isReadOnly}
                placeholder="+49 123 456789"
              />
            </div>
            <div>
              <Label htmlFor="customer_email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                E-Mail
              </Label>
              <Input
                id="customer_email"
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                disabled={isReadOnly}
                placeholder="max@example.com"
              />
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Start *
              </Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
                disabled={isReadOnly}
              />
            </div>
            <div>
              <Label htmlFor="end_time">Ende *</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* Duration & Attendees */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dauer</Label>
              <Input
                value={`${formData.duration} Minuten`}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="attendee_count">Anzahl Personen</Label>
              <Input
                id="attendee_count"
                type="number"
                min="1"
                value={formData.attendee_count}
                onChange={(e) => setFormData({ ...formData, attendee_count: parseInt(e.target.value) || 1 })}
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Standort
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              disabled={isReadOnly}
            />
          </div>

          {/* Remarks */}
          <div>
            <Label htmlFor="remarks" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Bemerkungen
            </Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              disabled={isReadOnly}
              rows={3}
              placeholder="Zusätzliche Informationen..."
            />
          </div>

          {/* Sync Status */}
          {event && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Badge variant={event.sync_status === 'synced' ? 'default' : 'secondary'}>
                {event.sync_status === 'synced' && '✓ Synchronisiert'}
                {event.sync_status === 'pending' && '⏳ Synchronisation ausstehend'}
                {event.sync_status === 'error' && '⚠ Synchronisationsfehler'}
              </Badge>
              {event.google_event_id && (
                <span className="text-xs text-muted-foreground">
                  Google ID: {event.google_event_id.slice(0, 8)}...
                </span>
              )}
            </div>
          )}
        </form>

        <DialogFooter className="flex gap-2">
          {event && !isReadOnly && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || isLoading}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird gelöscht...
                </>
              ) : (
                'Löschen'
              )}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {isReadOnly ? 'Schließen' : 'Abbrechen'}
          </Button>
          {!isReadOnly && (
            <Button type="submit" disabled={isLoading} onClick={handleSubmit}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird gespeichert...
                </>
              ) : event ? (
                'Aktualisieren'
              ) : (
                'Erstellen'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
