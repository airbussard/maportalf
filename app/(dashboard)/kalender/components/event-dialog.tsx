'use client'

import { useState, useEffect } from 'react'
import { Calendar, User, Phone, Mail, Clock, MapPin, FileText, Loader2, Users } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getEmployees } from '@/app/actions/calendar-events'
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
  const [employees, setEmployees] = useState<any[]>([])

  // Form state
  const [formData, setFormData] = useState({
    event_type: 'booking' as 'booking' | 'fi_assignment',
    customer_first_name: '',
    customer_last_name: '',
    customer_phone: '',
    customer_email: '',
    start_time: '',
    end_time: '',
    duration: 0,
    attendee_count: 1,
    remarks: '',
    location: 'FLIGHTHOUR Flugsimulator',
    assigned_instructor_id: '',
    assigned_instructor_number: '',
    assigned_instructor_name: '',
    is_all_day: false
  })

  // Reset form when event changes
  useEffect(() => {
    if (event) {
      // Viewing/Editing existing event
      setFormData({
        event_type: event.event_type || 'booking',
        customer_first_name: event.customer_first_name || '',
        customer_last_name: event.customer_last_name || '',
        customer_phone: event.customer_phone || '',
        customer_email: event.customer_email || '',
        start_time: event.start_time ? new Date(event.start_time).toISOString().slice(0, 16) : '',
        end_time: event.end_time ? new Date(event.end_time).toISOString().slice(0, 16) : '',
        duration: event.duration || 0,
        attendee_count: event.attendee_count || 1,
        remarks: event.remarks || '',
        location: event.location || 'FLIGHTHOUR Flugsimulator',
        assigned_instructor_id: event.assigned_instructor_id || '',
        assigned_instructor_number: event.assigned_instructor_number || '',
        assigned_instructor_name: event.assigned_instructor_name || '',
        is_all_day: event.is_all_day || false
      })
    } else {
      // Creating new event - reset to defaults
      const now = new Date()
      const startTime = new Date(now.getTime() + 60 * 60 * 1000) // +1 hour
      const endTime = new Date(startTime.getTime() + 90 * 60 * 1000) // +90 minutes

      setFormData({
        event_type: 'booking',
        customer_first_name: '',
        customer_last_name: '',
        customer_phone: '',
        customer_email: '',
        start_time: startTime.toISOString().slice(0, 16),
        end_time: endTime.toISOString().slice(0, 16),
        duration: 90,
        attendee_count: 1,
        remarks: '',
        location: 'FLIGHTHOUR Flugsimulator',
        assigned_instructor_id: '',
        assigned_instructor_number: '',
        assigned_instructor_name: '',
        is_all_day: false
      })
    }
  }, [event, open])

  // Load employees for FI assignment
  useEffect(() => {
    if (open) {
      getEmployees().then(data => setEmployees(data)).catch(console.error)
    }
  }, [open])

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
      // Prepare data
      let submitData = { ...formData }

      // For all-day FI events, set dummy times (required by schema)
      if (formData.event_type === 'fi_assignment' && formData.is_all_day) {
        const today = new Date()
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0)
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0)
        submitData.start_time = startOfDay.toISOString().slice(0, 16)
        submitData.end_time = endOfDay.toISOString().slice(0, 16)
        submitData.duration = 60
      }

      if (event) {
        // Update existing event
        await updateCalendarEvent(event.id, submitData)
        toast.success('Event erfolgreich aktualisiert')
        router.refresh()
        onOpenChange(false)
      } else {
        // Create new event
        await createCalendarEvent(submitData)
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

  // All events are editable (including synced ones from Google)
  const isReadOnly = false

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
          {/* Event Type Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Event-Typ
            </Label>
            <RadioGroup
              value={formData.event_type}
              onValueChange={(value) => setFormData({...formData, event_type: value as 'booking' | 'fi_assignment'})}
              disabled={isReadOnly}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="booking" id="booking" />
                <Label htmlFor="booking" className="font-normal cursor-pointer">Buchung</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fi_assignment" id="fi" />
                <Label htmlFor="fi" className="font-normal cursor-pointer">FI-Mitarbeiter</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.event_type === 'booking' ? (
          <>
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
          </>
          ) : (
          <>
          {/* FI Assignment Fields */}
          {/* Instructor Name */}
          <div>
            <Label htmlFor="instructor_name" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Mitarbeiter *
            </Label>
            <Input
              id="instructor_name"
              value={formData.assigned_instructor_name}
              onChange={(e) => setFormData({ ...formData, assigned_instructor_name: e.target.value })}
              required={formData.event_type === 'fi_assignment'}
              disabled={isReadOnly}
              placeholder="Name eingeben..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Später: Mitarbeiter aus Liste auswählen
            </p>
          </div>

          {/* All Day Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_all_day"
              checked={formData.is_all_day}
              onCheckedChange={(checked) => setFormData({ ...formData, is_all_day: checked as boolean })}
              disabled={isReadOnly}
            />
            <Label htmlFor="is_all_day" className="font-normal cursor-pointer">
              Ganztägig
            </Label>
          </div>

          {/* Date picker for all-day events */}
          {formData.is_all_day ? (
            <div>
              <Label htmlFor="event_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Datum *
              </Label>
              <Input
                id="event_date"
                type="date"
                value={formData.start_time ? formData.start_time.split('T')[0] : ''}
                onChange={(e) => {
                  // Set start and end to the selected date with dummy times
                  const dateStr = e.target.value
                  setFormData({
                    ...formData,
                    start_time: `${dateStr}T08:00`,
                    end_time: `${dateStr}T09:00`
                  })
                }}
                required
                disabled={isReadOnly}
              />
            </div>
          ) : (
            /* Time fields for non-all-day events */
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
          )}

          {/* Remarks for FI */}
          <div>
            <Label htmlFor="fi_remarks" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Bemerkungen
            </Label>
            <Textarea
              id="fi_remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              disabled={isReadOnly}
              rows={3}
              placeholder="Zusätzliche Informationen..."
            />
          </div>
          </>
          )}

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
