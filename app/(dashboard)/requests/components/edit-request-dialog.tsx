/**
 * Edit Request Dialog Component
 *
 * Modal form for editing existing work requests (pending only)
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  updateWorkRequest,
  checkWorkRequestConflicts
} from '@/app/actions/work-requests'
import {
  validateCreateRequestInput,
  removeSecondsFromTime,
  type UpdateWorkRequestInput,
  type WorkRequest,
  type WorkRequestConflict
} from '@/lib/types/work-requests'

interface EditRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: WorkRequest
}

export function EditRequestDialog({ open, onOpenChange, request }: EditRequestDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [conflicts, setConflicts] = useState<WorkRequestConflict[]>([])
  const [checkingConflicts, setCheckingConflicts] = useState(false)

  // Form state - initialize from request
  const [formData, setFormData] = useState<UpdateWorkRequestInput>({
    request_date: request.request_date,
    is_full_day: request.is_full_day,
    start_time: removeSecondsFromTime(request.start_time) || '09:00',
    end_time: removeSecondsFromTime(request.end_time) || '17:00',
    reason: request.reason || ''
  })

  // Reset form when request changes
  useEffect(() => {
    setFormData({
      request_date: request.request_date,
      is_full_day: request.is_full_day,
      start_time: removeSecondsFromTime(request.start_time) || '09:00',
      end_time: removeSecondsFromTime(request.end_time) || '17:00',
      reason: request.reason || ''
    })
  }, [request])

  // Check for conflicts when date changes
  useEffect(() => {
    if (formData.request_date && open) {
      const checkConflicts = async () => {
        setCheckingConflicts(true)
        try {
          // Exclude current request from conflict check
          const result = await checkWorkRequestConflicts(formData.request_date, request.id)
          setConflicts(result)
        } catch (error) {
          console.error('Error checking conflicts:', error)
        } finally {
          setCheckingConflicts(false)
        }
      }
      checkConflicts()
    }
  }, [formData.request_date, open, request.id])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate input (reuse create validation)
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
      await updateWorkRequest(request.id, formData)
      toast({
        title: 'Request aktualisiert',
        description: 'Dein Request wurde erfolgreich aktualisiert.'
      })
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

  // Don't allow editing non-pending requests
  if (request.status !== 'pending') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bearbeitung nicht möglich</DialogTitle>
            <DialogDescription>
              Nur ausstehende Requests können bearbeitet werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Request bearbeiten</DialogTitle>
            <DialogDescription>
              Aktualisiere die Details deines Work Requests.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="request_date">Datum *</Label>
              <Input
                id="request_date"
                type="date"
                value={formData.request_date}
                onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                required
                min={new Date().toISOString().split('T')[0]}
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
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
