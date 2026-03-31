'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { updateProfile } from '@/app/actions/settings'
import { Sun, Moon, Monitor } from 'lucide-react'

export function ThemeSection({ currentTheme }: { currentTheme: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme)

    // Update theme in database
    await updateProfile({
      first_name: '', // Will be ignored by update
      last_name: '',  // Will be ignored by update
      theme_preference: newTheme
    })
  }

  if (!mounted) {
    return null
  }

  const themes = [
    { value: 'light', label: 'Hell', icon: Sun, description: 'Tag-Modus' },
    { value: 'dark', label: 'Dunkel', icon: Moon, description: 'Nacht-Modus' },
    { value: 'system', label: 'System', icon: Monitor, description: 'Automatisch' },
  ]

  return (
    <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
      <h2 className="border-b border-border px-4 py-4 text-base font-medium text-foreground sm:px-6 xl:px-7.5">
        Erscheinungsbild
      </h2>
      <div className="p-4 sm:p-6 xl:p-7.5">
        <div className="grid grid-cols-3 gap-4">
          {themes.map(({ value, label, icon: Icon, description }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleThemeChange(value)}
              className={`flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-all ${
                theme === value
                  ? 'border-[#fbb928] bg-[#fbb928]/5 shadow-sm'
                  : 'border-border hover:border-[#fbb928]/50 hover:bg-accent/50'
              }`}
            >
              <div className={`rounded-full p-2.5 ${
                theme === value ? 'bg-[#fbb928]/15 text-[#fbb928]' : 'bg-muted text-muted-foreground'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-foreground">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Der System-Modus wechselt automatisch zwischen hell und dunkel basierend auf Ihren Systemeinstellungen.
        </p>
      </div>
    </div>
  )
}
