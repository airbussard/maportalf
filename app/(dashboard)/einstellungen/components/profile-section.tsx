'use client'

import { useState } from 'react'
import { InputGroup, NextAlert } from '@/components/nextadmin'
import { updateProfile } from '@/app/actions/settings'
import { updateEmployeeEmail } from '@/app/actions/employees'
import { User, Mail, Phone, Building2, MapPin } from 'lucide-react'

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
    <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
      <h2 className="border-b border-border px-4 py-4 text-base font-medium text-foreground sm:px-6 xl:px-7.5">
        Persönliche Informationen
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

        {/* Two-column grid for name fields */}
        <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
          <InputGroup
            className="w-full sm:w-1/2"
            label="Vorname"
            icon={<User className="w-5 h-5" />}
            iconPosition="left"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            disabled={loading}
          />

          <InputGroup
            className="w-full sm:w-1/2"
            label="Nachname"
            icon={<User className="w-5 h-5" />}
            iconPosition="left"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            disabled={loading}
          />
        </div>

        {/* Email field */}
        <div className="mb-5.5">
          <InputGroup
            label="E-Mail"
            type="email"
            icon={<Mail className="w-5 h-5" />}
            iconPosition="left"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={loading}
          />
          {formData.email !== profile.email && (
            <p className="text-xs text-amber-600 mt-1.5 ml-1">
              E-Mail-Adresse wird geändert. Nach dem Speichern müssen Sie sich neu anmelden.
            </p>
          )}
        </div>

        {/* Two-column grid for phone and department */}
        <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
          <InputGroup
            className="w-full sm:w-1/2"
            label="Telefon"
            type="tel"
            icon={<Phone className="w-5 h-5" />}
            iconPosition="left"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={loading}
            placeholder="z.B. +49 123 456789"
          />

          <InputGroup
            className="w-full sm:w-1/2"
            label="Abteilung/Position"
            icon={<Building2 className="w-5 h-5" />}
            iconPosition="left"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            disabled={loading}
            placeholder="z.B. Flugsimulator-Techniker"
          />
        </div>

        {/* Address field */}
        <div className="mb-5.5">
          <InputGroup
            label="Adresse"
            icon={<MapPin className="w-5 h-5" />}
            iconPosition="left"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            disabled={loading}
            placeholder="Straße, PLZ Stadt"
          />
        </div>

        {/* Action buttons - NextAdmin style */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setFormData({
              first_name: profile.first_name || '',
              last_name: profile.last_name || '',
              email: profile.email || '',
              phone: profile.phone || '',
              department: profile.department || '',
              address: profile.address || '',
            })}
            className="rounded-lg border border-border px-6 py-2.5 font-medium text-foreground hover:shadow-1 transition-shadow"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#fbb928] px-6 py-2.5 font-medium text-zinc-900 hover:bg-[#e5a820] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Wird gespeichert...' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  )
}
