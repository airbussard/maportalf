'use client'

import { useState, useRef, DragEvent, forwardRef, useImperativeHandle } from 'react'
import { Upload, X, FileIcon, ImageIcon, FileTextIcon, TableIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AttachmentUploadProps {
  ticketId: string
  onUploadComplete?: (attachmentIds: string[]) => void
  className?: string
}

interface SelectedFile {
  file: File
  id: string
  uploading: boolean
  progress: number
  uploadedAttachmentId?: string
}

export interface AttachmentUploadRef {
  uploadFiles: (messageId?: string) => Promise<string[]>
  hasFiles: () => boolean
  clear: () => void
}

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB

export const AttachmentUpload = forwardRef<AttachmentUploadRef, AttachmentUploadProps>(
  function AttachmentUpload({ ticketId, onUploadComplete, className }, ref) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    uploadFiles,
    hasFiles: () => selectedFiles.length > 0,
    clear: () => setSelectedFiles([])
  }))

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFiles(files)
    }
  }

  const handleFiles = (files: File[]) => {
    const newFiles: SelectedFile[] = []

    for (const file of files) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        alert(`Datei ${file.name} ist zu groß (max. 25 MB)`)
        continue
      }

      // Check if file already selected
      if (selectedFiles.find(f => f.file.name === file.name)) {
        continue
      }

      newFiles.push({
        file,
        id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
        uploading: false,
        progress: 0
      })
    }

    setSelectedFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id))
  }

  const uploadFiles = async (messageId?: string): Promise<string[]> => {
    const attachmentIds: string[] = []

    for (const selectedFile of selectedFiles) {
      // Skip already uploaded files
      if (selectedFile.uploadedAttachmentId) {
        attachmentIds.push(selectedFile.uploadedAttachmentId)
        continue
      }

      // Update to uploading state
      setSelectedFiles(prev =>
        prev.map(f => f.id === selectedFile.id ? { ...f, uploading: true, progress: 0 } : f)
      )

      try {
        const formData = new FormData()
        formData.append('attachment', selectedFile.file)
        formData.append('ticket_id', ticketId)

        // If messageId is provided, include it in the upload
        if (messageId) {
          formData.append('message_id', messageId)
        }

        const response = await fetch('/api/attachments/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`)
        }

        const result = await response.json()

        if (result.success && result.attachment?.id) {
          attachmentIds.push(result.attachment.id)

          // Update file as uploaded
          setSelectedFiles(prev =>
            prev.map(f =>
              f.id === selectedFile.id
                ? { ...f, uploading: false, progress: 100, uploadedAttachmentId: result.attachment.id }
                : f
            )
          )
        } else {
          throw new Error(result.error || 'Upload failed')
        }
      } catch (error: any) {
        console.error('Upload error:', error)
        alert(`Fehler beim Hochladen von ${selectedFile.file.name}: ${error.message}`)

        // Reset upload state
        setSelectedFiles(prev =>
          prev.map(f => f.id === selectedFile.id ? { ...f, uploading: false, progress: 0 } : f)
        )
      }
    }

    if (onUploadComplete) {
      onUploadComplete(attachmentIds)
    }

    return attachmentIds
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB'
    return (Math.round(bytes / 1048576 * 10) / 10) + ' MB'
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />
    if (mimeType.includes('pdf')) return <FileTextIcon className="w-4 h-4" />
    if (mimeType.includes('word')) return <FileTextIcon className="w-4 h-4" />
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <TableIcon className="w-4 h-4" />
    return <FileIcon className="w-4 h-4" />
  }

  // Expose upload function to parent
  if (typeof window !== 'undefined') {
    (window as any).__attachmentUpload = { uploadFiles }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30',
          'hover:border-primary/50 hover:bg-muted/50'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-foreground mb-2">
          Dateien hier ablegen oder{' '}
          <span className="text-primary underline">durchsuchen</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Maximale Dateigröße: 25 MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
          onChange={handleFileInput}
        />
      </div>

      {/* File List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((selectedFile) => (
            <div
              key={selectedFile.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border transition-colors',
                selectedFile.uploadedAttachmentId
                  ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900'
                  : 'bg-muted/50 border-border'
              )}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-muted-foreground">
                  {getFileIcon(selectedFile.file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedFile.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.file.size)}
                  </p>
                  {selectedFile.uploading && (
                    <div className="mt-1 w-full h-1 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${selectedFile.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
              {!selectedFile.uploading && (
                <button
                  type="button"
                  onClick={() => removeFile(selectedFile.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

// Hook to access upload function from parent
export function useAttachmentUpload() {
  return {
    uploadFiles: async () => {
      if (typeof window !== 'undefined' && (window as any).__attachmentUpload) {
        return await (window as any).__attachmentUpload.uploadFiles()
      }
      return []
    }
  }
}
