/**
 * Shift Coverage Dialog Component
 *
 * Modal for managers/admins to request shift coverage from employees
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, MessageSquare, Users, Calendar, Clock, AlertCircle } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  createShiftCoverageRequest,
  getActiveEmployeesForCoverage
} from '@/app/actions/shift-coverage'

interface Employee {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
}

interface ShiftCoverageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShiftCoverageDialog({ open, onOpenChange }: ShiftCoverageDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  // Form state
  const [requestDate, setRequestDate] = useState('')
  const [isFullDay, setIsFullDay] = useState(true)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [reason, setReason] = useState('')
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(true)
  const [sendEmail, setSendEmail] = useState(true)
  const [sendSMS, setSendSMS] = useState(false)

  // Load employees when dialog opens
  useEffect(() => {
    if (open) {
      loadEmployees()
    }
  }, [open])

  const loadEmployees = async () => {
    setLoadingEmployees(true)
    try {
      const data = await getActiveEmployeesForCoverage()
      setEmployees(data)
      // Select all by default
      setSelectedEmployees(data.map(e => e.id))
    } catch (error) {
      console.error('Error loading employees:', error)
      toast.error('Fehler beim Laden der Mitarbeiter')
    } finally {
      setLoadingEmployees(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!requestDate) {
      toast.error('Bitte wähle ein Datum aus')
      return
    }

    const effectiveEmployees = selectAll ? employees.map(e => e.id) : selectedEmployees
    if (effectiveEmployees.length === 0) {
      toast.error('Bitte wähle mindestens einen Mitarbeiter aus')
      return
    }

    if (!sendEmail && !sendSMS) {
      toast.error('Bitte wähle mindestens eine Benachrichtigungsart')
      return
    }

    setIsLoading(true)
    try {
      const result = await createShiftCoverageRequest({
        request_date: requestDate,
        is_full_day: isFullDay,
        start_time: isFullDay ? undefined : startTime,
        end_time: isFullDay ? undefined : endTime,
        reason: reason || undefined,
        employee_ids: effectiveEmployees,
        send_email: sendEmail,
        send_sms: sendSMS
      })

      if (result.success) {
        toast.success('Anfrage gesendet', {
          description: `${effectiveEmployees.length} Mitarbeiter wurden benachrichtigt`
        })
        onOpenChange(false)
        resetForm()
        router.refresh()
      } else {
        toast.error('Fehler', { description: result.error })
      }
    } catch (error) {
      toast.error('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setRequestDate('')
    setIsFullDay(true)
    setStartTime('09:00')
    setEndTime('17:00')
    setReason('')
    setSelectAll(true)
    setSelectedEmployees([])
    setSendEmail(true)
    setSendSMS(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      resetForm()
    }
    onOpenChange(open)
  }

  const toggleEmployee = (employeeId: string) => {
    setSelectAll(false)
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    )
  }

  const getEmployeeName = (employee: Employee) => {
    const parts = [employee.first_name, employee.last_name].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : employee.email
  }

  // Count employees with phone
  const employeesWithPhone = employees.filter(e => e.phone).length

  // Get effective selected count
  const selectedCount = selectAll ? employees.length : selectedEmployees.length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-yellow-500" />
              Schicht anfragen
            </DialogTitle>
            <DialogDescription>
              Frage Mitarbeiter an, ob sie an einem bestimmten Tag arbeiten können.
              Wer zuerst klickt, bekommt den Tag.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Date and Time Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Datum & Zeit
              </div>

              <div className="grid gap-4">
                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="request_date">Datum *</Label>
                  <Input
                    id="request_date"
                    type="date"
                    value={requestDate}
                    onChange={(e) => setRequestDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                {/* Full Day Toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_full_day" className="cursor-pointer">
                    Ganztägig
                  </Label>
                  <Switch
                    id="is_full_day"
                    checked={isFullDay}
                    onCheckedChange={setIsFullDay}
                  />
                </div>

                {/* Time Inputs (shown when not full day) */}
                {!isFullDay && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_time">Von</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_time">Bis</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Grund (optional)</Label>
              <Textarea
                id="reason"
                placeholder="z.B. Zusätzlicher Bedarf wegen hoher Nachfrage..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>

            {/* Employee Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Mitarbeiter ({selectedCount} ausgewählt)
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select_all"
                    checked={selectAll}
                    onCheckedChange={(checked) => {
                      const isChecked = checked === true
                      setSelectAll(isChecked)
                      setSelectedEmployees(isChecked ? employees.map(e => e.id) : [])
                    }}
                  />
                  <Label htmlFor="select_all" className="text-sm cursor-pointer">
                    Alle auswählen
                  </Label>
                </div>
              </div>

              {loadingEmployees ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : employees.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Keine aktiven Mitarbeiter gefunden.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
                  {employees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleEmployee(employee.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectAll || selectedEmployees.includes(employee.id)}
                          onCheckedChange={() => toggleEmployee(employee.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <div className="font-medium text-sm">
                            {getEmployeeName(employee)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {employee.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        {employee.phone && (
                          <MessageSquare className="h-3.5 w-3.5 text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Options */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Mail className="h-4 w-4" />
                Benachrichtigung
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="font-medium text-sm">E-Mail</div>
                      <div className="text-xs text-muted-foreground">
                        Mit Annahme-Button
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={sendEmail}
                    onCheckedChange={setSendEmail}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="font-medium text-sm">SMS</div>
                      <div className="text-xs text-muted-foreground">
                        Kurze Info ({employeesWithPhone} mit Telefonnummer)
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={sendSMS}
                    onCheckedChange={setSendSMS}
                  />
                </div>
              </div>

              {!sendEmail && sendSMS && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Ohne E-Mail können Mitarbeiter die Schicht nicht annehmen.
                    SMS dient nur als Hinweis.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !requestDate || selectedCount === 0 || (!sendEmail && !sendSMS)}
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedCount} Mitarbeiter anfragen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
