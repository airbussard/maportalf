'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { updateProfile } from '@/app/actions/settings'
import { updateEmployeeEmail } from '@/app/actions/employees'
import { Save } from 'lucide-react'

interface Profile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  department?: string
  address?: string
  role: string
}

export function ProfileSection({ profile }: { profile: Profile }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [formData, setFormData] = useState({
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    department: profile.department || '',
    address: profile.address || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // Update email if changed
    if (formData.email !== profile.email) {
      const emailResult = await updateEmployeeEmail(profile.id, formData.email)
      if (!emailResult.success) {
        setMessage({ type: 'error', text: emailResult.error || 'Fehler beim Ändern der E-Mail' })
        setLoading(false)
        return
      }
    }

    // Update other profile fields
    const { email, ...profileData } = formData
    const result = await updateProfile(profileData)

    if (result.success) {
      setMessage({ type: 'success', text: 'Profil erfolgreich aktualisiert!' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Fehler beim Speichern' })
    }

    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Persönliche Informationen</CardTitle>
        <CardDescription>
          Aktualisieren Sie Ihre Kontaktdaten und persönlichen Informationen
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Vorname</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Nachname</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={loading}
            />
            {formData.email !== profile.email && (
              <p className="text-xs text-amber-600">
                E-Mail-Adresse wird geändert. Nach dem Speichern müssen Sie sich neu anmelden.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={loading}
                placeholder="z.B. +49 123 456789"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Abteilung/Position</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                disabled={loading}
                placeholder="z.B. Flugsimulator-Techniker"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              disabled={loading}
              placeholder="Straße, PLZ Stadt"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full md:w-auto">
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Wird gespeichert...' : 'Änderungen speichern'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
