'use client'

import { cn } from '@/lib/utils'
import { useId } from 'react'

interface TextAreaGroupProps {
  label: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  icon?: React.ReactNode
  defaultValue?: string
  value?: string
  rows?: number
  name?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}

export function TextAreaGroup({
  label,
  placeholder,
  required,
  disabled,
  className,
  icon,
  defaultValue,
  value,
  rows = 6,
  name,
  onChange,
}: TextAreaGroupProps) {
  const id = useId()

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-3 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 select-none text-destructive">*</span>}
      </label>

      <div className="relative [&_svg]:pointer-events-none [&_svg]:absolute [&_svg]:left-5 [&_svg]:top-5 [&_svg]:text-muted-foreground">
        <textarea
          id={id}
          name={name}
          rows={rows}
          placeholder={placeholder}
          defaultValue={defaultValue}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={cn(
            'w-full rounded-lg border-[1.5px] border-border bg-transparent px-5 py-3 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[#fbb928] disabled:cursor-default disabled:bg-muted dark:border-muted dark:bg-muted/30 dark:focus:border-[#fbb928]',
            icon && 'py-5 pl-13 pr-5',
          )}
        />
        {icon}
      </div>
    </div>
  )
}
