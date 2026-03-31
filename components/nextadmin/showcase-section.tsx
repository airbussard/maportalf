import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface ShowcaseSectionProps {
  title: string
  children: ReactNode
  className?: string
}

export function ShowcaseSection({ title, children, className }: ShowcaseSectionProps) {
  return (
    <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
      <h2 className="border-b border-border px-4 py-4 font-medium text-foreground sm:px-6 xl:px-7.5">
        {title}
      </h2>
      <div className={cn('p-4 sm:p-6 xl:p-7.5', className)}>{children}</div>
    </div>
  )
}
