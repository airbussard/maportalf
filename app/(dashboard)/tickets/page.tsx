import { getTickets } from '@/app/actions/tickets'
import { createClient } from '@/lib/supabase/server'
import { TicketList } from './components/ticket-list'
import { TicketFilters } from './components/ticket-filters'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: { filter?: string; status?: string; page?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'admin'

  const result = await getTickets({
    filter: (searchParams.filter as any) || 'all',
    status: searchParams.status as any,
    page: parseInt(searchParams.page || '1')
  })

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tickets</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Support-Anfragen
          </p>
        </div>
        <Link href="/tickets/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Neues Ticket
          </Button>
        </Link>
      </div>

      <TicketFilters
        currentFilter={searchParams.filter || 'all'}
        currentStatus={searchParams.status}
        isManagerOrAdmin={isManagerOrAdmin}
      />

      <TicketList
        tickets={result.data || []}
        currentPage={result.page || 1}
        totalPages={result.totalPages || 1}
        isManagerOrAdmin={isManagerOrAdmin}
      />
    </div>
  )
}
