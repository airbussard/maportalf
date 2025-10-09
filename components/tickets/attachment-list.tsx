'use client'

import type { TicketAttachment } from '@/lib/types/ticket'
import { AttachmentItem } from './attachment-item'

interface AttachmentListProps {
  attachments: TicketAttachment[]
  title?: string
}

export function AttachmentList({ attachments, title }: AttachmentListProps) {
  if (!attachments || attachments.length === 0) {
    return null
  }

  return (
    <div className="mt-4 pt-4 border-t border-border">
      {title && (
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">
          {title}
        </h4>
      )}
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <AttachmentItem key={attachment.id} attachment={attachment} />
        ))}
      </div>
    </div>
  )
}
