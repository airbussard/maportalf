import type { TicketMessage } from '@/lib/types/ticket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

export function TicketTimeline({
  messages,
  ticketId
}: {
  messages: TicketMessage[]
  ticketId: string
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
          const senderName = message.sender
            ? `${message.sender.first_name || ''} ${message.sender.last_name || ''}`.trim() || message.sender.email
            : 'Unbekannt'

          const initials = message.sender
            ? `${message.sender.first_name?.[0] || ''}${message.sender.last_name?.[0] || ''}`.toUpperCase() || message.sender.email[0].toUpperCase()
            : '?'

          return (
            <div key={message.id} className="flex gap-4">
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{senderName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(message.created_at), {
                      addSuffix: true,
                      locale: de
                    })}
                  </span>
                  {message.is_internal && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">
                      Intern
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {message.content}
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
