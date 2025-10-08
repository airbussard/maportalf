import { cn } from '@/lib/utils'
import type { TicketStatus } from '@/lib/types/ticket'

const statusConfig: Record<TicketStatus, { label: string; className: string }> = {
  open: {
    label: 'Offen',
    className: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  in_progress: {
    label: 'In Bearbeitung',
    className: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  resolved: {
    label: 'Gelöst',
    className: 'bg-green-100 text-green-800 border-green-200'
  },
  closed: {
    label: 'Geschlossen',
    className: 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const config = statusConfig[status]

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      config.className
    )}>
      {config.label}
    </span>
  )
}
