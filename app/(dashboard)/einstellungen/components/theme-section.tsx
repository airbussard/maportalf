'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
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
    <Card>
      <CardHeader>
        <CardTitle>Darstellung</CardTitle>
        <CardDescription>
          Wählen Sie Ihr bevorzugtes Farbschema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Label>Design-Modus</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themes.map(({ value, label, icon: Icon, description }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleThemeChange(value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                  theme === value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Icon className="w-6 h-6" />
                <div className="text-center">
                  <div className="font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">{description}</div>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Der System-Modus wechselt automatisch zwischen hell und dunkel basierend auf Ihren Systemeinstellungen
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
