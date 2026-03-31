import { cn } from '@/lib/utils'
import { cva } from 'class-variance-authority'
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'

const alertVariants = cva(
  'flex gap-4 w-full rounded-[10px] border-l-[6px] px-6 py-6 md:px-7 md:py-8',
  {
    variants: {
      variant: {
        success: 'border-[#219653] bg-[#219653]/[0.06] dark:bg-[#219653]/[0.12]',
        warning: 'border-[#FFA70B] bg-[#FFA70B]/[0.06] dark:bg-[#FFA70B]/[0.12]',
        error: 'border-[#F23030] bg-[#F23030]/[0.06] dark:bg-[#F23030]/[0.12]',
      },
    },
    defaultVariants: {
      variant: 'error',
    },
  },
)

const icons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
}

const titleColors = {
  success: 'text-[#219653] dark:text-[#34D399]',
  warning: 'text-[#FFA70B] dark:text-[#FFD06B]',
  error: 'text-[#F23030] dark:text-[#F56060]',
}

const descColors = {
  success: 'text-[#637381] dark:text-muted-foreground',
  warning: 'text-[#D0915C] dark:text-muted-foreground',
  error: 'text-[#CD5D5D] dark:text-muted-foreground',
}

interface NextAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant: 'success' | 'warning' | 'error'
  title: string
  description?: string
}

export function NextAlert({ className, variant, title, description, ...props }: NextAlertProps) {
  const IconComponent = icons[variant]

  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      <IconComponent className="size-6 shrink-0 mt-0.5" style={{ color: variant === 'success' ? '#219653' : variant === 'warning' ? '#FFA70B' : '#F23030' }} />
      <div className="w-full">
        <h5 className={cn('mb-1 font-bold leading-snug', titleColors[variant])}>
          {title}
        </h5>
        {description && (
          <p className={cn('text-sm', descColors[variant])}>
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
