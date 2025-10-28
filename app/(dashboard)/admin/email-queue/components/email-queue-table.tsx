'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Mail, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

interface EmailQueueItem {
  id: string
  ticket_id: string
  recipient_email: string
  subject: string
  content: string
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'
  attempts: number
  max_attempts: number
  last_attempt_at: string | null
  error_message: string | null
  created_at: string
  sent_at: string | null
  ticket?: {
    id: string
    ticket_number: number
    subject: string
  }
}

interface EmailQueueTableProps {
  emails: EmailQueueItem[]
}

export function EmailQueueTable({ emails }: EmailQueueTableProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'failed'>('all')

  const filteredEmails = emails.filter(email => {
    if (filter === 'all') return true
    return email.status === filter
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Wartend</Badge>
      case 'processing':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Wird gesendet</Badge>
      case 'sent':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Gesendet</Badge>
      case 'failed':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" /> Fehlgeschlagen</Badge>
      case 'cancelled':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Abgebrochen</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const stats = {
    total: emails.length,
    pending: emails.filter(e => e.status === 'pending').length,
    sent: emails.filter(e => e.status === 'sent').length,
    failed: emails.filter(e => e.status === 'failed').length
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gesamt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Wartend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gesendet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fehlgeschlagen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Alle ({stats.total})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('pending')}
        >
          Wartend ({stats.pending})
        </Button>
        <Button
          variant={filter === 'sent' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('sent')}
        >
          Gesendet ({stats.sent})
        </Button>
        <Button
          variant={filter === 'failed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('failed')}
        >
          Fehlgeschlagen ({stats.failed})
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.refresh()}
          className="ml-auto"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Aktualisieren
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Ticket</th>
                  <th className="text-left p-3 text-sm font-medium">Empfänger</th>
                  <th className="text-left p-3 text-sm font-medium">Betreff</th>
                  <th className="text-left p-3 text-sm font-medium">Status</th>
                  <th className="text-left p-3 text-sm font-medium">Versuche</th>
                  <th className="text-left p-3 text-sm font-medium">Erstellt</th>
                  <th className="text-left p-3 text-sm font-medium">Fehler</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmails.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-muted-foreground">
                      <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Keine E-Mails gefunden</p>
                    </td>
                  </tr>
                ) : (
                  filteredEmails.map((email) => (
                    <tr key={email.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="font-mono text-sm">
                            #{String(email.ticket?.ticket_number || '').padStart(6, '0')}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-sm">{email.recipient_email}</td>
                      <td className="p-3 text-sm max-w-xs truncate" title={email.subject}>
                        {email.subject}
                      </td>
                      <td className="p-3">{getStatusBadge(email.status)}</td>
                      <td className="p-3 text-sm">
                        {email.attempts}/{email.max_attempts}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(email.created_at), {
                          addSuffix: true,
                          locale: de
                        })}
                      </td>
                      <td className="p-3 text-sm max-w-xs">
                        {email.error_message && (
                          <span className="text-red-600 truncate block" title={email.error_message}>
                            {email.error_message}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
