'use client'

import { useState, useEffect } from 'react'
import { Calendar, User, Phone, Mail, Clock, MapPin, FileText, Loader2, Users, Info } from 'lucide-react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
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
    event_type: 'booking' as 'booking' | 'fi_assignment' | 'blocker',
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
    is_all_day: false,
    actual_work_start_time: '',
    actual_work_end_time: '',
    blocker_title: ''
  })

  // Separate state for all-day event date selection
  const [selectedDate, setSelectedDate] = useState<string>('')

  // Reset form when event changes
  useEffect(() => {
    if (event) {
      // Viewing/Editing existing event
      const startDate = event.start_time ? new Date(event.start_time).toISOString().slice(0, 10) : ''
      setSelectedDate(startDate)

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
        is_all_day: event.is_all_day || false,
        actual_work_start_time: event.actual_work_start_time || '',
        actual_work_end_time: event.actual_work_end_time || '',
        blocker_title: event.title || ''
      })
    } else {
      // Creating new event - reset to defaults
      const now = new Date()
      const startTime = new Date(now.getTime() + 60 * 60 * 1000) // +1 hour
      const endTime = new Date(startTime.getTime() + 90 * 60 * 1000) // +90 minutes

      // Initialize selectedDate with today
      setSelectedDate(now.toISOString().slice(0, 10))

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
        actual_work_start_time: '',
        actual_work_end_time: '',
        is_all_day: false,
        blocker_title: ''
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

      // Blocker Events - special handling
      if (formData.event_type === 'blocker') {
        // Validation
        if (!formData.blocker_title || formData.blocker_title.trim() === '') {
          throw new Error('Bitte geben Sie einen Titel für den Blocker ein')
        }

        // Ganztägiger Blocker (05:00-22:00)
        if (formData.is_all_day) {
          if (!selectedDate) {
            throw new Error('Bitte wählen Sie ein Datum aus')
          }
          submitData.start_time = `${selectedDate}T05:00:00`
          submitData.end_time = `${selectedDate}T22:00:00`
          submitData.duration = 17 * 60 // 17 Stunden in Minuten
        }
        // Mit individuellen Zeiten
        else {
          if (!formData.start_time || !formData.end_time) {
            throw new Error('Bitte geben Sie Start- und Endzeit an')
          }
          // Times already set in formData
        }

        // Store title in title field for blocker
        submitData.customer_first_name = formData.blocker_title
        submitData.customer_last_name = ''
      }
      // FI Assignment Events - special handling
      else if (formData.event_type === 'fi_assignment') {
        // Validation
        if (!formData.assigned_instructor_name) {
          throw new Error('Bitte wählen Sie einen Mitarbeiter aus')
        }

        // Ganztägiges Event
        if (formData.is_all_day) {
          if (!selectedDate) {
            throw new Error('Bitte wählen Sie ein Datum aus')
          }
          submitData.start_time = `${selectedDate}T08:00:00`
          submitData.end_time = `${selectedDate}T09:00:00`
          submitData.duration = 60
          submitData.actual_work_start_time = ''
          submitData.actual_work_end_time = ''
        }
        // Mit Arbeitszeiten
        else {
          if (!selectedDate) {
            throw new Error('Bitte wählen Sie ein Datum aus')
          }
          if (!formData.actual_work_start_time || !formData.actual_work_end_time) {
            throw new Error('Bitte geben Sie Arbeitszeiten an')
          }

          // Use selected date with fixed 08:00-09:00 for Google Calendar
          submitData.start_time = `${selectedDate}T08:00:00`
          submitData.end_time = `${selectedDate}T09:00:00`

          // Convert HH:MM to HH:MM:SS for actual work times
          submitData.actual_work_start_time = `${formData.actual_work_start_time}:00`
          submitData.actual_work_end_time = `${formData.actual_work_end_time}:00`

          // Calculate duration from actual work times
          const [startH, startM] = formData.actual_work_start_time.split(':').map(Number)
          const [endH, endM] = formData.actual_work_end_time.split(':').map(Number)
          const startMinutes = startH * 60 + startM
          const endMinutes = endH * 60 + endM
          submitData.duration = endMinutes - startMinutes
        }
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

        {/* Info Banner for request-linked events */}
        {event?.request_id && event?.event_type === 'fi_assignment' && (
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Request-verknüpft:</strong> Dieses Event wurde automatisch durch einen genehmigten Arbeitstag-Request erstellt.
              Beim Löschen wird der Request automatisch zurückgezogen.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Event Type Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Event-Typ
            </Label>
            <RadioGroup
              value={formData.event_type}
              onValueChange={(value) => setFormData({...formData, event_type: value as 'booking' | 'fi_assignment' | 'blocker'})}
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
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="blocker" id="blocker" />
                <Label htmlFor="blocker" className="font-normal cursor-pointer">Blocker</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.event_type === 'booking' ? (
          <>
          {/* Customer Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* Time Fields - Booking events only */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          ) : formData.event_type === 'fi_assignment' ? (
          <>
          {/* FI Assignment Fields */}
          {/* Instructor Name */}
          <div>
            <Label htmlFor="instructor_name" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Mitarbeiter *
            </Label>
            <Select
              value={formData.assigned_instructor_id || ''}
              onValueChange={(value) => {
                const selectedEmployee = employees.find(emp => emp.id === value)
                if (selectedEmployee) {
                  setFormData({
                    ...formData,
                    assigned_instructor_id: selectedEmployee.id,
                    assigned_instructor_name: `${selectedEmployee.first_name} ${selectedEmployee.last_name}`,
                    assigned_instructor_number: selectedEmployee.employee_number || ''
                  })
                }
              }}
              disabled={isReadOnly}
            >
              <SelectTrigger id="instructor_name">
                <SelectValue placeholder="Mitarbeiter auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                    {employee.employee_number && ` (${employee.employee_number})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.assigned_instructor_name && !formData.assigned_instructor_id && (
              <p className="text-xs text-muted-foreground mt-1">
                Hinweis: Dieser Eintrag hat keinen verknüpften Mitarbeiter. Name: {formData.assigned_instructor_name}
              </p>
            )}
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
                value={selectedDate}
                onChange={(e) => {
                  const dateStr = e.target.value
                  setSelectedDate(dateStr)
                  // Update formData with the selected date
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
            /* Actual work time fields for non-all-day FI events */
            <>
              <div>
                <Label htmlFor="event_date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Datum *
                </Label>
                <Input
                  id="event_date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    const dateStr = e.target.value
                    setSelectedDate(dateStr)
                    // Update formData with the selected date (keep 08:00-09:00 for Google)
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="actual_work_start_time" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Arbeits-Start *
                  </Label>
                  <Input
                    id="actual_work_start_time"
                    type="time"
                    value={formData.actual_work_start_time}
                    onChange={(e) => setFormData({ ...formData, actual_work_start_time: e.target.value })}
                    required
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <Label htmlFor="actual_work_end_time">Arbeits-Ende *</Label>
                  <Input
                    id="actual_work_end_time"
                    type="time"
                    value={formData.actual_work_end_time}
                    onChange={(e) => setFormData({ ...formData, actual_work_end_time: e.target.value })}
                    required
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </>
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
          ) : formData.event_type === 'blocker' ? (
          <>
          {/* Blocker Fields */}
          {/* Blocker Title */}
          <div>
            <Label htmlFor="blocker_title" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Titel *
            </Label>
            <Input
              id="blocker_title"
              value={formData.blocker_title}
              onChange={(e) => setFormData({ ...formData, blocker_title: e.target.value })}
              required
              disabled={isReadOnly}
              placeholder="z.B. Wartung, Geschlossen, Urlaub..."
            />
          </div>

          {/* All Day Checkbox for Blocker */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="blocker_all_day"
              checked={formData.is_all_day}
              onCheckedChange={(checked) => setFormData({ ...formData, is_all_day: checked as boolean })}
              disabled={isReadOnly}
            />
            <Label htmlFor="blocker_all_day" className="font-normal cursor-pointer">
              Ganztägig (05:00-22:00)
            </Label>
          </div>

          {/* Date picker or time fields */}
          {formData.is_all_day ? (
            <div>
              <Label htmlFor="blocker_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Datum *
              </Label>
              <Input
                id="blocker_date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
                disabled={isReadOnly}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="blocker_start_time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Start *
                </Label>
                <Input
                  id="blocker_start_time"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <Label htmlFor="blocker_end_time">Ende *</Label>
                <Input
                  id="blocker_end_time"
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                  disabled={isReadOnly}
                />
              </div>
            </div>
          )}

          {/* Remarks for Blocker */}
          <div>
            <Label htmlFor="blocker_remarks" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Bemerkungen
            </Label>
            <Textarea
              id="blocker_remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              disabled={isReadOnly}
              rows={3}
              placeholder="Zusätzliche Informationen..."
            />
          </div>
          </>
          ) : null}

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
