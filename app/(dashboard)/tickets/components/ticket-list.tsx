'use client'

import { useState, useTransition } from 'react'
import type { Ticket } from '@/lib/types/ticket'
import { TicketRow } from './ticket-row'
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
      <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground">Keine Tickets gefunden</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
      {/* Bulk Actions Bar */}
      {selectedTickets.size > 0 && (
        <div className="border-b border-[#eee] dark:border-dark-3 bg-[#fbb928]/[0.04] px-5.5 xl:px-7.5 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">
              {selectedTickets.size} ausgewählt
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="w-[180px] h-9 text-sm">
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
                size="sm"
              >
                Anwenden
              </Button>
              <Button
                onClick={handleBulkDelete}
                disabled={isPending}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Löschen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#eee] dark:border-dark-3 bg-[#F7F9FC] dark:bg-dark-2">
              <th className="py-4 pl-5.5 xl:pl-7.5 w-12 text-left">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
              </th>
              <th className="py-4 text-left text-sm font-medium text-muted-foreground min-w-[200px]">
                Titel
              </th>
              <th className="py-4 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">
                Zugewiesen
              </th>
              <th className="py-4 text-left text-sm font-medium text-muted-foreground hidden sm:table-cell">
                Status
              </th>
              <th className="py-4 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">
                Priorität
              </th>
              <th className="py-4 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">
                Erstellt
              </th>
              <th className="py-4 pr-5.5 xl:pr-7.5 text-right text-sm font-medium text-muted-foreground">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody>
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
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5.5 xl:px-7.5 py-4 border-t border-[#eee] dark:border-dark-3">
          <p className="text-sm text-muted-foreground">
            Seite {currentPage} von {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-9 px-3"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Zurück
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-9 px-3"
            >
              Weiter
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
