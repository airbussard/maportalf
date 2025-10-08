'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { updateSignature } from '@/app/actions/settings'
import { Save } from 'lucide-react'

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
    <Card>
      <CardHeader>
        <CardTitle>E-Mail Signatur</CardTitle>
        <CardDescription>
          Passen Sie Ihre E-Mail-Signatur für Ticket-Antworten an
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
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="use_custom"
              checked={useCustom}
              onChange={(e) => setUseCustom(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <Label htmlFor="use_custom" className="cursor-pointer">
              Eigene E-Mail-Signatur verwenden
            </Label>
          </div>

          {useCustom && (
            <>
              <div className="space-y-2">
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

              <div className="space-y-2">
                <Label>Vorschau:</Label>
                <div className="p-4 bg-muted rounded-lg border border-border">
                  <pre className="text-sm whitespace-pre-wrap font-mono">{preview}</pre>
                </div>
              </div>
            </>
          )}

          <Button type="submit" disabled={loading} className="w-full md:w-auto">
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Wird gespeichert...' : 'Änderungen speichern'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
