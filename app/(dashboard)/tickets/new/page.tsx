'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createTicket } from '@/app/actions/tickets'
import { ArrowLeft, Save, FileText } from 'lucide-react'
import { TemplateSelector } from '@/components/tickets/template-selector'
import type { TemplateWithAttachments } from '@/lib/types/template'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function NewTicketPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    recipient_email: ''
  })
  const [attachments, setAttachments] = useState<File[]>([])
  const [isManagerOrAdmin, setIsManagerOrAdmin] = useState(false)

  // Check if user is Manager or Admin
  useEffect(() => {
    const checkRole = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        setIsManagerOrAdmin(profile?.role === 'manager' || profile?.role === 'admin')
      }
    }
    checkRole()
  }, [])

  const handleTemplateSelect = async (template: TemplateWithAttachments) => {
    // Insert template content into description field
    if (formData.description) {
      setFormData({ ...formData, description: formData.description + '\n\n' + template.content })
    } else {
      setFormData({ ...formData, description: template.content })
    }

    // If template has attachments, download and add them
    if (template.attachments && template.attachments.length > 0) {
      toast.info(`Template enthält ${template.attachments.length} Anhang/Anhänge. Diese werden beim Senden hinzugefügt.`)

      const templateFiles: File[] = []
      for (const attachment of template.attachments) {
        try {
          const response = await fetch(`/api/template-attachments/${attachment.id}`)
          if (!response.ok) throw new Error('Download failed')

          const blob = await response.blob()
          const file = new File([blob], attachment.original_filename, { type: attachment.mime_type })
          templateFiles.push(file)
        } catch (error) {
          console.error('Error downloading attachment:', error)
          toast.error(`Fehler beim Laden von ${attachment.original_filename}`)
        }
      }

      // Merge with existing attachments
      setAttachments(prev => [...prev, ...templateFiles])
    }

    toast.success('Vorlage eingefügt')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    // Validate file size (max 25MB per file)
    const validFiles = files.filter(file => {
      if (file.size > 25 * 1024 * 1024) {
        setError(`Datei "${file.name}" ist zu groß (max. 25MB)`)
        return false
      }
      return true
    })
    setAttachments(prev => [...prev, ...validFiles])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.subject.trim() || !formData.description.trim() || !formData.recipient_email.trim()) {
      setError('Bitte füllen Sie alle Pflichtfelder aus')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create FormData for file upload
      const submitData = new FormData()
      submitData.append('subject', formData.subject)
      submitData.append('description', formData.description)
      submitData.append('priority', formData.priority)
      submitData.append('recipient_email', formData.recipient_email)

      // Add attachments
      attachments.forEach(file => {
        submitData.append('attachments', file)
      })

      const result = await createTicket(submitData)

      if (result.success && result.data) {
        router.push(`/tickets/${result.data.id}`)
      } else {
        setError(result.error || 'Fehler beim Erstellen des Tickets')
        setLoading(false)
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/tickets">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Neues Ticket</h1>
          <p className="text-muted-foreground mt-1">
            Erstellen Sie eine neue Support-Anfrage
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket-Details</CardTitle>
          <CardDescription>
            Beschreiben Sie Ihr Anliegen so detailliert wie möglich
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient_email">
                E-Mail Empfänger <span className="text-red-500">*</span>
              </Label>
              <Input
                id="recipient_email"
                type="email"
                value={formData.recipient_email}
                onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                placeholder="z.B. kunde@example.com"
                disabled={loading}
                required
              />
              <p className="text-sm text-muted-foreground">
                Die E-Mail wird an diese Adresse gesendet und ein Ticket erstellt
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">
                Betreff <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Kurze Zusammenfassung des Problems"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Beschreibung <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detaillierte Beschreibung des Problems..."
                rows={8}
                disabled={loading}
                required
              />
              {isManagerOrAdmin && (
                <TemplateSelector
                  onSelectTemplate={handleTemplateSelect}
                  disabled={loading}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priorität</Label>
              <Select
                value={formData.priority}
                onValueChange={(priority) => setFormData({ ...formData, priority })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Niedrig</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="high">Hoch</SelectItem>
                  <SelectItem value="urgent">Dringend</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachments">Anhänge</Label>
              <Input
                id="attachments"
                type="file"
                multiple
                onChange={handleFileChange}
                disabled={loading}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
              />
              <p className="text-sm text-muted-foreground">
                Max. 25 MB pro Datei. Erlaubte Formate: Bilder, PDF, Office-Dokumente, Text, ZIP
              </p>
              {attachments.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {attachments.length} Datei(en) ausgewählt: {attachments.map(f => f.name).join(', ')}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Wird erstellt...' : 'Ticket erstellen'}
              </Button>
              <Link href="/tickets">
                <Button type="button" variant="outline" disabled={loading}>
                  Abbrechen
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
