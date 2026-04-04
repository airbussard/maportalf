'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Calendar, User, Phone, Mail, Clock, MapPin, FileText,
  Loader2, Users, Info, Video, Euro, CalendarX2, MessageSquare
} from 'lucide-react'
import { convertToISOWithTimezone, addSecondsToTime, isValidTimeFormat, extractLocalTimeFromISO, trimSecondsFromTime } from '@/lib/utils/timezone'
import { Breadcrumb, InputGroup, TextAreaGroup, StatusBadge } from '@/components/nextadmin'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  updateCalendarEvent,
  deleteCalendarEvent,
  cancelCalendarEvent,
  resendBookingConfirmationEmail
} from '@/app/actions/calendar-events'

/**
 * Convert UTC ISO string to local datetime-local input format
 */
function formatDateTimeForInput(isoString: string): string {
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  employee_number: string | null
}

interface EventDetailProps {
  event: any
  employees: Employee[]
}

export function EventDetail({ event, employees }: EventDetailProps) {
  const router = useRouter()

  // Initialize date/time from event
  const startDate = event.start_time ? new Date(event.start_time).toISOString().slice(0, 10) : ''
  const startTimeOnly = event.start_time ? extractLocalTimeFromISO(event.start_time) : ''
  const endTimeOnly = event.end_time ? extractLocalTimeFromISO(event.end_time) : ''
  const workStartTime = event.actual_work_start_time ? trimSecondsFromTime(event.actual_work_start_time) : ''
  const workEndTime = event.actual_work_end_time ? trimSecondsFromTime(event.actual_work_end_time) : ''

  // Form state
  const [formData, setFormData] = useState({
    event_type: (event.event_type || 'booking') as 'booking' | 'fi_assignment' | 'blocker',
    customer_first_name: event.customer_first_name || '',
    customer_last_name: event.customer_last_name || '',
    customer_phone: event.customer_phone || '',
    customer_email: event.customer_email || '',
    start_time: event.start_time ? formatDateTimeForInput(event.start_time) : '',
    end_time: event.end_time ? formatDateTimeForInput(event.end_time) : '',
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
    duration_mode: 'duration' as 'duration' | 'manual',
    duration_preset: event.duration || 60,
    has_video_recording: event.has_video_recording || false,
    on_site_payment_amount: event.on_site_payment_amount || null as number | null,
  })

  const [selectedDate, setSelectedDate] = useState(startDate)

  // Action states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isResendingEmail, setIsResendingEmail] = useState(false)

  // Cancel dialog states
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState<'cancelled_by_us' | 'cancelled_by_customer'>('cancelled_by_us')
  const [cancelNote, setCancelNote] = useState('')
  const [sendCancellationEmail, setSendCancellationEmail] = useState(true)

  // Display name for breadcrumb
  const displayName = formData.event_type === 'booking'
    ? `${formData.customer_first_name} ${formData.customer_last_name}`.trim() || 'Event Details'
    : formData.event_type === 'fi_assignment'
      ? formData.assigned_instructor_name || 'FI-Mitarbeiter'
      : formData.blocker_title || 'Blocker'

  // --- Handlers ---

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      let submitData = { ...formData }

      // Booking Events
      if (formData.event_type === 'booking') {
        if (!formData.booking_date || !formData.start_time_only) {
          throw new Error('Bitte geben Sie Datum und Startzeit an')
        }

        const startISO = convertToISOWithTimezone(formData.booking_date, formData.start_time_only)
        let endISO: string
        let durationMinutes: number

        if (formData.duration_mode === 'duration') {
          durationMinutes = formData.duration_preset
          const startDateObj = new Date(startISO)
          const endDateObj = new Date(startDateObj.getTime() + durationMinutes * 60 * 1000)
          endISO = endDateObj.toISOString()
        } else {
          if (!formData.end_time_only) {
            throw new Error('Bitte geben Sie eine Endzeit an')
          }
          endISO = convertToISOWithTimezone(formData.booking_date, formData.end_time_only)
          const start = new Date(startISO)
          const end = new Date(endISO)
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
      // Blocker Events
      else if (formData.event_type === 'blocker') {
        if (!formData.blocker_title || formData.blocker_title.trim() === '') {
          throw new Error('Bitte geben Sie einen Titel für den Blocker ein')
        }

        if (formData.is_all_day) {
          if (!selectedDate) {
            throw new Error('Bitte wählen Sie ein Datum aus')
          }
          submitData.start_time = convertToISOWithTimezone(selectedDate, '05:00')
          submitData.end_time = convertToISOWithTimezone(selectedDate, '22:00')
          submitData.duration = 17 * 60
        } else {
          if (!formData.start_time || !formData.end_time) {
            throw new Error('Bitte geben Sie Start- und Endzeit an')
          }
          const [sDate, sTime] = formData.start_time.split('T')
          const [eDate, eTime] = formData.end_time.split('T')
          submitData.start_time = convertToISOWithTimezone(sDate, sTime)
          submitData.end_time = convertToISOWithTimezone(eDate, eTime)
        }

        submitData.customer_first_name = formData.blocker_title
        submitData.customer_last_name = ''
        submitData.actual_work_start_time = ''
        submitData.actual_work_end_time = ''
      }
      // FI Assignment Events
      else if (formData.event_type === 'fi_assignment') {
        if (!formData.assigned_instructor_name) {
          throw new Error('Bitte wählen Sie einen Mitarbeiter aus')
        }

        if (formData.is_all_day) {
          if (!selectedDate) {
            throw new Error('Bitte wählen Sie ein Datum aus')
          }
          submitData.start_time = convertToISOWithTimezone(selectedDate, '08:00')
          submitData.end_time = convertToISOWithTimezone(selectedDate, '09:00')
          submitData.duration = 60
          submitData.actual_work_start_time = ''
          submitData.actual_work_end_time = ''
        } else {
          if (!selectedDate) {
            throw new Error('Bitte wählen Sie ein Datum aus')
          }
          if (!formData.actual_work_start_time?.trim() || !formData.actual_work_end_time?.trim()) {
            throw new Error('Bitte geben Sie Arbeitszeiten an')
          }
          if (!isValidTimeFormat(formData.actual_work_start_time) || !isValidTimeFormat(formData.actual_work_end_time)) {
            throw new Error('Ungültiges Zeitformat. Bitte verwenden Sie HH:MM')
          }

          submitData.start_time = convertToISOWithTimezone(selectedDate, '08:00')
          submitData.end_time = convertToISOWithTimezone(selectedDate, '09:00')
          submitData.actual_work_start_time = addSecondsToTime(formData.actual_work_start_time)
          submitData.actual_work_end_time = addSecondsToTime(formData.actual_work_end_time)

          const [startH, startM] = formData.actual_work_start_time.split(':').map(Number)
          const [endH, endM] = formData.actual_work_end_time.split(':').map(Number)
          const startMinutes = startH * 60 + startM
          const endMinutes = endH * 60 + endM
          submitData.duration = endMinutes - startMinutes

          if (submitData.duration <= 0) {
            throw new Error('Endzeit muss nach der Startzeit liegen')
          }
        }
      }

      // Remove UI-only fields
      delete (submitData as any).blocker_title
      delete (submitData as any).booking_date
      delete (submitData as any).start_time_only
      delete (submitData as any).end_time_only
      delete (submitData as any).duration_mode
      delete (submitData as any).duration_preset

      await updateCalendarEvent(event.id, submitData)
      toast.success('Event erfolgreich aktualisiert')
      router.push('/kalender')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = confirm('Möchten Sie dieses Event wirklich löschen?')
    if (!confirmed) return

    setIsDeleting(true)
    try {
      await deleteCalendarEvent(event.id)
      toast.success('Event erfolgreich gelöscht')
      router.push('/kalender')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancelEvent = async () => {
    setIsCancelling(true)
    try {
      const result = await cancelCalendarEvent(
        event.id,
        cancelReason,
        cancelNote || undefined,
        sendCancellationEmail && !!event.customer_email
      )
      if (result.success) {
        toast.success('Termin wurde abgesagt')
        setShowCancelDialog(false)
        router.push('/kalender')
      } else {
        toast.error(result.error || 'Fehler beim Absagen des Termins')
      }
    } catch (error) {
      toast.error('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setIsCancelling(false)
    }
  }

  const handleResendEmail = async () => {
    setIsResendingEmail(true)
    try {
      const result = await resendBookingConfirmationEmail(event.id)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Fehler beim Senden der E-Mail')
    } finally {
      setIsResendingEmail(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1080px]">
      <Breadcrumb pageName={displayName} items={[{ label: 'Kalender', href: '/kalender' }]} />

      {/* Info Banner for request-linked events */}
      {event.request_id && event.event_type === 'fi_assignment' && (
        <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Request-verknüpft:</strong> Dieses Event wurde automatisch durch einen genehmigten Arbeitstag-Request erstellt.
            Beim Löschen wird der Request automatisch zurückgezogen.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-5 gap-8">
        {/* Left Column - 3/5 */}
        <div className="col-span-5 xl:col-span-3 space-y-6">

          {/* Event Type */}
          <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
            <h2 className="border-b border-border px-7.5 py-4 font-medium text-foreground">Event-Typ</h2>
            <div className="p-7.5">
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
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="booking" id="booking" />
                  <Label htmlFor="booking" className="font-normal cursor-pointer">Buchung</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="fi_assignment" id="fi" />
                  <Label htmlFor="fi" className="font-normal cursor-pointer">FI-Mitarbeiter</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="blocker" id="blocker" />
                  <Label htmlFor="blocker" className="font-normal cursor-pointer">Blocker</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* ===================== BOOKING FIELDS ===================== */}
          {formData.event_type === 'booking' && (
            <>
              {/* Customer Data */}
              <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
                <h2 className="border-b border-border px-7.5 py-4 font-medium text-foreground">Kundendaten</h2>
                <div className="p-7.5 space-y-5.5">
                  <div className="flex flex-col gap-5.5 sm:flex-row">
                    <InputGroup
                      className="w-full sm:w-1/2"
                      label="Vorname"
                      value={formData.customer_first_name}
                      onChange={(e) => setFormData({ ...formData, customer_first_name: e.target.value })}
                      required
                      placeholder="Max"
                      icon={<User className="size-5" />}
                      iconPosition="left"
                    />
                    <InputGroup
                      className="w-full sm:w-1/2"
                      label="Nachname"
                      value={formData.customer_last_name}
                      onChange={(e) => setFormData({ ...formData, customer_last_name: e.target.value })}
                      required
                      placeholder="Mustermann"
                      icon={<User className="size-5" />}
                      iconPosition="left"
                    />
                  </div>
                  <div className="flex flex-col gap-5.5 sm:flex-row">
                    <div className="flex gap-2 items-end w-full sm:w-1/2">
                      <InputGroup
                        className="flex-1"
                        label="Telefon"
                        type="tel"
                        value={formData.customer_phone}
                        onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                        placeholder="+49 123 456789"
                        icon={<Phone className="size-5" />}
                        iconPosition="left"
                      />
                      {formData.customer_phone && (
                        <a
                          href={`tel:${formData.customer_phone.replace(/[^\d+]/g, '')}`}
                          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#3C50E0] text-[#3C50E0] hover:bg-[#3C50E0]/10 transition-colors mb-[1px]"
                          title={`${formData.customer_phone} anrufen`}
                        >
                          <Phone className="size-4" />
                        </a>
                      )}
                    </div>
                    <InputGroup
                      className="w-full sm:w-1/2"
                      label="E-Mail"
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      placeholder="max@example.com"
                      icon={<Mail className="size-5" />}
                      iconPosition="left"
                    />
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
                <h2 className="border-b border-border px-7.5 py-4 font-medium text-foreground">Datum & Zeit</h2>
                <div className="p-7.5 space-y-5.5">
                  <InputGroup
                    label="Datum"
                    type="date"
                    value={formData.booking_date}
                    onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
                    required
                    icon={<Calendar className="size-5" />}
                    iconPosition="left"
                  />

                  {/* Time Mode Selection */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-foreground">Zeiteingabe</label>
                    <RadioGroup
                      value={formData.duration_mode}
                      onValueChange={(value: string) => setFormData({ ...formData, duration_mode: value as 'duration' | 'manual' })}
                      className="flex gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="duration" id="duration-mode" />
                        <Label htmlFor="duration-mode" className="font-normal cursor-pointer">Startzeit + Dauer</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="manual" id="manual-mode" />
                        <Label htmlFor="manual-mode" className="font-normal cursor-pointer">Startzeit + Endzeit</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {formData.duration_mode === 'duration' ? (
                    <div className="flex flex-col gap-5.5 sm:flex-row">
                      <InputGroup
                        className="w-full sm:w-1/2"
                        label="Startzeit"
                        type="time"
                        value={formData.start_time_only}
                        onChange={(e) => setFormData({ ...formData, start_time_only: e.target.value })}
                        required
                        icon={<Clock className="size-5" />}
                        iconPosition="left"
                      />
                      <div className="w-full sm:w-1/2">
                        <label className="mb-3 block text-sm font-medium text-foreground">
                          Dauer <span className="ml-1 select-none text-destructive">*</span>
                        </label>
                        <Select
                          value={formData.duration_preset.toString()}
                          onValueChange={(value) => setFormData({ ...formData, duration_preset: parseInt(value) })}
                        >
                          <SelectTrigger>
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
                    <div className="flex flex-col gap-5.5 sm:flex-row">
                      <InputGroup
                        className="w-full sm:w-1/2"
                        label="Startzeit"
                        type="time"
                        value={formData.start_time_only}
                        onChange={(e) => setFormData({ ...formData, start_time_only: e.target.value })}
                        required
                        icon={<Clock className="size-5" />}
                        iconPosition="left"
                      />
                      <InputGroup
                        className="w-full sm:w-1/2"
                        label="Endzeit"
                        type="time"
                        value={formData.end_time_only}
                        onChange={(e) => setFormData({ ...formData, end_time_only: e.target.value })}
                        required
                        icon={<Clock className="size-5" />}
                        iconPosition="left"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Details */}
              <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
                <h2 className="border-b border-border px-7.5 py-4 font-medium text-foreground">Buchungsdetails</h2>
                <div className="p-7.5 space-y-5.5">
                  <InputGroup
                    label="Anzahl Personen"
                    type="number"
                    value={String(formData.attendee_count)}
                    onChange={(e) => setFormData({ ...formData, attendee_count: parseInt(e.target.value) || 1 })}
                    icon={<Users className="size-5" />}
                    iconPosition="left"
                  />
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={formData.has_video_recording}
                      onCheckedChange={(checked) => setFormData({ ...formData, has_video_recording: checked as boolean })}
                      id="video"
                    />
                    <Label htmlFor="video" className="flex items-center gap-2 cursor-pointer font-normal">
                      <Video className="size-4 text-[#8155FF]" />
                      Videoaufnahme gebucht
                    </Label>
                  </div>
                  <InputGroup
                    label="Vor Ort zu zahlen (EUR)"
                    type="number"
                    value={formData.on_site_payment_amount !== null ? String(formData.on_site_payment_amount) : ''}
                    onChange={(e) => setFormData({ ...formData, on_site_payment_amount: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="0.00"
                    icon={<Euro className="size-5" />}
                    iconPosition="left"
                  />
                </div>
              </div>

              {/* Location & Remarks */}
              <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
                <h2 className="border-b border-border px-7.5 py-4 font-medium text-foreground">Standort & Bemerkungen</h2>
                <div className="p-7.5 space-y-5.5">
                  <InputGroup
                    label="Standort"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    icon={<MapPin className="size-5" />}
                    iconPosition="left"
                  />
                  <TextAreaGroup
                    label="Bemerkungen"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    rows={4}
                    placeholder="Zusätzliche Informationen..."
                  />
                </div>
              </div>
            </>
          )}

          {/* ===================== FI ASSIGNMENT FIELDS ===================== */}
          {formData.event_type === 'fi_assignment' && (
            <>
              {/* Instructor Selection */}
              <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
                <h2 className="border-b border-border px-7.5 py-4 font-medium text-foreground">Mitarbeiter</h2>
                <div className="p-7.5 space-y-5.5">
                  <div>
                    <label className="mb-3 block text-sm font-medium text-foreground">
                      Mitarbeiter <span className="ml-1 select-none text-destructive">*</span>
                    </label>
                    <Select
                      value={formData.assigned_instructor_id || ''}
                      onValueChange={(value) => {
                        const emp = employees.find(e => e.id === value)
                        if (emp) {
                          setFormData({
                            ...formData,
                            assigned_instructor_id: emp.id,
                            assigned_instructor_name: `${emp.first_name} ${emp.last_name}`,
                            assigned_instructor_number: emp.employee_number || ''
                          })
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Mitarbeiter auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.first_name} {emp.last_name}
                            {emp.employee_number && ` (${emp.employee_number})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.assigned_instructor_name && !formData.assigned_instructor_id && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Hinweis: Dieser Eintrag hat keinen verknüpften Mitarbeiter. Name: {formData.assigned_instructor_name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
                <h2 className="border-b border-border px-7.5 py-4 font-medium text-foreground">Datum & Zeit</h2>
                <div className="p-7.5 space-y-5.5">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="is_all_day"
                      checked={formData.is_all_day}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_all_day: checked as boolean })}
                    />
                    <Label htmlFor="is_all_day" className="font-normal cursor-pointer">
                      Ganztägig
                    </Label>
                  </div>

                  <InputGroup
                    label="Datum"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      const dateStr = e.target.value
                      setSelectedDate(dateStr)
                      setFormData({
                        ...formData,
                        start_time: `${dateStr}T08:00`,
                        end_time: `${dateStr}T09:00`
                      })
                    }}
                    required
                    icon={<Calendar className="size-5" />}
                    iconPosition="left"
                  />

                  {!formData.is_all_day && (
                    <div className="flex flex-col gap-5.5 sm:flex-row">
                      <InputGroup
                        className="w-full sm:w-1/2"
                        label="Arbeits-Start"
                        type="time"
                        value={formData.actual_work_start_time || ''}
                        onChange={(e) => setFormData({ ...formData, actual_work_start_time: e.target.value })}
                        required
                        icon={<Clock className="size-5" />}
                        iconPosition="left"
                      />
                      <InputGroup
                        className="w-full sm:w-1/2"
                        label="Arbeits-Ende"
                        type="time"
                        value={formData.actual_work_end_time || ''}
                        onChange={(e) => setFormData({ ...formData, actual_work_end_time: e.target.value })}
                        required
                        icon={<Clock className="size-5" />}
                        iconPosition="left"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
                <h2 className="border-b border-border px-7.5 py-4 font-medium text-foreground">Bemerkungen</h2>
                <div className="p-7.5">
                  <TextAreaGroup
                    label="Bemerkungen"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    rows={4}
                    placeholder="Zusätzliche Informationen..."
                  />
                </div>
              </div>
            </>
          )}

          {/* ===================== BLOCKER FIELDS ===================== */}
          {formData.event_type === 'blocker' && (
            <>
              {/* Blocker Title */}
              <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
                <h2 className="border-b border-border px-7.5 py-4 font-medium text-foreground">Blocker Details</h2>
                <div className="p-7.5 space-y-5.5">
                  <InputGroup
                    label="Titel"
                    value={formData.blocker_title}
                    onChange={(e) => setFormData({ ...formData, blocker_title: e.target.value })}
                    required
                    placeholder="z.B. Wartung, Geschlossen, Urlaub..."
                    icon={<FileText className="size-5" />}
                    iconPosition="left"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
                <h2 className="border-b border-border px-7.5 py-4 font-medium text-foreground">Datum & Zeit</h2>
                <div className="p-7.5 space-y-5.5">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="blocker_all_day"
                      checked={formData.is_all_day}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_all_day: checked as boolean })}
                    />
                    <Label htmlFor="blocker_all_day" className="font-normal cursor-pointer">
                      Ganztägig (05:00-22:00)
                    </Label>
                  </div>

                  {formData.is_all_day ? (
                    <InputGroup
                      label="Datum"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      required
                      icon={<Calendar className="size-5" />}
                      iconPosition="left"
                    />
                  ) : (
                    <div className="flex flex-col gap-5.5 sm:flex-row">
                      <InputGroup
                        className="w-full sm:w-1/2"
                        label="Start"
                        type="datetime-local"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        required
                        icon={<Clock className="size-5" />}
                        iconPosition="left"
                      />
                      <InputGroup
                        className="w-full sm:w-1/2"
                        label="Ende"
                        type="datetime-local"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        required
                        icon={<Clock className="size-5" />}
                        iconPosition="left"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
                <h2 className="border-b border-border px-7.5 py-4 font-medium text-foreground">Bemerkungen</h2>
                <div className="p-7.5">
                  <TextAreaGroup
                    label="Bemerkungen"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    rows={4}
                    placeholder="Zusätzliche Informationen..."
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column - 2/5 */}
        <div className="col-span-5 xl:col-span-2 space-y-6">

          {/* Status Card */}
          <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card p-7.5">
            <h3 className="font-medium text-foreground mb-4">Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge variant={event.status === 'confirmed' ? 'success' : event.status === 'cancelled' ? 'error' : 'warning'}>
                  {event.status === 'confirmed' ? 'Bestätigt' : event.status === 'cancelled' ? 'Abgesagt' : 'Vorläufig'}
                </StatusBadge>
              </div>

              {event.sync_status && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sync</span>
                  <StatusBadge variant={event.sync_status === 'synced' ? 'success' : event.sync_status === 'error' ? 'error' : 'warning'}>
                    {event.sync_status === 'synced' ? 'Synchronisiert' : event.sync_status === 'error' ? 'Fehler' : 'Ausstehend'}
                  </StatusBadge>
                </div>
              )}

              {event.google_event_id && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Google ID</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                    {event.google_event_id.slice(0, 12)}...
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Erstellt</span>
                <span className="text-sm">{new Date(event.created_at).toLocaleDateString('de-DE')}</span>
              </div>

              {event.updated_at && event.updated_at !== event.created_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Aktualisiert</span>
                  <span className="text-sm">{new Date(event.updated_at).toLocaleDateString('de-DE')}</span>
                </div>
              )}

              {event.cancelled_at && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Abgesagt am</span>
                    <span className="text-sm">{new Date(event.cancelled_at).toLocaleDateString('de-DE')}</span>
                  </div>
                  {event.cancellation_reason && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Grund</span>
                      <span className="text-sm">
                        {event.cancellation_reason === 'cancelled_by_us' ? 'Von uns' : 'Vom Kunden'}
                      </span>
                    </div>
                  )}
                </>
              )}

              {event.rebooked_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Umgebucht</span>
                  <StatusBadge variant="brand">Umgebucht</StatusBadge>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
            <h3 className="border-b border-border px-7.5 py-4 font-medium text-foreground">Aktionen</h3>
            <div className="p-7.5 space-y-3">
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="w-full rounded-lg bg-[#fbb928] px-6 py-2.5 font-medium text-zinc-900 hover:bg-[#e5a820] transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Wird gespeichert...
                  </span>
                ) : 'Speichern'}
              </button>

              {event.status !== 'cancelled' && (
                <button
                  onClick={() => setShowCancelDialog(true)}
                  disabled={isSubmitting || isDeleting}
                  className="w-full rounded-lg border border-[#FFA70B] px-6 py-2.5 font-medium text-[#FFA70B] hover:bg-[#FFA70B]/10 transition-colors disabled:opacity-50"
                >
                  <CalendarX2 className="inline size-4 mr-2" />
                  Absagen
                </button>
              )}

              {formData.event_type === 'booking' && formData.customer_email && (
                <button
                  onClick={handleResendEmail}
                  disabled={isResendingEmail || isSubmitting}
                  className="w-full rounded-lg border border-border px-6 py-2.5 font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {isResendingEmail ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Wird gesendet...
                    </span>
                  ) : (
                    <>
                      <Mail className="inline size-4 mr-2" />
                      E-Mail erneut senden
                    </>
                  )}
                </button>
              )}

              {formData.event_type === 'booking' && formData.customer_email && (
                <button
                  onClick={() => {
                    const params = new URLSearchParams({
                      email: formData.customer_email,
                      subject: `Buchung: ${formData.customer_first_name} ${formData.customer_last_name}`,
                      description: `Ihre Buchung am ${formData.booking_date}\n\nSehr geehrte/r ${formData.customer_first_name} ${formData.customer_last_name},\n\n`,
                    })
                    router.push(`/tickets/new?${params.toString()}`)
                  }}
                  className="w-full rounded-lg border border-[#3C50E0] px-6 py-2.5 font-medium text-[#3C50E0] hover:bg-[#3C50E0]/10 transition-colors"
                >
                  <MessageSquare className="inline size-4 mr-2" />
                  Kunden kontaktieren
                </button>
              )}

              <button
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="w-full rounded-lg border border-[#F23030] px-6 py-2.5 font-medium text-[#F23030] hover:bg-[#F23030]/10 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Wird gelöscht...
                  </span>
                ) : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Event Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarX2 className="h-5 w-5 text-orange-500" />
              Termin absagen
            </DialogTitle>
            <DialogDescription>
              Wählen Sie den Grund für die Absage. Der Termin wird aus dem Google Kalender entfernt,
              bleibt aber zur Nachverfolgung gespeichert.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">Grund der Absage</Label>
              <RadioGroup
                value={cancelReason}
                onValueChange={(value) => setCancelReason(value as 'cancelled_by_us' | 'cancelled_by_customer')}
              >
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent transition-colors">
                  <RadioGroupItem value="cancelled_by_us" id="cancelled_by_us" />
                  <Label htmlFor="cancelled_by_us" className="font-normal cursor-pointer flex-1">
                    Von uns abgesagt
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent transition-colors mt-2">
                  <RadioGroupItem value="cancelled_by_customer" id="cancelled_by_customer" />
                  <Label htmlFor="cancelled_by_customer" className="font-normal cursor-pointer flex-1">
                    Vom Kunden abgesagt
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="cancel_note" className="text-sm font-medium mb-2 block">
                Begründung (optional)
              </Label>
              <Textarea
                id="cancel_note"
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                placeholder="z.B. Kunde hat kurzfristig abgesagt wegen Krankheit..."
                rows={3}
              />
            </div>

            {event.customer_email && (
              <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/50">
                <Checkbox
                  id="send_cancellation_email"
                  checked={sendCancellationEmail}
                  onCheckedChange={(checked) => setSendCancellationEmail(checked as boolean)}
                />
                <Label htmlFor="send_cancellation_email" className="font-normal cursor-pointer flex-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Bestätigungsmail an Kunden senden
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {event.customer_email}
                  </p>
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={isCancelling}
            >
              Zurück
            </Button>
            <Button
              type="button"
              onClick={handleCancelEvent}
              disabled={isCancelling}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isCancelling ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Wird abgesagt...
                </span>
              ) : (
                'Termin absagen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
