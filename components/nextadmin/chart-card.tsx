import { cn } from '@/lib/utils'

interface ChartCardProps {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function ChartCard({ title, children, action, footer, className }: ChartCardProps) {
  return (
    <div className={cn('rounded-[10px] bg-card px-7.5 pb-6 pt-7.5 shadow-1 dark:shadow-card', className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {action}
      </div>

      <div className="-mx-3">{children}</div>

      {footer && (
        <div className="mt-4 border-t border-border pt-4">
          {footer}
        </div>
      )}
    </div>
  )
}
