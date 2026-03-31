/**
 * Request Card Component
 *
 * Displays a single work request as a NextAdmin chat-list style item
 * Used in list view and calendar view
 */

'use client'

import { Calendar, Clock, Edit2, Trash2, AlertCircle } from 'lucide-react'
import { StatusBadge as NextAdminStatusBadge } from '@/components/nextadmin'
import {
  type WorkRequest,
  type WorkRequestStatus,
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

const statusVariantMap: Record<WorkRequestStatus, 'warning' | 'success' | 'error' | 'neutral'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  withdrawn: 'neutral',
}

const statusLabelMap: Record<WorkRequestStatus, string> = {
  pending: 'Ausstehend',
  approved: 'Genehmigt',
  rejected: 'Abgelehnt',
  withdrawn: 'Zuruckgezogen',
}

const statusColorMap: Record<WorkRequestStatus, string> = {
  pending: '#FFA70B',
  approved: '#219653',
  rejected: '#F23030',
  withdrawn: '#6B7280',
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
  const accentColor = statusColorMap[request.status]

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Main row */}
      <div className="flex items-center gap-4 px-7.5 py-4 hover:bg-accent/50 transition-colors">
        {/* Icon circle */}
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${accentColor}10` }}
        >
          <Calendar className="size-5" style={{ color: accentColor }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground">
            {getDayName(request.request_date)}, {formatRequestDateShort(request.request_date)}
          </h3>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="size-3.5" />
              {formatRequestTime(request)}
            </span>
            {request.reason && (
              <span className="text-sm text-muted-foreground truncate">
                {request.reason}
              </span>
            )}
          </div>
        </div>

        {/* Status badge + actions */}
        <div className="flex items-center gap-2 shrink-0">
          <NextAdminStatusBadge variant={statusVariantMap[request.status]}>
            {statusLabelMap[request.status]}
          </NextAdminStatusBadge>

          {showActions && (
            <div className="flex items-center gap-0.5 ml-1">
              {canEdit && onEdit && (
                <button
                  onClick={() => onEdit(request)}
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-[#fbb928]"
                  title="Bearbeiten"
                >
                  <Edit2 className="size-4" />
                </button>
              )}
              {canWithdraw && onWithdraw && (
                <button
                  onClick={() => onWithdraw(request)}
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#F23030]/10 hover:text-[#F23030]"
                  title="Zuruckziehen"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
              {onDelete && request.status !== 'pending' && (
                <button
                  onClick={() => onDelete(request)}
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#F23030]/10 hover:text-[#F23030]"
                  title="Loschen"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rejection reason banner */}
      {request.status === 'rejected' && request.rejection_reason && (
        <div className="flex items-start gap-2 mx-7.5 mb-4 px-4 py-3 rounded-lg bg-[#F23030]/[0.06] dark:bg-[#F23030]/[0.1]">
          <AlertCircle className="size-4 shrink-0 mt-0.5 text-[#F23030]" />
          <div>
            <p className="text-xs font-medium text-[#F23030]">Ablehnungsgrund:</p>
            <p className="text-sm text-[#F23030]/80 dark:text-[#F56060]">
              {request.rejection_reason}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
