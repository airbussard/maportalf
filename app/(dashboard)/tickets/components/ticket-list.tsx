'use client'

import { useState, useTransition } from 'react'
import type { Ticket } from '@/lib/types/ticket'
import { TicketRow } from './ticket-row'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { bulkUpdateTicketStatus, bulkDeleteTickets } from '@/app/actions/tickets'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function TicketList({
  tickets,
  currentPage,
  totalPages,
  isManagerOrAdmin
}: {
  tickets: Ticket[]
  currentPage: number
  totalPages: number
  isManagerOrAdmin: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', page.toString())
    router.push(`/tickets?${params.toString()}`)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTickets(new Set(tickets.map(t => t.id)))
    } else {
      setSelectedTickets(new Set())
    }
  }

  const handleSelectTicket = (ticketId: string, checked: boolean) => {
    const newSelected = new Set(selectedTickets)
    if (checked) {
      newSelected.add(ticketId)
    } else {
      newSelected.delete(ticketId)
    }
    setSelectedTickets(newSelected)
  }

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedTickets.size === 0) {
      toast.error('Bitte wählen Sie einen Status aus')
      return
    }

    startTransition(async () => {
      const result = await bulkUpdateTicketStatus(Array.from(selectedTickets), bulkStatus)
      if (result.success) {
        toast.success(`Status von ${result.updated} Ticket(s) erfolgreich geändert`)
        setSelectedTickets(new Set())
        setBulkStatus('')
        router.refresh()
      } else {
        toast.error(result.error || 'Fehler beim Aktualisieren')
      }
    })
  }

  const handleBulkDelete = async () => {
    if (selectedTickets.size === 0) return

    if (!confirm(`Möchten Sie ${selectedTickets.size} Ticket(s) in den Papierkorb verschieben?`)) {
      return
    }

    startTransition(async () => {
      const result = await bulkDeleteTickets(Array.from(selectedTickets))
      if (result.success) {
        toast.success(`${result.deleted} Ticket(s) wurden in den Papierkorb verschoben`)
        setSelectedTickets(new Set())
        router.refresh()
      } else {
        toast.error(result.error || 'Fehler beim Löschen')
      }
    })
  }

  const allSelected = tickets.length > 0 && selectedTickets.size === tickets.length

  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Keine Tickets gefunden</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedTickets.size > 0 && (
        <Card className="border-primary">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-medium">
                  {selectedTickets.size} ausgewählt
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Status ändern..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Offen</SelectItem>
                    <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                    <SelectItem value="resolved">Gelöst</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleBulkStatusUpdate}
                  disabled={!bulkStatus || isPending}
                  variant="outline"
                >
                  Status anwenden
                </Button>
                <Button
                  onClick={handleBulkDelete}
                  disabled={isPending}
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {/* Select All Header */}
          <div className="p-4 border-b flex items-center gap-3">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">Alle auswählen</span>
          </div>

          <div className="divide-y">
            {tickets.map((ticket) => (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                isManagerOrAdmin={isManagerOrAdmin}
                isSelected={selectedTickets.has(ticket.id)}
                onSelect={handleSelectTicket}
                searchParams={searchParams}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Seite {currentPage} von {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Zurück
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Weiter
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
