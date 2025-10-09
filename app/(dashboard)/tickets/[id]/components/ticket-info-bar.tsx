'use client'

import { useState } from 'react'
import type { Ticket, Tag } from '@/lib/types/ticket'
import { StatusBadge } from '@/components/tickets/status-badge'
import { PriorityBadge } from '@/components/tickets/priority-badge'
import { TagPill } from '@/components/tickets/tag-pill'
import { TagsSelector } from './tags-selector'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateTicket, updateTicketTags } from '@/app/actions/tickets'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

export function TicketInfoBar({
  ticket,
  managers,
  tags,
  isManagerOrAdmin
}: {
  ticket: Ticket
  managers: any[]
  tags: Tag[]
  isManagerOrAdmin: boolean
}) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)

  const handleStatusChange = async (status: string) => {
    setUpdating(true)
    await updateTicket(ticket.id, { status })
    router.refresh()
    setUpdating(false)
  }

  const handlePriorityChange = async (priority: string) => {
    setUpdating(true)
    await updateTicket(ticket.id, { priority })
    router.refresh()
    setUpdating(false)
  }

  const handleAssignmentChange = async (assigned_to: string) => {
    setUpdating(true)
    await updateTicket(ticket.id, { assigned_to: assigned_to === 'none' ? null : assigned_to })
    router.refresh()
    setUpdating(false)
  }

  const creatorName = ticket.creator
    ? `${ticket.creator.first_name || ''} ${ticket.creator.last_name || ''}`.trim() || ticket.creator.email
    : 'Unbekannt'

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Status</label>
            <Select value={ticket.status} onValueChange={handleStatusChange} disabled={updating}>
              <SelectTrigger>
                <SelectValue>
                  <StatusBadge status={ticket.status} />
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Offen</SelectItem>
                <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                <SelectItem value="resolved">Gelöst</SelectItem>
                <SelectItem value="closed">Geschlossen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Priorität</label>
            <Select value={ticket.priority} onValueChange={handlePriorityChange} disabled={updating}>
              <SelectTrigger>
                <SelectValue>
                  <PriorityBadge priority={ticket.priority} />
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Niedrig</SelectItem>
                <SelectItem value="medium">Mittel</SelectItem>
                <SelectItem value="high">Hoch</SelectItem>
                <SelectItem value="urgent">Dringend</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isManagerOrAdmin && (
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Zugewiesen an</label>
              <Select
                value={ticket.assigned_to || 'none'}
                onValueChange={handleAssignmentChange}
                disabled={updating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nicht zugewiesen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nicht zugewiesen</SelectItem>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {`${manager.first_name || ''} ${manager.last_name || ''}`.trim() || manager.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Erstellt von</label>
            <div className="text-sm pt-2">
              {creatorName}
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(ticket.created_at), {
                  addSuffix: true,
                  locale: de
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <label className="text-sm text-muted-foreground mb-2 block">Tags</label>
          {isManagerOrAdmin ? (
            <TagsSelector
              ticketId={ticket.id}
              currentTags={ticket.tags || []}
              disabled={updating}
            />
          ) : (
            ticket.tags && ticket.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {ticket.tags.map((tag) => (
                  <TagPill key={tag.id} tag={tag} />
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Keine Tags zugewiesen</div>
            )
          )}
        </div>
      </CardContent>
    </Card>
  )
}
