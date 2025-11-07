'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { TemplateWithAttachments, TemplateCategory } from '@/lib/types/template'
import { CategoryLabels } from '@/lib/types/template'
import { createTemplate, updateTemplate, getTemplateAttachments, deleteTemplateAttachment } from '@/app/actions/templates'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, X, File, Trash2 } from 'lucide-react'

interface TemplateFormDialogProps {
  mode: 'create' | 'edit'
  template?: TemplateWithAttachments
  children: React.ReactNode
}

export function TemplateFormDialog({ mode, template, children }: TemplateFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(template?.name || '')
  const [content, setContent] = useState(template?.content || '')
  const [category, setCategory] = useState<TemplateCategory>(template?.category || 'general')
  const [attachments, setAttachments] = useState<Array<{ id: string; original_filename: string; size_bytes: number }>>(template?.attachments || [])
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setName(template?.name || '')
      setContent(template?.content || '')
      setCategory(template?.category || 'general')
      setAttachments(template?.attachments || [])
      setUploadingFiles([])
      setUploadProgress({})
    }
  }, [open, template])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setUploadingFiles(prev => [...prev, ...files])
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveUploadingFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Anhang wirklich löschen?')) return

    const result = await deleteTemplateAttachment(attachmentId)
    if (result.success) {
      setAttachments(prev => prev.filter(att => att.id !== attachmentId))
      toast.success('Anhang gelöscht')
    } else {
      toast.error(result.error || 'Fehler beim Löschen')
    }
  }

  const uploadFiles = async (templateId: string) => {
    if (uploadingFiles.length === 0) return

    for (const file of uploadingFiles) {
      setUploadProgress(prev => ({ ...prev, [file.name]: true }))

      const formData = new FormData()
      formData.append('file', file)
      formData.append('templateId', templateId)

      try {
        const response = await fetch('/api/template-attachments/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }

        const data = await response.json()
        if (data.success) {
          setAttachments(prev => [...prev, {
            id: data.attachment.id,
            original_filename: data.attachment.filename,
            size_bytes: data.attachment.size
          }])
        }
      } catch (error) {
        console.error('Upload error:', error)
        toast.error(`Fehler beim Hochladen von ${file.name}`)
      } finally {
        setUploadProgress(prev => ({ ...prev, [file.name]: false }))
      }
    }

    setUploadingFiles([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Bitte geben Sie einen Namen ein')
      return
    }

    if (!content.trim()) {
      toast.error('Bitte geben Sie einen Inhalt ein')
      return
    }

    setLoading(true)

    try {
      if (mode === 'create') {
        const result = await createTemplate({ name, content, category })
        if (result.success && result.data) {
          // Upload files after template creation
          await uploadFiles(result.data.id)
          toast.success('Vorlage erstellt')
          setOpen(false)
          router.refresh()
        } else {
          toast.error(result.error || 'Fehler beim Erstellen')
        }
      } else if (template) {
        const result = await updateTemplate(template.id, { name, content, category })
        if (result.success) {
          // Upload new files
          await uploadFiles(template.id)
          toast.success('Vorlage aktualisiert')
          setOpen(false)
          router.refresh()
        } else {
          toast.error(result.error || 'Fehler beim Aktualisieren')
        }
      }
    } catch (error) {
      toast.error('Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Neue Vorlage erstellen' : 'Vorlage bearbeiten'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Erstellen Sie eine wiederverwendbare Textvorlage mit optionalen Anhängen.'
              : 'Bearbeiten Sie die Vorlage und verwalten Sie Anhänge.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Begrüßung Freundlich"
              maxLength={100}
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Kategorie *</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as TemplateCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CategoryLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Inhalt *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Guten Tag,&#10;&#10;vielen Dank für Ihre Anfrage..."
              rows={10}
              required
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>Anhänge (optional)</Label>

            {/* Existing Attachments */}
            {attachments.length > 0 && (
              <div className="space-y-2 mb-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{att.original_filename}</span>
                      <span className="text-xs text-muted-foreground">
                        ({formatFileSize(att.size_bytes)})
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAttachment(att.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Files to Upload */}
            {uploadingFiles.length > 0 && (
              <div className="space-y-2 mb-2">
                {uploadingFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between p-2 border rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({formatFileSize(file.size)})
                      </span>
                      {uploadProgress[file.name] && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                    </div>
                    {!uploadProgress[file.name] && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUploadingFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv,.zip"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              Datei hinzufügen
            </Button>
            <p className="text-xs text-muted-foreground">
              Max 25 MB pro Datei. Erlaubt: PDF, Word, Excel, Bilder, TXT, CSV, ZIP
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === 'create' ? 'Erstellen' : 'Speichern'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
