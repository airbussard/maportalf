/**
 * Status Badge Component
 *
 * Displays work request status with appropriate color coding
 * Used throughout the requests UI (list, calendar, cards)
 */

import { Badge } from '@/components/ui/badge'
import { getStatusLabel, getStatusColor, type WorkRequestStatus } from '@/lib/types/work-requests'

interface StatusBadgeProps {
  status: WorkRequestStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = getStatusLabel(status)
  const colorClasses = getStatusColor(status)

  return (
    <Badge
      variant="outline"
      className={`${colorClasses} ${className || ''}`}
    >
      {label}
    </Badge>
  )
}
