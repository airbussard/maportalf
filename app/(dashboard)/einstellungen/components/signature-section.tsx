'use client'

import { useState, useEffect } from 'react'
import { NextAlert } from '@/components/nextadmin'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateSignature } from '@/app/actions/settings'

interface Profile {
  first_name?: string
  last_name?: string
  department?: string
  email: string
}

const DEFAULT_SIGNATURE = `{{first_name}} vom Team FLIGHTHOUR
{{department}}

Ticket: {{ticket_number}}

{{logo}}

Web: https://flighthour.de
E-Mail: info@flighthour.de
Tel: +49 208 30660 320`

export function SignatureSection({
  emailSignature,
  useCustomSignature,
  profile
}: {
  emailSignature: string
  useCustomSignature: boolean
  profile: Profile
}) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [useCustom, setUseCustom] = useState(useCustomSignature)
  const [signature, setSignature] = useState(emailSignature || DEFAULT_SIGNATURE)
  const [preview, setPreview] = useState('')

  useEffect(() => {
    updatePreview()
  }, [signature, profile])

  const updatePreview = () => {
    const rendered = signature
      .replace(/{{first_name}}/g, profile.first_name || 'Max')
      .replace(/{{last_name}}/g, profile.last_name || 'Mustermann')
      .replace(/{{department}}/g, profile.department || 'Abteilung')
      .replace(/{{email}}/g, profile.email)
      .replace(/{{ticket_number}}/g, 'TICKET-123456')
      .replace(/{{logo}}/g, '[FLIGHTHOUR Logo]')

    setPreview(rendered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const result = await updateSignature({
      email_signature: signature,
      use_custom_signature: useCustom
    })

    if (result.success) {
      setMessage({ type: 'success', text: 'E-Mail Signatur erfolgreich aktualisiert!' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Fehler beim Speichern' })
    }

    setLoading(false)
  }

  return (
    <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
      <h2 className="border-b border-border px-4 py-4 text-base font-medium text-foreground sm:px-6 xl:px-7.5">
        E-Mail Signatur
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

        <div className="mb-5.5 flex items-center space-x-2">
          <input
            type="checkbox"
            id="use_custom"
            checked={useCustom}
            onChange={(e) => setUseCustom(e.target.checked)}
            className="w-4 h-4 rounded border-border accent-[#fbb928]"
          />
          <Label htmlFor="use_custom" className="cursor-pointer">
            Eigene E-Mail-Signatur verwenden
          </Label>
        </div>

        {useCustom && (
          <>
            <div className="mb-5.5 space-y-2">
              <Label htmlFor="signature">E-Mail Signatur bearbeiten</Label>
              <Textarea
                id="signature"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                disabled={loading}
                rows={10}
                className="font-mono text-sm"
                placeholder={DEFAULT_SIGNATURE}
              />
              <p className="text-xs text-muted-foreground">
                Verfügbare Platzhalter: {'{'}
                {'{'} first_name {'}'}
                {'}'}, {'{'}
                {'{'} last_name {'}'}
                {'}'}, {'{'}
                {'{'} department {'}'}
                {'}'}, {'{'}
                {'{'} email {'}'}
                {'}'}, {'{'}
                {'{'} ticket_number {'}'}
                {'}'}, {'{'}
                {'{'} logo {'}'}
                {'}'}
              </p>
            </div>

            <div className="mb-5.5 space-y-2">
              <Label>Vorschau:</Label>
              <div className="p-4 bg-muted rounded-lg border border-border">
                <pre className="text-sm whitespace-pre-wrap font-mono">{preview}</pre>
              </div>
            </div>
          </>
        )}

        {/* Action buttons - NextAdmin style */}
        <div className="flex justify-end gap-3">
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
