/**
 * Approval Dialog Component
 *
 * Dialog for approving work requests
 * Shows details, conflict warnings, and creates calendar event on approval
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, Calendar, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  approveWorkRequest,
  checkWorkRequestConflicts
} from '@/app/actions/work-requests'
import {
  type WorkRequestWithRelations,
  type WorkRequestConflict,
  formatRequestDate,
  formatRequestTime,
  getEmployeeName
} from '@/lib/types/work-requests'

interface ApprovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: WorkRequestWithRelations | null
}

export function ApprovalDialog({ open, onOpenChange, request }: ApprovalDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [conflicts, setConflicts] = useState<WorkRequestConflict[]>([])
  const [checkingConflicts, setCheckingConflicts] = useState(false)

  // Check for conflicts when dialog opens
  useEffect(() => {
    if (request && open) {
      const checkConflicts = async () => {
        setCheckingConflicts(true)
        try {
          const result = await checkWorkRequestConflicts(request.request_date, request.id)
          setConflicts(result)
        } catch (error) {
          console.error('Error checking conflicts:', error)
        } finally {
          setCheckingConflicts(false)
        }
      }
      checkConflicts()
    }
  }, [request, open])

  // Handle approval
  const handleApprove = async () => {
    if (!request) return

    setIsLoading(true)
    try {
      await approveWorkRequest(request.id)
      toast({
        title: 'Request genehmigt',
        description: `Der Request von ${getEmployeeName(request)} wurde genehmigt. Ein Calendar Event wurde automatisch erstellt.`
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

  if (!request) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Request genehmigen
          </DialogTitle>
          <DialogDescription>
            Überprüfe die Details und bestätige die Genehmigung
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Request Details */}
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Mitarbeiter</div>
              <div className="text-lg font-semibold">{getEmployeeName(request)}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Datum</div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatRequestDate(request.request_date)}</span>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Zeit</div>
              <div>{formatRequestTime(request)}</div>
            </div>

            {request.reason && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Grund</div>
                <div className="text-sm">{request.reason}</div>
              </div>
            )}
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
                <strong>Hinweis:</strong> An diesem Tag sind bereits {conflicts.length}{' '}
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

          {/* Info */}
          <Alert>
            <AlertDescription className="text-sm">
              <strong>Info:</strong> Nach der Genehmigung wird automatisch ein Calendar Event erstellt
              ({request.is_full_day ? '08:00-09:00' : formatRequestTime(request)}).
            </AlertDescription>
          </Alert>
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
            onClick={handleApprove}
            disabled={isLoading || checkingConflicts}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Genehmigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
