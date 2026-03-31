import { cn } from '@/lib/utils'

interface TableCardProps {
  title?: string
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function TableCard({ title, children, action, className }: TableCardProps) {
  return (
    <div className={cn('rounded-[10px] bg-card shadow-1 dark:shadow-card', className)}>
      {title && (
        <div className="flex items-center justify-between px-7.5 pt-7.5 pb-4">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          {action}
        </div>
      )}
      <div className="px-7.5 pb-4">{children}</div>
    </div>
  )
}
