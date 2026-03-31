import { getTicket, getManagers, getTags } from '@/app/actions/tickets'
import { getTicketDirectAttachments } from '@/app/actions/attachments'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Breadcrumb } from '@/components/nextadmin'
import { TicketHeader } from './components/ticket-header'
import { TicketInfoBar } from './components/ticket-info-bar'
import { TicketTimeline } from './components/ticket-timeline'
import { TicketReplyForm } from './components/ticket-reply-form'
import { FormattedContent } from '@/components/shared/formatted-content'
import { AttachmentList } from '@/components/tickets/attachment-list'

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

  // Get attachments directly on the ticket (not linked to messages)
  const ticketAttachmentsResult = await getTicketDirectAttachments(id)
  const ticketAttachments = ticketAttachmentsResult.data || []

  // Get all attachments for the ticket (including those linked to messages)
  const { getTicketAttachments } = await import('@/app/actions/attachments')
  const allAttachmentsResult = await getTicketAttachments(id)
  const allAttachments = allAttachmentsResult.data || []

  // Group attachments by message_id
  const attachmentsByMessage = allAttachments.reduce((acc, attachment) => {
    if (attachment.message_id) {
      if (!acc[attachment.message_id]) {
        acc[attachment.message_id] = []
      }
      acc[attachment.message_id].push(attachment)
    }
    return acc
  }, {} as Record<string, typeof allAttachments>)

  return (
    <div className="mx-auto max-w-screen-2xl space-y-7.5 py-8 px-4 md:px-6 2xl:px-10">
      <Breadcrumb pageName="Ticket Detail" items={[{ label: "Tickets", href: "/tickets" }]} />

      <TicketHeader ticket={ticket} />

      <div className="space-y-6 mt-6">
        <TicketInfoBar
          ticket={ticket}
          managers={managersResult.data || []}
          tags={tagsResult.data || []}
          isManagerOrAdmin={isManagerOrAdmin}
        />

        <div className="rounded-[10px] bg-card px-7.5 py-6 shadow-1 dark:shadow-card">
          {ticket.created_from_email ? (
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="text-muted-foreground">Von:</span>
              <span className="text-primary">{ticket.created_from_email}</span>
            </h3>
          ) : ticket.creator ? (
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="text-muted-foreground">Erstellt von:</span>
              <span className="text-primary">
                {ticket.creator.first_name} {ticket.creator.last_name}
              </span>
            </h3>
          ) : (
            <h3 className="font-semibold mb-2">Beschreibung</h3>
          )}
          <FormattedContent content={ticket.description} className="text-sm" />
          <AttachmentList attachments={ticketAttachments} title="Anhänge" />
        </div>

        <TicketTimeline
          messages={ticket.messages || []}
          ticket={ticket}
          attachmentsByMessage={attachmentsByMessage}
        />

        <TicketReplyForm
          ticketId={ticket.id}
          isManagerOrAdmin={isManagerOrAdmin}
        />
      </div>
    </div>
  )
}
