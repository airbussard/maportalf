import { cn } from '@/lib/utils'
import type { TicketPriority } from '@/lib/types/ticket'
import { AlertCircle, ArrowUp, ArrowDown, Minus } from 'lucide-react'

const priorityConfig: Record<TicketPriority, { label: string; className: string; icon: any }> = {
  urgent: {
    label: 'Dringend',
    className: 'bg-[#F23030]/[0.08] text-[#F23030] dark:bg-[#F23030]/[0.15] dark:text-[#F56060]',
    icon: AlertCircle
  },
  high: {
    label: 'Hoch',
    className: 'bg-[#FF9C55]/[0.08] text-[#FF9C55] dark:bg-[#FF9C55]/[0.15] dark:text-[#FFB380]',
    icon: ArrowUp
  },
  medium: {
    label: 'Mittel',
    className: 'bg-[#FFA70B]/[0.08] text-[#FFA70B] dark:bg-[#FFA70B]/[0.15] dark:text-[#FFD06B]',
    icon: Minus
  },
  low: {
    label: 'Niedrig',
    className: 'bg-[#6B7280]/[0.08] text-[#6B7280] dark:bg-[#6B7280]/[0.15] dark:text-[#9CA3AF]',
    icon: ArrowDown
  }
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const config = priorityConfig[priority]
  const Icon = config.icon

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
      config.className
    )}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}
