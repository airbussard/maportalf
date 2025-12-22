import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Mail, Phone, Calendar, Ticket, Clock, MapPin, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getContact } from '@/app/actions/contacts'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface ContactDetailPageProps {
  params: Promise<{ email: string }>
}

export async function generateMetadata({ params }: ContactDetailPageProps) {
  const resolvedParams = await params
  const email = decodeURIComponent(resolvedParams.email)
  const contact = await getContact(email)

  if (!contact) {
    return { title: 'Kontakt nicht gefunden | Flighthour' }
  }

  return {
    title: `${contact.first_name} ${contact.last_name} | Kontaktbuch`,
    description: `Kontaktdetails für ${contact.email}`
  }
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const resolvedParams = await params
  const email = decodeURIComponent(resolvedParams.email)
  const contact = await getContact(email)

  if (!contact) {
    notFound()
  }

  const statusColors: Record<string, string> = {
    confirmed: 'bg-green-500/10 text-green-700 dark:text-green-400',
    tentative: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    cancelled: 'bg-red-500/10 text-red-700 dark:text-red-400',
    open: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    in_progress: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    resolved: 'bg-green-500/10 text-green-700 dark:text-green-400',
    closed: 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
  }

  const statusLabels: Record<string, string> = {
    confirmed: 'Bestätigt',
    tentative: 'Vorläufig',
    cancelled: 'Abgesagt',
    open: 'Offen',
    in_progress: 'In Bearbeitung',
    resolved: 'Gelöst',
    closed: 'Geschlossen'
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/kontaktbuch">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Kontaktbuch
        </Button>
      </Link>

      {/* Contact Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-primary">
                {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
              </span>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">
                {contact.first_name} {contact.last_name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${contact.email}`} className="hover:underline">
                    {contact.email}
                  </a>
                </div>
                {contact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${contact.phone}`} className="hover:underline">
                      {contact.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Termine ({contact.events.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contact.events.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Keine Termine gefunden</p>
          ) : (
            <div className="space-y-2">
              {contact.events.map((event) => (
                <Link
                  key={event.id}
                  href={`/kalender?date=${format(new Date(event.start_time), 'yyyy-MM-dd')}`}
                  className="block"
                >
                  <Card className="p-3 hover:shadow-md transition-all hover:border-primary/50 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {format(new Date(event.start_time), 'dd.MM.yyyy', { locale: de })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {format(new Date(event.start_time), 'HH:mm', { locale: de })} - {format(new Date(event.end_time), 'HH:mm', { locale: de })}
                          </span>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate max-w-[200px]">{event.location}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={statusColors[event.status] || ''}
                        >
                          {statusLabels[event.status] || event.status}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tickets Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Tickets ({contact.tickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contact.tickets.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Keine Tickets gefunden</p>
          ) : (
            <div className="space-y-2">
              {contact.tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="block"
                >
                  <Card className="p-3 hover:shadow-md transition-all hover:border-primary/50 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Ticket className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate max-w-[300px]">
                            {ticket.subject}
                          </span>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(new Date(ticket.created_at), 'dd.MM.yyyy', { locale: de })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={statusColors[ticket.status] || ''}
                        >
                          {statusLabels[ticket.status] || ticket.status}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
