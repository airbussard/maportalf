'use client'

import type { Ticket } from '@/lib/types/ticket'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { getReturnUrl } from '@/lib/utils/navigation'

export function TicketHeader({ ticket }: { ticket: Ticket }) {
  const searchParams = useSearchParams()
  const returnUrl = getReturnUrl(searchParams, '/tickets')

  const ticketNumber = ticket.ticket_number
    ? `TICKET-${ticket.ticket_number.toString().padStart(6, '0')}`
    : `TICKET-${ticket.id.substring(0, 8)}`

  return (
    <div className="flex items-center gap-4">
      <Link href={returnUrl}>
        <Button variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>
      </Link>

      <div className="flex-1">
        <div className="text-sm text-muted-foreground font-mono mb-1">
          {ticketNumber}
        </div>
        <h1 className="text-2xl font-bold">{ticket.subject}</h1>
      </div>
    </div>
  )
}
