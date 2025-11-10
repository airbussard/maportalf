'use client'

import { useState, useEffect } from 'react'
import { Calendar, User, Phone, Mail, Clock, MapPin, FileText, Loader2, Users, Info, Video, Euro } from 'lucide-react'
import { convertToISOWithTimezone, addSecondsToTime, isValidTimeFormat, extractLocalTimeFromISO, trimSecondsFromTime } from '@/lib/utils/timezone'
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
  onRefresh?: () => void
}

export function EventDialog({ open, onOpenChange, event, onRefresh }: EventDialogProps) {
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
    blocker_title: 'Block',
    // New fields for booking events
    booking_date: '',
    start_time_only: '',
    end_time_only: '',
    duration_mode: 'duration' as 'duration' | 'manual',
    duration_preset: 60,
    has_video_recording: false,
    on_site_payment_amount: null as number | null
  })

  // Separate state for all-day event date selection
  const [selectedDate, setSelectedDate] = useState<string>('')

  // Reset form when event changes
  useEffect(() => {
    if (event) {
      // Viewing/Editing existing event
      const startDate = event.start_time ? new Date(event.start_time).toISOString().slice(0, 10) : ''

      // Use extractLocalTimeFromISO to correctly convert UTC timestamps back to local time
      const startTimeOnly = event.start_time ? extractLocalTimeFromISO(event.start_time) : ''
      const endTimeOnly = event.end_time ? extractLocalTimeFromISO(event.end_time) : ''

      // For actual_work_start_time and actual_work_end_time: These are TIME fields (HH:MM:SS), not timestamps
      // Just trim the seconds off
      const workStartTime = event.actual_work_start_time ? trimSecondsFromTime(event.actual_work_start_time) : ''
      const workEndTime = event.actual_work_end_time ? trimSecondsFromTime(event.actual_work_end_time) : ''

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
        actual_work_start_time: workStartTime,
        actual_work_end_time: workEndTime,
        blocker_title: event.title || '',
        booking_date: startDate,
        start_time_only: startTimeOnly,
        end_time_only: endTimeOnly,
        duration_mode: 'duration',
        duration_preset: event.duration || 60,
        has_video_recording: event.has_video_recording || false,
        on_site_payment_amount: event.on_site_payment_amount || null
      })
    } else {
      // Creating new event - reset to defaults
      const now = new Date()
      const startTime = new Date(now.getTime() + 60 * 60 * 1000) // +1 hour
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // +60 minutes (1 hour default)

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
        duration: 60,
        attendee_count: 1,
        remarks: '',
        location: 'FLIGHTHOUR Flugsimulator',
        assigned_instructor_id: '',
        assigned_instructor_number: '',
        assigned_instructor_name: '',
        actual_work_start_time: '',
        actual_work_end_time: '',
        is_all_day: false,
        blocker_title: 'Block',
        booking_date: now.toISOString().slice(0, 10),
        start_time_only: startTime.toTimeString().slice(0, 5),
        end_time_only: endTime.toTimeString().slice(0, 5),
        duration_mode: 'duration',
        duration_preset: 60,
        has_video_recording: false,
        on_site_payment_amount: null
      })
    }
  }, [event, open])

  // Load employees for FI assignment
  useEffect(() => {
    if (open) {
      getEmployees().then(data => setEmployees(data)).catch(console.error)
    }
  }, [open])

  // No automatic duration calculation needed anymore - handled in submit

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Prepare data
      let submitData = { ...formData }

      // Booking Events - special handling for new date/time fields
      if (formData.event_type === 'booking') {
        // Validate date and time
        if (!formData.booking_date || !formData.start_time_only) {
          throw new Error('Bitte geben Sie Datum und Startzeit an')
        }

        // Convert to ISO with proper timezone handling
        const startISO = convertToISOWithTimezone(formData.booking_date, formData.start_time_only)

        let endISO: string
        let durationMinutes: number

        if (formData.duration_mode === 'duration') {
          // Calculate end time from duration preset
          durationMinutes = formData.duration_preset
          const startDate = new Date(startISO)
          const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000)
          endISO = endDate.toISOString()
        } else {
          // Use manual end time
          if (!formData.end_time_only) {
            throw new Error('Bitte geben Sie eine Endzeit an')
          }
          endISO = convertToISOWithTimezone(formData.booking_date, formData.end_time_only)

          // Calculate duration
          const start = new Date(startISO)
          const end = new Date(endISO)

          // Validate: end must be after start and on same day
          if (end <= start) {
            throw new Error('Endzeit muss nach der Startzeit liegen')
          }
          if (end.getDate() !== start.getDate()) {
            throw new Error('Mehrtägige Events sind nicht erlaubt. Bitte wählen Sie eine Endzeit am selben Tag.')
          }

          durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
        }

        submitData.start_time = startISO
        submitData.end_time = endISO
        submitData.duration = durationMinutes
      }
      // Blocker Events - special handling
      else if (formData.event_type === 'blocker') {
        // Validation
        if (!formData.blocker_title || formData.blocker_title.trim() === '') {
          throw new Error('Bitte geben Sie einen Titel für den Blocker ein')
        }

        // Ganztägiger Blocker (05:00-22:00)
        if (formData.is_all_day) {
          if (!selectedDate) {
            throw new Error('Bitte wählen Sie ein Datum aus')
          }
          // Convert to ISO with proper timezone handling
          submitData.start_time = convertToISOWithTimezone(selectedDate, '05:00')
          submitData.end_time = convertToISOWithTimezone(selectedDate, '22:00')
          submitData.duration = 17 * 60 // 17 Stunden in Minuten
        }
        // Mit individuellen Zeiten
        else {
          if (!formData.start_time || !formData.end_time) {
            throw new Error('Bitte geben Sie Start- und Endzeit an')
          }
          // Parse datetime-local values (YYYY-MM-DDTHH:MM) and convert with proper timezone
          const [startDate, startTime] = formData.start_time.split('T')
          const [endDate, endTime] = formData.end_time.split('T')
          submitData.start_time = convertToISOWithTimezone(startDate, startTime)
          submitData.end_time = convertToISOWithTimezone(endDate, endTime)
        }

        // Store title in title field for blocker
        submitData.customer_first_name = formData.blocker_title
        submitData.customer_last_name = ''
        // Blockers don't have actual work times (empty string will be converted to null by sanitizeTimeFields)
        submitData.actual_work_start_time = ''
        submitData.actual_work_end_time = ''
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
          // Convert to ISO with proper timezone handling
          submitData.start_time = convertToISOWithTimezone(selectedDate, '08:00')
          submitData.end_time = convertToISOWithTimezone(selectedDate, '09:00')
          submitData.duration = 60
          // All-day events don't have actual work times (empty string will be converted to null by sanitizeTimeFields)
          submitData.actual_work_start_time = ''
          submitData.actual_work_end_time = ''
        }
        // Mit Arbeitszeiten
        else {
          if (!selectedDate) {
            throw new Error('Bitte wählen Sie ein Datum aus')
          }

          // IMPROVED VALIDATION - check for empty strings AND valid time format
          if (!formData.actual_work_start_time?.trim() || !formData.actual_work_end_time?.trim()) {
            throw new Error('Bitte geben Sie Arbeitszeiten an')
          }

          // Validate time format
          if (!isValidTimeFormat(formData.actual_work_start_time) || !isValidTimeFormat(formData.actual_work_end_time)) {
            throw new Error('Ungültiges Zeitformat. Bitte verwenden Sie HH:MM')
          }

          // Use selected date with fixed 08:00-09:00 for Google Calendar (timezone-aware)
          submitData.start_time = convertToISOWithTimezone(selectedDate, '08:00')
          submitData.end_time = convertToISOWithTimezone(selectedDate, '09:00')

          // Convert HH:MM to HH:MM:SS for actual work times (stored as TIME type, not TIMESTAMP)
          submitData.actual_work_start_time = addSecondsToTime(formData.actual_work_start_time)
          submitData.actual_work_end_time = addSecondsToTime(formData.actual_work_end_time)

          // Calculate duration from actual work times
          const [startH, startM] = formData.actual_work_start_time.split(':').map(Number)
          const [endH, endM] = formData.actual_work_end_time.split(':').map(Number)
          const startMinutes = startH * 60 + startM
          const endMinutes = endH * 60 + endM
          submitData.duration = endMinutes - startMinutes

          // Additional validation: end time must be after start time
          if (submitData.duration <= 0) {
            throw new Error('Endzeit muss nach der Startzeit liegen')
          }
        }
      }

      // Remove UI-only fields that don't exist in database schema
      delete (submitData as any).blocker_title
      delete (submitData as any).booking_date
      delete (submitData as any).start_time_only
      delete (submitData as any).end_time_only
      delete (submitData as any).duration_mode
      delete (submitData as any).duration_preset

      if (event) {
        // Update existing event
        await updateCalendarEvent(event.id, submitData)
        toast.success('Event erfolgreich aktualisiert')
        onRefresh?.() // Trigger immediate refresh in parent
        router.refresh()
        onOpenChange(false)
      } else {
        // Create new event
        await createCalendarEvent(submitData)
        toast.success('Event erfolgreich erstellt')
        onRefresh?.() // Trigger immediate refresh in parent
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
      onRefresh?.() // Trigger immediate refresh in parent
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
              onValueChange={(value) => {
                const newType = value as 'booking' | 'fi_assignment' | 'blocker'
                setFormData({
                  ...formData,
                  event_type: newType,
                  blocker_title: newType === 'blocker' && !formData.blocker_title ? 'Block' : formData.blocker_title
                })
              }}
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

          {/* Date Field - Booking events only */}
          <div>
            <Label htmlFor="booking_date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Datum *
            </Label>
            <Input
              id="booking_date"
              type="date"
              value={formData.booking_date}
              onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
              required
              disabled={isReadOnly}
            />
          </div>

          {/* Time Mode Selection */}
          <div className="space-y-2">
            <Label>Zeiteingabe</Label>
            <RadioGroup
              value={formData.duration_mode}
              onValueChange={(value: 'duration' | 'manual') => setFormData({ ...formData, duration_mode: value })}
              disabled={isReadOnly}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="duration" id="duration-mode" />
                <Label htmlFor="duration-mode" className="font-normal cursor-pointer">Startzeit + Dauer</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual-mode" />
                <Label htmlFor="manual-mode" className="font-normal cursor-pointer">Startzeit + Endzeit</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Time Fields based on mode */}
          {formData.duration_mode === 'duration' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time_only" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Startzeit *
                </Label>
                <Input
                  id="start_time_only"
                  type="time"
                  value={formData.start_time_only}
                  onChange={(e) => setFormData({ ...formData, start_time_only: e.target.value })}
                  required
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <Label htmlFor="duration_preset">Dauer *</Label>
                <Select
                  value={formData.duration_preset.toString()}
                  onValueChange={(value) => setFormData({ ...formData, duration_preset: parseInt(value) })}
                  disabled={isReadOnly}
                >
                  <SelectTrigger id="duration_preset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 Minuten</SelectItem>
                    <SelectItem value="60">1 Stunde</SelectItem>
                    <SelectItem value="120">2 Stunden</SelectItem>
                    <SelectItem value="180">3 Stunden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time_only_manual" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Startzeit *
                </Label>
                <Input
                  id="start_time_only_manual"
                  type="time"
                  value={formData.start_time_only}
                  onChange={(e) => setFormData({ ...formData, start_time_only: e.target.value })}
                  required
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <Label htmlFor="end_time_only">Endzeit *</Label>
                <Input
                  id="end_time_only"
                  type="time"
                  value={formData.end_time_only}
                  onChange={(e) => setFormData({ ...formData, end_time_only: e.target.value })}
                  required
                  disabled={isReadOnly}
                />
              </div>
            </div>
          )}

          {/* Attendees */}
          <div>
            <Label htmlFor="attendee_count" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Anzahl Personen
            </Label>
            <Input
              id="attendee_count"
              type="number"
              min="1"
              value={formData.attendee_count}
              onChange={(e) => setFormData({ ...formData, attendee_count: parseInt(e.target.value) || 1 })}
              disabled={isReadOnly}
            />
          </div>

          {/* New Fields: Video Recording & Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2 pt-8">
              <Checkbox
                id="has_video_recording"
                checked={formData.has_video_recording}
                onCheckedChange={(checked) => setFormData({ ...formData, has_video_recording: checked as boolean })}
                disabled={isReadOnly}
              />
              <Label htmlFor="has_video_recording" className="font-normal cursor-pointer flex items-center gap-2">
                <Video className="h-4 w-4" />
                Videoaufnahme gebucht
              </Label>
            </div>
            <div>
              <Label htmlFor="on_site_payment_amount" className="flex items-center gap-2">
                <Euro className="h-4 w-4" />
                Vor Ort zu zahlen (EUR)
              </Label>
              <Input
                id="on_site_payment_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.on_site_payment_amount || ''}
                onChange={(e) => setFormData({ ...formData, on_site_payment_amount: e.target.value ? parseFloat(e.target.value) : null })}
                disabled={isReadOnly}
                placeholder="0.00"
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
                    value={formData.actual_work_start_time || ''}
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
                    value={formData.actual_work_end_time || ''}
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
