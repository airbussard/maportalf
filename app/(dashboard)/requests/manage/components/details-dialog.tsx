/**
 * Details Dialog Component
 *
 * Read-only dialog for viewing work request details
 * Shows all information without edit/approval capabilities
 */

'use client'

import { useState, useEffect } from 'react'
import { Eye, Calendar, Clock, AlertCircle, Loader2, User, FileText } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '../../components/status-badge'
import { checkWorkRequestConflicts } from '@/app/actions/work-requests'
import {
  type WorkRequestWithRelations,
  type WorkRequestConflict,
  formatRequestDate,
  formatRequestTime,
  getEmployeeName
} from '@/lib/types/work-requests'

interface DetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: WorkRequestWithRelations | null
}

export function DetailsDialog({ open, onOpenChange, request }: DetailsDialogProps) {
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

  if (!request) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Request-Details
          </DialogTitle>
          <DialogDescription>
            Vollständige Informationen zu diesem Work Request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">Status</div>
            <StatusBadge status={request.status} />
          </div>

          {/* Request Details */}
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                <User className="h-4 w-4" />
                Mitarbeiter
              </div>
              <div className="text-lg font-semibold">{getEmployeeName(request)}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Datum
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatRequestDate(request.request_date)}</span>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Zeit
              </div>
              <div className="font-medium">{formatRequestTime(request)}</div>
            </div>

            {request.reason && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Grund
                </div>
                <div className="text-sm bg-muted p-3 rounded-md">{request.reason}</div>
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
                <strong>Konflikt:</strong> An diesem Tag sind {conflicts.length}{' '}
                {conflicts.length === 1 ? 'weiterer Mitarbeiter' : 'weitere Mitarbeiter'} eingeplant:
                <ul className="mt-2 list-disc list-inside">
                  {conflicts.map((c) => (
                    <li key={c.id}>
                      {c.employee.first_name} {c.employee.last_name} ({c.is_full_day ? 'Ganztägig' : `${c.start_time} - ${c.end_time}`})
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Metadata */}
          <div className="border-t pt-3 mt-3">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>
                <strong>Erstellt:</strong> {new Date(request.created_at).toLocaleString('de-DE')}
              </div>
              {request.updated_at && request.updated_at !== request.created_at && (
                <div>
                  <strong>Aktualisiert:</strong> {new Date(request.updated_at).toLocaleString('de-DE')}
                </div>
              )}
              {request.approved_by && request.approved_at && (
                <div>
                  <strong>Bearbeitet:</strong> {new Date(request.approved_at).toLocaleString('de-DE')}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
