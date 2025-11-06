'use client'

import type { Ticket } from '@/lib/types/ticket'
import { StatusBadge } from '@/components/tickets/status-badge'
import { PriorityBadge } from '@/components/tickets/priority-badge'
import { TagPill } from '@/components/tickets/tag-pill'
import { formatDistanceToNow, format } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { stripHtmlTags } from '@/lib/utils/html'

export function TicketRow({
  ticket,
  isManagerOrAdmin,
  isSelected,
  onSelect
}: {
  ticket: Ticket
  isManagerOrAdmin: boolean
  isSelected?: boolean
  onSelect?: (ticketId: string, checked: boolean) => void
}) {
  const ticketNumber = ticket.ticket_number
    ? `TICKET-${ticket.ticket_number.toString().padStart(6, '0')}`
    : `TICKET-${ticket.id.substring(0, 8)}`

  const assignedName = ticket.assigned_user
    ? `${ticket.assigned_user.first_name || ''} ${ticket.assigned_user.last_name || ''}`.trim() || ticket.assigned_user.email
    : 'Nicht zugewiesen'

  // Format exact date and time
  const formattedDate = format(new Date(ticket.created_at), 'dd.MM.yyyy, HH:mm', { locale: de })

  // Get message preview (first 100 characters, strip HTML tags)
  const strippedText = ticket.description ? stripHtmlTags(ticket.description) : ''
  const messagePreview = strippedText
    ? strippedText.length > 100
      ? strippedText.slice(0, 100) + '...'
      : strippedText
    : 'Keine Beschreibung'

  return (
    <div className="p-4 hover:bg-muted/50 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {onSelect && (
          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(ticket.id, checked as boolean)}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-mono text-muted-foreground">
              {ticketNumber}
            </span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>

          <Link
            href={`/tickets/${ticket.id}`}
            className="text-base font-medium hover:underline block mb-2"
          >
            {ticket.subject}
          </Link>

          {/* Message preview */}
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {messagePreview}
          </p>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Zugewiesen: {assignedName}</span>
            <span>•</span>
            <span>{formattedDate}</span>
          </div>

          {ticket.tags && ticket.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {ticket.tags.map((tag) => (
                <TagPill key={tag.id} tag={tag} />
              ))}
            </div>
          )}
        </div>

        <div className="flex md:flex-col gap-2">
          <Link href={`/tickets/${ticket.id}`}>
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              Ansehen
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
