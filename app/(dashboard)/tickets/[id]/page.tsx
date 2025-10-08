import { getTicket, getManagers, getTags } from '@/app/actions/tickets'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TicketHeader } from './components/ticket-header'
import { TicketInfoBar } from './components/ticket-info-bar'
import { TicketTimeline } from './components/ticket-timeline'
import { TicketReplyForm } from './components/ticket-reply-form'
import { Card, CardContent } from '@/components/ui/card'

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'admin'

  const result = await getTicket(id)

  if (!result.success || !result.data) {
    redirect('/tickets')
  }

  const ticket = result.data
  const managersResult = await getManagers()
  const tagsResult = await getTags()

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <TicketHeader ticket={ticket} />

      <div className="space-y-6 mt-6">
        <TicketInfoBar
          ticket={ticket}
          managers={managersResult.data || []}
          tags={tagsResult.data || []}
          isManagerOrAdmin={isManagerOrAdmin}
        />

        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Beschreibung</h3>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {ticket.description}
            </div>
          </CardContent>
        </Card>

        <TicketTimeline
          messages={ticket.messages || []}
          ticketId={ticket.id}
        />

        <TicketReplyForm
          ticketId={ticket.id}
          isManagerOrAdmin={isManagerOrAdmin}
        />
      </div>
    </div>
  )
}
