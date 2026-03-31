import { cn } from '@/lib/utils'
import type { TicketStatus } from '@/lib/types/ticket'

const statusConfig: Record<TicketStatus, { label: string; className: string }> = {
  open: {
    label: 'Offen',
    className: 'bg-[#3C50E0]/[0.08] text-[#3C50E0] dark:bg-[#3C50E0]/[0.15] dark:text-[#6B8AFF]'
  },
  in_progress: {
    label: 'In Bearbeitung',
    className: 'bg-[#FF9C55]/[0.08] text-[#FF9C55] dark:bg-[#FF9C55]/[0.15] dark:text-[#FFB380]'
  },
  resolved: {
    label: 'Gelöst',
    className: 'bg-[#219653]/[0.08] text-[#219653] dark:bg-[#219653]/[0.15] dark:text-[#34D399]'
  },
  closed: {
    label: 'Geschlossen',
    className: 'bg-[#6B7280]/[0.08] text-[#6B7280] dark:bg-[#6B7280]/[0.15] dark:text-[#9CA3AF]'
  }
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const config = statusConfig[status]

  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
      config.className
    )}>
      {config.label}
    </span>
  )
}
