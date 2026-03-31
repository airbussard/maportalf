'use client'

import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'

interface SelectGroupProps {
  label: string
  items: { value: string; label: string }[]
  placeholder?: string
  defaultValue?: string
  prefixIcon?: React.ReactNode
  className?: string
  name?: string
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

export function SelectGroup({
  items,
  label,
  defaultValue,
  placeholder,
  prefixIcon,
  className,
  name,
  onChange,
}: SelectGroupProps) {
  const id = useId()
  const [isSelected, setIsSelected] = useState(!!defaultValue)

  return (
    <div className={cn('space-y-3', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>

      <div className="relative">
        {prefixIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            {prefixIcon}
          </div>
        )}

        <select
          id={id}
          name={name}
          defaultValue={defaultValue || ''}
          onChange={(e) => {
            setIsSelected(true)
            onChange?.(e)
          }}
          className={cn(
            'w-full appearance-none rounded-lg border-[1.5px] border-border bg-transparent px-5 py-3 outline-none transition focus:border-[#fbb928] dark:border-muted dark:bg-muted/30 dark:focus:border-[#fbb928] [&>option]:text-muted-foreground',
            isSelected && 'text-foreground',
            !isSelected && 'text-muted-foreground',
            prefixIcon && 'pl-11',
          )}
        >
          {placeholder && (
            <option value="" disabled hidden>{placeholder}</option>
          )}
          {items.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>

        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  )
}
