'use client'

import { cn } from '@/lib/utils'
import { useId, type HTMLInputTypeAttribute } from 'react'

interface InputGroupProps {
  className?: string
  label: string
  placeholder?: string
  type?: HTMLInputTypeAttribute
  required?: boolean
  disabled?: boolean
  value?: string
  defaultValue?: string
  name?: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  height?: 'sm' | 'default'
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function InputGroup({
  className,
  label,
  type = 'text',
  placeholder,
  required,
  disabled,
  value,
  defaultValue,
  name,
  icon,
  iconPosition = 'left',
  height = 'default',
  onChange,
}: InputGroupProps) {
  const id = useId()

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-3 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 select-none text-destructive">*</span>}
      </label>

      <div className={cn(
        'relative [&_svg]:absolute [&_svg]:top-1/2 [&_svg]:-translate-y-1/2 [&_svg]:text-muted-foreground',
        iconPosition === 'left' ? '[&_svg]:left-4' : '[&_svg]:right-4',
      )}>
        <input
          id={id}
          type={type}
          name={name}
          placeholder={placeholder}
          onChange={onChange}
          value={value}
          defaultValue={defaultValue}
          required={required}
          disabled={disabled}
          className={cn(
            'w-full rounded-lg border-[1.5px] border-border bg-transparent px-5 py-3 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[#fbb928] disabled:cursor-default disabled:bg-muted dark:border-muted dark:bg-muted/30 dark:focus:border-[#fbb928]',
            iconPosition === 'left' && icon && 'pl-12',
            iconPosition === 'right' && icon && 'pr-12',
            height === 'sm' && 'py-2.5',
          )}
        />
        {icon}
      </div>
    </div>
  )
}
