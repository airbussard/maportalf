import { cn } from '@/lib/utils'
import type { TicketPriority } from '@/lib/types/ticket'
import { AlertCircle, ArrowUp, ArrowDown, Minus } from 'lucide-react'

const priorityConfig: Record<TicketPriority, { label: string; className: string; icon: any }> = {
  urgent: {
    label: 'Dringend',
    className: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertCircle
  },
  high: {
    label: 'Hoch',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: ArrowUp
  },
  medium: {
    label: 'Mittel',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Minus
  },
  low: {
    label: 'Niedrig',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: ArrowDown
  }
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const config = priorityConfig[priority]
  const Icon = config.icon

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border',
      config.className
    )}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}
