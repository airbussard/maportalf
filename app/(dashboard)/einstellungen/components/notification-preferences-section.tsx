'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { updateNotificationPreferences } from '@/app/actions/notifications'
import { Bell, Ticket, Calendar, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

interface NotificationPreferencesSectionProps {
  role: string
  notificationSettings: Record<string, boolean>
}

interface NotificationType {
  key: string
  label: string
  description: string
  icon: React.ReactNode
}

export function NotificationPreferencesSection({
  role,
  notificationSettings
}: NotificationPreferencesSectionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState(notificationSettings)

  // Only show for Manager/Admin
  if (role !== 'manager' && role !== 'admin') {
    return null
  }

  const notificationTypes: NotificationType[] = [
    {
      key: 'new_ticket',
      label: 'Neue Tickets',
      description: 'Benachrichtigung wenn neue Tickets erstellt werden',
      icon: <Ticket className="w-5 h-5 text-primary" />
    },
    {
      key: 'work_request',
      label: 'Arbeitsanträge',
      description: 'Benachrichtigung bei neuen Arbeitsanträgen (Urlaub, Krank, etc.)',
      icon: <Calendar className="w-5 h-5 text-primary" />
    },
    {
      key: 'ticket_assignment',
      label: 'Ticket-Zuweisungen',
      description: 'Benachrichtigung wenn Ihnen ein Ticket zugewiesen wird',
      icon: <UserPlus className="w-5 h-5 text-primary" />
    }
  ]

  const handleToggle = async (key: string, checked: boolean) => {
    setIsLoading(true)

    const newSettings = {
      ...settings,
      [key]: checked
    }

    setSettings(newSettings)

    try {
      const result = await updateNotificationPreferences(newSettings)

      if (result.success) {
        toast.success('Einstellungen gespeichert')
      } else {
        // Revert on error
        setSettings(settings)
        toast.error(result.error || 'Fehler beim Speichern')
      }
    } catch (error) {
      // Revert on error
      setSettings(settings)
      toast.error('Ein Fehler ist aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          <CardTitle>Benachrichtigungseinstellungen</CardTitle>
        </div>
        <CardDescription>
          Wählen Sie, welche In-App-Benachrichtigungen Sie erhalten möchten
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {notificationTypes.map((type) => (
            <div
              key={type.key}
              className="flex items-center justify-between space-x-4 pb-4 border-b last:border-0 last:pb-0"
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="p-2 rounded-lg bg-primary/10">
                  {type.icon}
                </div>
                <div className="flex-1">
                  <Label
                    htmlFor={`notif-${type.key}`}
                    className="text-base font-medium cursor-pointer"
                  >
                    {type.label}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {type.description}
                  </p>
                </div>
              </div>
              <Switch
                id={`notif-${type.key}`}
                checked={settings[type.key] !== false} // Default to true if not set
                onCheckedChange={(checked) => handleToggle(type.key, checked)}
                disabled={isLoading}
              />
            </div>
          ))}

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Diese Einstellungen betreffen nur die Benachrichtigungen im System (Bell-Icon oben rechts).
              E-Mail-Benachrichtigungen können separat in den Benachrichtigungseinstellungen konfiguriert werden.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
