import { cn } from '@/lib/utils'

const presets: Record<string, { bg: string; text: string; darkBg?: string; darkText?: string }> = {
  success: { bg: 'bg-[#219653]/[0.08]', text: 'text-[#219653]', darkBg: 'dark:bg-[#219653]/[0.15]', darkText: 'dark:text-[#34D399]' },
  warning: { bg: 'bg-[#FFA70B]/[0.08]', text: 'text-[#FFA70B]', darkBg: 'dark:bg-[#FFA70B]/[0.15]', darkText: 'dark:text-[#FFD06B]' },
  error: { bg: 'bg-[#F23030]/[0.08]', text: 'text-[#F23030]', darkBg: 'dark:bg-[#F23030]/[0.15]', darkText: 'dark:text-[#F56060]' },
  info: { bg: 'bg-[#3C50E0]/[0.08]', text: 'text-[#3C50E0]', darkBg: 'dark:bg-[#3C50E0]/[0.15]', darkText: 'dark:text-[#6B8AFF]' },
  neutral: { bg: 'bg-[#6B7280]/[0.08]', text: 'text-[#6B7280]', darkBg: 'dark:bg-[#6B7280]/[0.15]', darkText: 'dark:text-[#9CA3AF]' },
  orange: { bg: 'bg-[#FF9C55]/[0.08]', text: 'text-[#FF9C55]', darkBg: 'dark:bg-[#FF9C55]/[0.15]', darkText: 'dark:text-[#FFB380]' },
  brand: { bg: 'bg-[#fbb928]/[0.08]', text: 'text-[#fbb928]', darkBg: 'dark:bg-[#fbb928]/[0.15]', darkText: 'dark:text-[#fbb928]' },
}

interface StatusBadgeProps {
  children: React.ReactNode
  variant?: keyof typeof presets
  className?: string
}

export function StatusBadge({ children, variant = 'neutral', className }: StatusBadgeProps) {
  const p = presets[variant]
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
      p.bg, p.text, p.darkBg, p.darkText,
      className,
    )}>
      {children}
    </span>
  )
}
