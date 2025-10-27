/**
 * Direct Create Dialog Component (Admin only)
 *
 * Allows admins to create work requests directly for employees
 * Status is immediately 'approved' and calendar event is created
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, UserPlus } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  createWorkRequestDirect,
  checkWorkRequestConflicts
} from '@/app/actions/work-requests'
import {
  validateCreateRequestInput,
  type CreateWorkRequestInput,
  type WorkRequestConflict
} from '@/lib/types/work-requests'

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface DirectCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: Employee[]
}

export function DirectCreateDialog({ open, onOpenChange, employees }: DirectCreateDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [conflicts, setConflicts] = useState<WorkRequestConflict[]>([])
  const [checkingConflicts, setCheckingConflicts] = useState(false)

  // Form state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [formData, setFormData] = useState<CreateWorkRequestInput>({
    request_date: '',
    is_full_day: true,
    start_time: '09:00',
    end_time: '17:00',
    reason: ''
  })

  // Check for conflicts when date changes
  useEffect(() => {
    if (formData.request_date && open) {
      const checkConflicts = async () => {
        setCheckingConflicts(true)
        try {
          const result = await checkWorkRequestConflicts(formData.request_date)
          setConflicts(result)
        } catch (error) {
          console.error('Error checking conflicts:', error)
        } finally {
          setCheckingConflicts(false)
        }
      }
      checkConflicts()
    }
  }, [formData.request_date, open])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate employee selection
    if (!selectedEmployeeId) {
      toast({
        title: 'Mitarbeiter erforderlich',
        description: 'Bitte wähle einen Mitarbeiter aus.',
        variant: 'destructive'
      })
      return
    }

    // Validate input
    const validationError = validateCreateRequestInput(formData)
    if (validationError) {
      toast({
        title: 'Validierungsfehler',
        description: validationError,
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    try {
      await createWorkRequestDirect(selectedEmployeeId, formData)
      const employee = employees.find(e => e.id === selectedEmployeeId)
      toast({
        title: 'Request erstellt',
        description: `Request für ${employee?.first_name} ${employee?.last_name} wurde direkt genehmigt und Calendar Event erstellt.`
      })
      resetForm()
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setSelectedEmployeeId('')
    setFormData({
      request_date: '',
      is_full_day: true,
      start_time: '09:00',
      end_time: '17:00',
      reason: ''
    })
    setConflicts([])
  }

  // Handle dialog close
  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      resetForm()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Request direkt erstellen (Admin)
            </DialogTitle>
            <DialogDescription>
              Erstelle einen Work Request für einen Mitarbeiter. Der Request wird direkt genehmigt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Employee Selection */}
            <div className="space-y-2">
              <Label htmlFor="employee">Mitarbeiter *</Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mitarbeiter auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="request_date">Datum *</Label>
              <Input
                id="request_date"
                type="date"
                value={formData.request_date}
                onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                required
              />
            </div>

            {/* Conflict Warning */}
            {checkingConflicts && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Prüfe auf Konflikte...
                </AlertDescription>
              </Alert>
            )}

            {conflicts.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warnung:</strong> An diesem Tag sind bereits {conflicts.length}{' '}
                  Mitarbeiter eingeplant:
                  <ul className="mt-2 list-disc list-inside">
                    {conflicts.map((c) => (
                      <li key={c.id}>
                        {c.employee.first_name} {c.employee.last_name}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Full Day Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="is_full_day">Ganztägig</Label>
              <Switch
                id="is_full_day"
                checked={formData.is_full_day}
                onCheckedChange={(checked) => setFormData({ ...formData, is_full_day: checked })}
              />
            </div>

            {/* Time Range (only if not full day) */}
            {!formData.is_full_day && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Von *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required={!formData.is_full_day}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">Bis *</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required={!formData.is_full_day}
                  />
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Grund (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Z.B. Simulator Training, Meeting, etc."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
              />
            </div>

            {/* Info */}
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Hinweis:</strong> Der Request wird direkt mit Status "Genehmigt" erstellt
                und ein Calendar Event wird automatisch angelegt.
              </AlertDescription>
            </Alert>
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
            <Button type="submit" disabled={isLoading || !selectedEmployeeId}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Erstellen & Genehmigen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
