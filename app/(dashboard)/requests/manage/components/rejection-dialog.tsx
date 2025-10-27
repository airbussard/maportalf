/**
 * Rejection Dialog Component
 *
 * Dialog for rejecting work requests with mandatory reason
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Calendar, XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { rejectWorkRequest } from '@/app/actions/work-requests'
import {
  type WorkRequestWithRelations,
  formatRequestDate,
  formatRequestTime,
  getEmployeeName
} from '@/lib/types/work-requests'

interface RejectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: WorkRequestWithRelations | null
}

export function RejectionDialog({ open, onOpenChange, request }: RejectionDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [reason, setReason] = useState('')

  // Handle rejection
  const handleReject = async () => {
    if (!request) return

    // Validate reason
    if (!reason.trim()) {
      toast({
        title: 'Grund erforderlich',
        description: 'Bitte gib einen Grund für die Ablehnung an.',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    try {
      await rejectWorkRequest(request.id, reason.trim())
      toast({
        title: 'Request abgelehnt',
        description: `Der Request von ${getEmployeeName(request)} wurde abgelehnt.`
      })
      setReason('')
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

  // Handle close
  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      setReason('')
    }
    onOpenChange(open)
  }

  if (!request) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Request ablehnen
          </DialogTitle>
          <DialogDescription>
            Gib einen Grund für die Ablehnung an
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Request Details */}
          <div className="space-y-3 pb-4 border-b">
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
                <div className="text-sm font-medium text-muted-foreground">Grund des Mitarbeiters</div>
                <div className="text-sm">{request.reason}</div>
              </div>
            )}
          </div>

          {/* Rejection Reason */}
          <div className="space-y-2">
            <Label htmlFor="rejection_reason">
              Ablehnungsgrund *
            </Label>
            <Textarea
              id="rejection_reason"
              placeholder="Z.B. Zu viele Mitarbeiter an diesem Tag, Betriebliche Gründe, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
            />
            <p className="text-sm text-muted-foreground">
              Der Mitarbeiter wird über den Grund informiert.
            </p>
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
            variant="destructive"
            onClick={handleReject}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ablehnen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
