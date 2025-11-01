'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Upload } from 'lucide-react'
import { uploadDocument } from '@/app/actions/documents'
import { toast } from 'sonner'

interface Employee {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
}

interface DocumentUploadDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  employees: Employee[]
}

export function DocumentUploadDialog({
  isOpen,
  onClose,
  onSuccess,
  employees,
}: DocumentUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [docType, setDocType] = useState<'general' | 'personal'>('general')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleClose = () => {
    if (!loading) {
      setFile(null)
      setTitle('')
      setDescription('')
      setDocType('general')
      setAssignedTo('')
      onClose()
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (selectedFile: File) => {
    // Validate file size (10MB)
    if (selectedFile.size > 10485760) {
      toast.error('Datei ist zu groß. Maximum: 10MB')
      return
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'image/jpg'
    ]

    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error('Dateityp nicht erlaubt. Erlaubt: PDF, Word, Excel, PNG, JPG')
      return
    }

    setFile(selectedFile)

    // Auto-fill title from filename if empty
    if (!title) {
      const filename = selectedFile.name.replace(/\.[^/.]+$/, '')
      setTitle(filename)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      toast.error('Bitte wählen Sie eine Datei aus')
      return
    }

    if (!title.trim()) {
      toast.error('Bitte geben Sie einen Titel ein')
      return
    }

    if (docType === 'personal' && !assignedTo) {
      toast.error('Bitte wählen Sie einen Mitarbeiter aus')
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    formData.append('description', description)
    if (docType === 'personal' && assignedTo) {
      formData.append('assigned_to', assignedTo)
    }

    const result = await uploadDocument(formData)

    if (result.success) {
      onSuccess()
      handleClose()
    } else {
      toast.error(result.error || 'Upload fehlgeschlagen')
    }

    setLoading(false)
  }

  const getEmployeeName = (employee: Employee) => {
    if (employee.first_name && employee.last_name) {
      return `${employee.first_name} ${employee.last_name}`
    }
    return employee.email
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dokument hochladen</DialogTitle>
          <DialogDescription>
            Laden Sie ein neues Dokument hoch. Maximale Dateigröße: 10MB
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div>
            <Label>Datei auswählen *</Label>
            <div
              className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    Andere Datei wählen
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                  <div>
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer text-primary hover:text-primary/80 font-medium"
                    >
                      Datei auswählen
                    </label>
                    <span className="text-muted-foreground"> oder hierher ziehen</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PDF, Word, Excel, PNG, JPG (max. 10MB)
                  </p>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0])
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Arbeitsvertrag, Zeitnachweis..."
              required
              className="mt-2"
            />
          </div>

          {/* Document Type */}
          <div>
            <Label>Dokumenttyp *</Label>
            <RadioGroup
              value={docType}
              onValueChange={(value) => {
                setDocType(value as 'general' | 'personal')
                if (value === 'general') {
                  setAssignedTo('')
                }
              }}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="general" id="general" />
                <Label htmlFor="general" className="font-normal cursor-pointer">
                  Allgemeines Dokument (für alle sichtbar)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="personal" id="personal" />
                <Label htmlFor="personal" className="font-normal cursor-pointer">
                  Persönliches Dokument (für einen Mitarbeiter)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Employee Select (only for personal documents) */}
          {docType === 'personal' && (
            <div>
              <Label htmlFor="assigned_to">Mitarbeiter auswählen *</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Mitarbeiter wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {getEmployeeName(emp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div>
            <Label htmlFor="description">Beschreibung (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Zusätzliche Informationen zum Dokument..."
              rows={3}
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading || !file}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wird hochgeladen...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Hochladen
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
