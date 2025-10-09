'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Download, Mail, Loader2, Plus, X } from 'lucide-react'
import { getSavedRecipients } from '@/app/actions/time-reports'
import type { TimeReportRecipient } from '@/lib/types/time-tracking'

interface ReportExportDialogProps {
  isOpen: boolean
  onClose: () => void
  year: number
  month: number
  employeeId: string
  monthName: string
}

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]

export function ReportExportDialog({
  isOpen,
  onClose,
  year,
  month,
  employeeId,
  monthName,
}: ReportExportDialogProps) {
  const [activeTab, setActiveTab] = useState('download')
  const [loading, setLoading] = useState(false)
  const [savedRecipients, setSavedRecipients] = useState<TimeReportRecipient[]>([])
  const [recipients, setRecipients] = useState<string[]>([''])
  const [subject, setSubject] = useState(`Abrechnung ${monthName} ${year}`)
  const [body, setBody] = useState(
    `Sehr geehrte Damen und Herren,\n\nim Anhang befindet sich die Abrechnung für den Monat ${monthName} ${year}.\n\nMit freundlichen Grüßen`
  )
  const [saveRecipients, setSaveRecipients] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadSavedRecipients()
    }
  }, [isOpen])

  const loadSavedRecipients = async () => {
    const result = await getSavedRecipients()
    if (result.success && result.data) {
      setSavedRecipients(result.data)
    }
  }

  const handleDownload = () => {
    const url = `/api/zeiterfassung/pdf?year=${year}&month=${month}&employee=${employeeId}`
    window.open(url, '_blank')
  }

  const handleAddRecipient = () => {
    setRecipients([...recipients, ''])
  }

  const handleRemoveRecipient = (index: number) => {
    if (recipients.length > 1) {
      const newRecipients = recipients.filter((_, i) => i !== index)
      setRecipients(newRecipients)
    }
  }

  const handleRecipientChange = (index: number, value: string) => {
    const newRecipients = [...recipients]
    newRecipients[index] = value
    setRecipients(newRecipients)
  }

  const handleAddSavedRecipient = (email: string) => {
    // Check if already added
    if (recipients.includes(email)) {
      return
    }

    // Find empty field or add new
    const emptyIndex = recipients.findIndex((r) => !r.trim())
    if (emptyIndex !== -1) {
      const newRecipients = [...recipients]
      newRecipients[emptyIndex] = email
      setRecipients(newRecipients)
    } else {
      setRecipients([...recipients, email])
    }
  }

  const handleSendEmail = async () => {
    setError(null)
    setSuccess(null)

    // Validate recipients
    const validRecipients = recipients.filter((r) => r.trim() !== '')

    if (validRecipients.length === 0) {
      setError('Bitte geben Sie mindestens einen Empfänger an')
      return
    }

    if (!subject.trim()) {
      setError('Bitte geben Sie einen Betreff an')
      return
    }

    if (!body.trim()) {
      setError('Bitte geben Sie eine Nachricht an')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/zeiterfassung/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year,
          month,
          employee: employeeId,
          recipients: validRecipients,
          subject,
          body,
          save_recipients: saveRecipients,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(result.message || 'E-Mail erfolgreich versendet')
        setTimeout(() => {
          onClose()
        }, 2000)
      } else {
        setError(result.message || result.error || 'Fehler beim Versenden der E-Mail')
      }
    } catch (err: any) {
      setError(err.message || 'Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Zeitabrechnung exportieren</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {monthName} {year}
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="download">
              <Download className="w-4 h-4 mr-2" />
              PDF herunterladen
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              Per E-Mail versenden
            </TabsTrigger>
          </TabsList>

          <TabsContent value="download" className="space-y-4">
            <div className="border border-border rounded-lg p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground mb-4">
                Laden Sie den Monatsbericht als PDF herunter.
              </p>
              <Button onClick={handleDownload} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                PDF herunterladen
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 text-sm text-green-800 bg-green-50 border border-green-200 rounded-md">
                {success}
              </div>
            )}

            <div className="space-y-3">
              <Label>Empfänger</Label>
              {recipients.map((recipient, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    value={recipient}
                    onChange={(e) => handleRecipientChange(index, e.target.value)}
                    placeholder="E-Mail-Adresse"
                    className="flex-1"
                  />
                  {recipients.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveRecipient(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRecipient}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Weiteren Empfänger hinzufügen
              </Button>

              {savedRecipients.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Gespeicherte Empfänger (klicken zum Hinzufügen):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {savedRecipients.map((recipient) => (
                      <Badge
                        key={recipient.id}
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80"
                        onClick={() => handleAddSavedRecipient(recipient.email)}
                      >
                        {recipient.name || recipient.email}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Betreff</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Betreff"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Nachricht</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Nachricht"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Die E-Mail-Signatur wird automatisch hinzugefügt
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="save_recipients"
                checked={saveRecipients}
                onChange={(e) => setSaveRecipients(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="save_recipients" className="text-sm font-normal cursor-pointer">
                Neue E-Mail-Adressen für zukünftige Abrechnungen speichern
              </Label>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Abbrechen
              </Button>
              <Button onClick={handleSendEmail} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird versendet...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    E-Mail versenden
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
