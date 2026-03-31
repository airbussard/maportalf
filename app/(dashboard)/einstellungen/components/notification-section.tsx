'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { updateNotificationSettings } from '@/app/actions/settings'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'

interface NotificationSectionProps {
  role: string
  receiveRequestEmails: boolean
}

export function NotificationSection({ role, receiveRequestEmails }: NotificationSectionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(receiveRequestEmails)

  // Only show for Manager/Admin
  if (role !== 'manager' && role !== 'admin') {
    return null
  }

  const handleToggle = async (checked: boolean) => {
    setIsLoading(true)
    setEmailEnabled(checked)

    try {
      const result = await updateNotificationSettings({
        receive_request_emails: checked
      })

      if (result.success) {
        toast.success(
          checked
            ? 'E-Mail-Benachrichtigungen aktiviert'
            : 'E-Mail-Benachrichtigungen deaktiviert'
        )
      } else {
        // Revert on error
        setEmailEnabled(!checked)
        toast.error(result.error || 'Fehler beim Speichern')
      }
    } catch (error) {
      // Revert on error
      setEmailEnabled(!checked)
      toast.error('Ein Fehler ist aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
      <h2 className="border-b border-border px-4 py-4 text-base font-medium text-foreground sm:px-6 xl:px-7.5">
        Benachrichtigungen
      </h2>
      <div className="p-4 sm:p-6 xl:p-7.5">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-3 flex-1">
            <div className="rounded-full p-2.5 bg-[#fbb928]/10">
              <Mail className="w-5 h-5 text-[#fbb928]" />
            </div>
            <div className="flex-1">
              <Label htmlFor="request-emails" className="text-base font-medium cursor-pointer">
                Requests per Mail
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Erhalten Sie E-Mails wenn neue Arbeitsanträge eingehen mit direkter Genehmigung/Ablehnung
              </p>
            </div>
          </div>
          <Switch
            id="request-emails"
            checked={emailEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        </div>

        <div className="pt-4 mt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Diese Einstellung ist nur für Manager und Administratoren verfügbar.
            E-Mails enthalten Buttons zum direkten Annehmen oder Ablehnen von Arbeitsanträgen.
          </p>
        </div>
      </div>
    </div>
  )
}
