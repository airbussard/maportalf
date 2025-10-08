'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { updatePassword } from '@/app/actions/settings'
import { Key } from 'lucide-react'

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
    <Card>
      <CardHeader>
        <CardTitle>Passwort ändern</CardTitle>
        <CardDescription>
          Ändern Sie Ihr Anmeldepasswort
        </CardDescription>
      </CardHeader>
      <CardContent>
        {message && (
          <div className={`mb-4 p-3 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new_password">Neues Passwort</Label>
            <Input
              id="new_password"
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              disabled={loading}
              placeholder="Mindestens 6 Zeichen"
              minLength={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Passwort bestätigen</Label>
            <Input
              id="confirm_password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              disabled={loading}
              placeholder="Passwort erneut eingeben"
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full md:w-auto">
            <Key className="w-4 h-4 mr-2" />
            {loading ? 'Wird geändert...' : 'Passwort ändern'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
