'use client'

import { FileIcon, ImageIcon, FileTextIcon, TableIcon, Download } from 'lucide-react'
import type { TicketAttachment } from '@/lib/types/ticket'
import { cn } from '@/lib/utils'

interface AttachmentItemProps {
  attachment: TicketAttachment
  showDownload?: boolean
}

export function AttachmentItem({ attachment, showDownload = true }: AttachmentItemProps) {
  const getFileIcon = () => {
    const mimeType = attachment.mime_type

    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4" />
    }
    if (mimeType.includes('pdf') || mimeType.includes('word')) {
      return <FileTextIcon className="w-4 h-4" />
    }
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return <TableIcon className="w-4 h-4" />
    }
    return <FileIcon className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB'
    return (Math.round(bytes / 1048576 * 10) / 10) + ' MB'
  }

  const handleDownload = () => {
    window.open(`/api/attachments/${attachment.id}`, '_blank')
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30',
        'hover:bg-muted/50 hover:border-border/80 transition-all',
        showDownload && 'cursor-pointer hover:shadow-sm'
      )}
      onClick={showDownload ? handleDownload : undefined}
    >
      <div className="text-muted-foreground">
        {getFileIcon()}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium truncate max-w-[200px]" title={attachment.original_filename}>
          {attachment.original_filename}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatFileSize(attachment.size_bytes)}
        </span>
      </div>
      {showDownload && (
        <Download className="w-3.5 h-3.5 text-muted-foreground ml-1" />
      )}
    </div>
  )
}
