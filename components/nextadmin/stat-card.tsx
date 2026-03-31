import { cn } from '@/lib/utils'
import { ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  growthRate?: number
  className?: string
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = '#fbb928',
  iconBg,
  growthRate,
  className,
}: StatCardProps) {
  const isDecreasing = growthRate !== undefined && growthRate < 0
  const bg = iconBg || `${iconColor}15`

  return (
    <div className={cn('rounded-[10px] bg-card p-6 shadow-1 dark:shadow-card', className)}>
      <div className="flex size-12 items-center justify-center rounded-full" style={{ backgroundColor: bg }}>
        <Icon className="size-6" style={{ color: iconColor }} />
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <h4 className="mb-1 text-2xl font-bold text-foreground">
            {value}
          </h4>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
        </div>

        {growthRate !== undefined && (
          <span className={cn(
            'flex items-center gap-1 text-sm font-medium',
            isDecreasing ? 'text-[#F23030]' : 'text-[#219653]',
          )}>
            {growthRate > 0 ? '+' : ''}{growthRate}%
            {isDecreasing ? <ArrowDown className="size-4" /> : <ArrowUp className="size-4" />}
          </span>
        )}
      </div>
    </div>
  )
}
