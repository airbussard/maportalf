import type { TicketMessage, Ticket, TicketAttachment } from '@/lib/types/ticket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { FormattedContent } from '@/components/shared/formatted-content'
import { AttachmentList } from '@/components/tickets/attachment-list'
import { EmailStatusBadge } from '@/components/tickets/email-status-badge'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

/**
 * Get sender name with fallback logic (matches PHP version)
 */
function getSenderName(message: TicketMessage, ticket: Ticket): string {
  if (message.sender) {
    // Internal message from employee
    let name = `${message.sender.first_name || ''} ${message.sender.last_name || ''}`.trim()

    // Fallback to email if no name
    if (!name) {
      name = message.sender.email
    }

    // Mark archived employees
    if (message.sender.is_active === false) {
      name += ' (Archiviert)'
    }

    return name
  } else {
    // External message from customer
    return ticket.created_from_email || 'Externe E-Mail'
  }
}

/**
 * Get sender initials for avatar
 */
function getSenderInitials(message: TicketMessage, ticket: Ticket): string {
  if (message.sender) {
    const firstInitial = message.sender.first_name?.[0] || ''
    const lastInitial = message.sender.last_name?.[0] || ''
    return (firstInitial + lastInitial).toUpperCase() || message.sender.email[0].toUpperCase()
  } else {
    // External message - use first letter of email
    const email = ticket.created_from_email || 'E'
    return email[0].toUpperCase()
  }
}

export function TicketTimeline({
  messages,
  ticket,
  attachmentsByMessage = {}
}: {
  messages: TicketMessage[]
  ticket: Ticket
  attachmentsByMessage?: Record<string, TicketAttachment[]>
}) {
  if (messages.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nachrichten</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.map((message) => {
          const senderName = getSenderName(message, ticket)
          const initials = getSenderInitials(message, ticket)
          const messageAttachments = attachmentsByMessage[message.id] || []

          return (
            <div key={message.id} className="flex gap-4">
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{senderName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(message.created_at), {
                      addSuffix: true,
                      locale: de
                    })}
                  </span>
                  {message.is_internal && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded dark:bg-yellow-900 dark:text-yellow-200">
                      Intern
                    </span>
                  )}
                  {!message.is_internal && message.email_status && (
                    <EmailStatusBadge
                      status={message.email_status.status}
                      sentAt={message.email_status.sent_at}
                      errorMessage={message.email_status.error_message}
                      attempts={message.email_status.attempts}
                      maxAttempts={message.email_status.max_attempts}
                    />
                  )}
                </div>
                <FormattedContent content={message.content} className="text-sm" />
                {messageAttachments.length > 0 && (
                  <AttachmentList attachments={messageAttachments} />
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
