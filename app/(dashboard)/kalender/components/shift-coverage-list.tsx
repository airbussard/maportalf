/**
 * Shift Coverage List Component
 *
 * Displays all shift coverage requests for managers/admins
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  ChevronUp,
  Users,
  Calendar,
  Clock,
  X,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { cancelShiftCoverageRequest } from '@/app/actions/shift-coverage'
import {
  ShiftCoverageRequestWithRelations,
  getStatusLabel,
  getStatusColor,
  formatCoverageDate,
  formatCoverageTime,
  getEmployeeName
} from '@/lib/types/shift-coverage'

interface ShiftCoverageListProps {
  requests: ShiftCoverageRequestWithRelations[]
}

export function ShiftCoverageList({ requests }: ShiftCoverageListProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const openRequests = requests.filter(r => r.status === 'open')
  const acceptedRequests = requests.filter(r => r.status === 'accepted')
  const otherRequests = requests.filter(r => r.status !== 'open' && r.status !== 'accepted')

  const handleCancel = async (requestId: string) => {
    setCancellingId(requestId)
    try {
      const result = await cancelShiftCoverageRequest(requestId)
      if (result.success) {
        toast.success('Anfrage storniert')
        router.refresh()
      } else {
        toast.error('Fehler', { description: result.error })
      }
    } catch (error) {
      toast.error('Ein Fehler ist aufgetreten')
    } finally {
      setCancellingId(null)
    }
  }

  if (requests.length === 0) {
    return null
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-yellow-500" />
            <span className="font-medium">Schichtanfragen</span>
            {openRequests.length > 0 && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                {openRequests.length} offen
              </Badge>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-t divide-y">
          {/* Open Requests */}
          {openRequests.length > 0 && (
            <div className="p-4 space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Offene Anfragen
              </h4>
              {openRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onCancel={handleCancel}
                  cancelling={cancellingId === request.id}
                />
              ))}
            </div>
          )}

          {/* Accepted Requests */}
          {acceptedRequests.length > 0 && (
            <div className="p-4 space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Angenommen
              </h4>
              {acceptedRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onCancel={handleCancel}
                  cancelling={cancellingId === request.id}
                />
              ))}
            </div>
          )}

          {/* Other Requests (cancelled, expired) */}
          {otherRequests.length > 0 && (
            <div className="p-4 space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Abgeschlossen
              </h4>
              {otherRequests.slice(0, 5).map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onCancel={handleCancel}
                  cancelling={cancellingId === request.id}
                />
              ))}
              {otherRequests.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{otherRequests.length - 5} weitere
                </p>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

interface RequestCardProps {
  request: ShiftCoverageRequestWithRelations
  onCancel: (id: string) => void
  cancelling: boolean
}

function RequestCard({ request, onCancel, cancelling }: RequestCardProps) {
  const statusColor = getStatusColor(request.status)

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">
              {formatCoverageDate(request.request_date)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {formatCoverageTime(request)}
            </span>
          </div>
          {request.reason && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {request.reason}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <Badge className={statusColor}>
            {getStatusLabel(request.status)}
          </Badge>
          {request.status === 'accepted' && request.acceptor && (
            <p className="text-xs text-green-600 mt-1">
              {getEmployeeName(request.acceptor)}
            </p>
          )}
        </div>

        {request.status === 'open' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                disabled={cancelling}
              >
                {cancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Anfrage stornieren?</AlertDialogTitle>
                <AlertDialogDescription>
                  Die Anfrage für den {formatCoverageDate(request.request_date)} wird storniert.
                  Mitarbeiter können diese Schicht dann nicht mehr annehmen.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onCancel(request.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Stornieren
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}
