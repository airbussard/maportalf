/**
 * Request Card Component
 *
 * Displays a single work request with all relevant details
 * Used in list view and calendar view
 */

'use client'

import { Calendar, Clock, FileText, AlertCircle, Edit2, Trash2 } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from './status-badge'
import {
  type WorkRequest,
  formatRequestTime,
  formatRequestDateShort,
  getDayName,
  canEditRequest,
  canWithdrawRequest
} from '@/lib/types/work-requests'

interface RequestCardProps {
  request: WorkRequest
  userId: string
  onEdit?: (request: WorkRequest) => void
  onWithdraw?: (request: WorkRequest) => void
  onDelete?: (request: WorkRequest) => void
}

export function RequestCard({
  request,
  userId,
  onEdit,
  onWithdraw,
  onDelete
}: RequestCardProps) {
  const canEdit = canEditRequest(request, userId)
  const canWithdraw = canWithdrawRequest(request, userId)
  const showActions = canEdit || canWithdraw || onDelete

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        {/* Header: Date + Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">{getDayName(request.request_date)}</p>
              <p className="text-sm text-muted-foreground">
                {formatRequestDateShort(request.request_date)}
              </p>
            </div>
          </div>
          <StatusBadge status={request.status} />
        </div>

        {/* Time Info */}
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{formatRequestTime(request)}</span>
        </div>

        {/* Reason */}
        {request.reason && (
          <div className="flex items-start gap-2 mb-3">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-sm text-muted-foreground line-clamp-2">
              {request.reason}
            </p>
          </div>
        )}

        {/* Rejection Reason */}
        {request.status === 'rejected' && request.rejection_reason && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                Ablehnungsgrund:
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                {request.rejection_reason}
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {/* Actions */}
      {showActions && (
        <CardFooter className="flex gap-2 pt-0">
          {canEdit && onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(request)}
              className="flex-1"
            >
              <Edit2 className="h-3 w-3 mr-2" />
              Bearbeiten
            </Button>
          )}
          {canWithdraw && onWithdraw && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onWithdraw(request)}
              className="flex-1"
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Zurückziehen
            </Button>
          )}
          {onDelete && request.status !== 'pending' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(request)}
              className="flex-1 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Löschen
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
