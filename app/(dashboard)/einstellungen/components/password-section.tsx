'use client'

import { useState } from 'react'
import { InputGroup, NextAlert } from '@/components/nextadmin'
import { updatePassword } from '@/app/actions/settings'
import { Lock } from 'lucide-react'

export function PasswordSection() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Die Passwörter stimmen nicht überein' })
      setLoading(false)
      return
    }

    // Validate password length
    if (formData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Das Passwort muss mindestens 6 Zeichen lang sein' })
      setLoading(false)
      return
    }

    const result = await updatePassword(formData.newPassword)

    if (result.success) {
      setMessage({ type: 'success', text: 'Passwort erfolgreich geändert!' })
      setFormData({ newPassword: '', confirmPassword: '' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Fehler beim Ändern des Passworts' })
    }

    setLoading(false)
  }

  return (
    <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
      <h2 className="border-b border-border px-4 py-4 text-base font-medium text-foreground sm:px-6 xl:px-7.5">
        Passwort ändern
      </h2>

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 xl:p-7.5">
        {message && (
          <NextAlert
            variant={message.type === 'success' ? 'success' : 'error'}
            title={message.type === 'success' ? 'Erfolg' : 'Fehler'}
            description={message.text}
            className="mb-5.5"
          />
        )}

        <div className="mb-5.5">
          <InputGroup
            label="Neues Passwort"
            type="password"
            icon={<Lock className="w-5 h-5" />}
            iconPosition="left"
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            disabled={loading}
            placeholder="Mindestens 6 Zeichen"
            required
          />
        </div>

        <div className="mb-5.5">
          <InputGroup
            label="Passwort bestätigen"
            type="password"
            icon={<Lock className="w-5 h-5" />}
            iconPosition="left"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            disabled={loading}
            placeholder="Passwort erneut eingeben"
            required
          />
        </div>

        {/* Action buttons - NextAdmin style */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setFormData({ newPassword: '', confirmPassword: '' })}
            className="rounded-lg border border-border px-6 py-2.5 font-medium text-foreground hover:shadow-1 transition-shadow"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#fbb928] px-6 py-2.5 font-medium text-zinc-900 hover:bg-[#e5a820] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Wird geändert...' : 'Passwort ändern'}
          </button>
        </div>
      </form>
    </div>
  )
}
