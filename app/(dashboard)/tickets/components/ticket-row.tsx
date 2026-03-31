'use client'

import { useState } from 'react'
import type { Ticket } from '@/lib/types/ticket'
import { StatusBadge } from '@/components/tickets/status-badge'
import { PriorityBadge } from '@/components/tickets/priority-badge'
import { TagPill } from '@/components/tickets/tag-pill'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'
import { Eye, Flag } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { stripHtmlTags } from '@/lib/utils/html'
import { SpamDialog } from '@/components/tickets/spam-dialog'
import { markAsSpam } from '@/app/actions/tickets'
import { toast } from 'sonner'
import { buildTicketDetailUrl } from '@/lib/utils/navigation'

export function TicketRow({
  ticket,
  isManagerOrAdmin,
  isSelected,
  onSelect,
  searchParams
}: {
  ticket: Ticket
  isManagerOrAdmin: boolean
  isSelected?: boolean
  onSelect?: (ticketId: string, checked: boolean) => void
  searchParams: URLSearchParams
}) {
  const [showSpamDialog, setShowSpamDialog] = useState(false)
  const [isMarkingSpam, setIsMarkingSpam] = useState(false)

  // Build ticket detail URL with return state
  const ticketDetailUrl = buildTicketDetailUrl(ticket.id, searchParams)

  const ticketNumber = ticket.ticket_number
    ? `TICKET-${ticket.ticket_number.toString().padStart(6, '0')}`
    : `TICKET-${ticket.id.substring(0, 8)}`

  const assignedName = ticket.assigned_user
    ? `${ticket.assigned_user.first_name || ''} ${ticket.assigned_user.last_name || ''}`.trim() || ticket.assigned_user.email
    : 'Nicht zugewiesen'

  // Format exact date and time
  const formattedDate = format(new Date(ticket.created_at), 'dd.MM.yyyy', { locale: de })
  const formattedTime = format(new Date(ticket.created_at), 'HH:mm', { locale: de })

  // Get message preview (first 100 characters, strip HTML tags)
  const strippedText = ticket.description ? stripHtmlTags(ticket.description) : ''
  const messagePreview = strippedText
    ? strippedText.length > 100
      ? strippedText.slice(0, 100) + '...'
      : strippedText
    : 'Keine Beschreibung'

  const handleMarkAsSpam = async (blockEmail: boolean) => {
    setIsMarkingSpam(true)
    setShowSpamDialog(false)

    const result = await markAsSpam(ticket.id, blockEmail)

    if (result.success) {
      toast.success('Ticket als Spam markiert')
    } else {
      toast.error(result.error || 'Fehler beim Markieren als Spam')
    }

    setIsMarkingSpam(false)
  }

  return (
    <>
      <tr className="border-b border-[#eee] dark:border-dark-3 text-base font-medium text-foreground hover:bg-accent/30 transition-colors">
        {/* Checkbox */}
        {onSelect && (
          <td className="py-4 pl-5.5 xl:pl-7.5" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(ticket.id, checked as boolean)}
            />
          </td>
        )}

        {/* Title + Preview + Tags (product name column pattern) */}
        <td className="py-4 min-w-[200px]">
          <Link href={ticketDetailUrl} className="block group">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-mono text-muted-foreground">
                {ticketNumber}
              </span>
            </div>
            <h5 className="font-medium text-foreground group-hover:text-[#fbb928] transition-colors">
              {ticket.subject}
            </h5>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
              {messagePreview}
            </p>
          </Link>
          {ticket.tags && ticket.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {ticket.tags.map((tag) => (
                <TagPill key={tag.id} tag={tag} />
              ))}
            </div>
          )}
        </td>

        {/* Assignee */}
        <td className="py-4 hidden lg:table-cell">
          <span className="text-sm text-muted-foreground">{assignedName}</span>
        </td>

        {/* Status Badge */}
        <td className="py-4 hidden sm:table-cell">
          <StatusBadge status={ticket.status} />
        </td>

        {/* Priority Badge */}
        <td className="py-4 hidden md:table-cell">
          <PriorityBadge priority={ticket.priority} />
        </td>

        {/* Date */}
        <td className="py-4 hidden md:table-cell">
          <p className="text-sm text-muted-foreground">{formattedDate}</p>
          <p className="text-xs text-muted-foreground/70">{formattedTime} Uhr</p>
        </td>

        {/* Actions */}
        <td className="py-4 pr-5.5 xl:pr-7.5">
          <div className="flex items-center justify-end gap-3">
            <Link
              href={ticketDetailUrl}
              className="text-muted-foreground hover:text-[#fbb928] transition-colors"
              title="Ansehen"
            >
              <Eye className="size-[18px]" />
            </Link>
            {isManagerOrAdmin && (
              <button
                className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                onClick={() => setShowSpamDialog(true)}
                disabled={isMarkingSpam}
                title="Als Spam markieren"
              >
                <Flag className="size-[18px]" />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Spam Dialog */}
      <SpamDialog
        open={showSpamDialog}
        onOpenChange={setShowSpamDialog}
        onConfirm={handleMarkAsSpam}
        ticketEmail={ticket.created_from_email}
        ticketSubject={ticket.subject}
      />
    </>
  )
}
