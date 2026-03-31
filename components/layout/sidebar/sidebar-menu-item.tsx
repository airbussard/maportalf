'use client'

import { cn } from '@/lib/utils'
import { cva } from 'class-variance-authority'
import Link from 'next/link'
import { useSidebarContext } from './sidebar-context'

const menuItemStyles = cva(
  'rounded-lg px-3.5 font-medium text-muted-foreground transition-all duration-200',
  {
    variants: {
      isActive: {
        true: 'bg-[#fbb928]/10 text-[#fbb928] hover:bg-[#fbb928]/15',
        false: 'hover:bg-accent hover:text-foreground',
      },
      isHighlight: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        isActive: true,
        isHighlight: true,
        className: 'bg-red-500/10 text-red-500 hover:bg-red-500/15',
      },
      {
        isActive: false,
        isHighlight: true,
        className: 'text-red-500 hover:bg-red-500/10',
      },
    ],
    defaultVariants: {
      isActive: false,
      isHighlight: false,
    },
  },
)

export function SidebarMenuItem(
  props: {
    className?: string
    children: React.ReactNode
    isActive: boolean
    isHighlight?: boolean
  } & ({ as?: 'button'; onClick: () => void } | { as: 'link'; href: string }),
) {
  const { toggleSidebar, isMobile } = useSidebarContext()

  if (props.as === 'link') {
    return (
      <Link
        href={props.href}
        onClick={() => isMobile && toggleSidebar()}
        className={cn(
          menuItemStyles({
            isActive: props.isActive,
            isHighlight: props.isHighlight,
            className: 'relative block py-2',
          }),
          props.className,
        )}
      >
        {props.children}
      </Link>
    )
  }

  return (
    <button
      onClick={props.onClick}
      aria-expanded={props.isActive}
      className={menuItemStyles({
        isActive: props.isActive,
        isHighlight: props.isHighlight,
        className: 'flex w-full items-center gap-3 py-3',
      })}
    >
      {props.children}
    </button>
  )
}
