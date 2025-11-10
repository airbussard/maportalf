'use client'

import { useRef, useState, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react'

interface CodeInputProps {
  length?: number
  onComplete: (code: string) => void
  disabled?: boolean
  error?: boolean
}

export function CodeInput({ length = 6, onComplete, disabled = false, error = false }: CodeInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    const newValues = [...values]
    newValues[index] = value

    setValues(newValues)

    // Auto-focus next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Check if all fields are filled
    if (newValues.every(v => v)) {
      onComplete(newValues.join(''))
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (!values[index] && index > 0) {
        // If current field is empty, focus previous and clear it
        const newValues = [...values]
        newValues[index - 1] = ''
        setValues(newValues)
        inputRefs.current[index - 1]?.focus()
      } else {
        // Clear current field
        const newValues = [...values]
        newValues[index] = ''
        setValues(newValues)
      }
    }

    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text/plain').trim()

    // Only allow digits
    const digits = pastedData.replace(/\D/g, '').slice(0, length)

    if (digits) {
      const newValues = Array(length).fill('')
      digits.split('').forEach((digit, i) => {
        if (i < length) {
          newValues[i] = digit
        }
      })

      setValues(newValues)

      // Focus last filled input or first empty
      const lastFilledIndex = Math.min(digits.length - 1, length - 1)
      inputRefs.current[lastFilledIndex]?.focus()

      // Check if all fields are filled
      if (newValues.every(v => v)) {
        onComplete(newValues.join(''))
      }
    }
  }

  const handleFocus = (index: number) => {
    // Select the content on focus for easy replacement
    inputRefs.current[index]?.select()
  }

  return (
    <div className="flex justify-center gap-3">
      {values.map((value, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          className={`
            w-12 h-14 sm:w-14 sm:h-16
            text-center text-2xl font-bold
            border-2 rounded-lg
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50'
              : 'border-gray-300 focus:border-[#fbb928] focus:ring-[#fbb928] hover:border-gray-400'
            }
          `}
          autoComplete="off"
          aria-label={`Digit ${index + 1} of ${length}`}
        />
      ))}
    </div>
  )
}
