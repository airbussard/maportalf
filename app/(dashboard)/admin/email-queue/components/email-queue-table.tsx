'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Mail, AlertCircle, CheckCircle, Clock, RotateCcw } from 'lucide-react'
import { StatCard, TableCard, StatusBadge } from '@/components/nextadmin'
import { retryEmail, retryAllFailedEmails } from '@/app/actions/email-queue'
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
        return <StatusBadge variant="warning"><Clock className="w-3 h-3 mr-1" /> Wartend</StatusBadge>
      case 'processing':
        return <StatusBadge variant="info"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Wird gesendet</StatusBadge>
      case 'sent':
        return <StatusBadge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Gesendet</StatusBadge>
      case 'failed':
        return <StatusBadge variant="error"><AlertCircle className="w-3 h-3 mr-1" /> Fehlgeschlagen</StatusBadge>
      case 'cancelled':
        return <StatusBadge variant="neutral">Abgebrochen</StatusBadge>
      default:
        return <StatusBadge variant="neutral">{status}</StatusBadge>
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
      <div className="grid gap-4 md:grid-cols-4 2xl:gap-7.5">
        <StatCard label="Gesamt" value={stats.total} icon={Mail} iconColor="#6B7280" iconBg="#6B728015" />
        <StatCard label="Wartend" value={stats.pending} icon={Clock} iconColor="#FFA70B" iconBg="#FFA70B15" />
        <StatCard label="Gesendet" value={stats.sent} icon={CheckCircle} iconColor="#219653" iconBg="#21965315" />
        <StatCard label="Fehlgeschlagen" value={stats.failed} icon={AlertCircle} iconColor="#F23030" iconBg="#F2303015" />
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
        {stats.failed > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await retryAllFailedEmails()
              router.refresh()
            }}
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Alle wiederholen ({stats.failed})
          </Button>
        )}
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
      <TableCard>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="text-left p-3 text-sm font-medium">Ticket</th>
                <th className="text-left p-3 text-sm font-medium">Empfänger</th>
                <th className="text-left p-3 text-sm font-medium">Betreff</th>
                <th className="text-left p-3 text-sm font-medium">Status</th>
                <th className="text-left p-3 text-sm font-medium">Versuche</th>
                <th className="text-left p-3 text-sm font-medium">Erstellt</th>
                <th className="text-left p-3 text-sm font-medium">Fehler</th>
                <th className="text-left p-3 text-sm font-medium w-20">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmails.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-muted-foreground">
                    <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Keine E-Mails gefunden</p>
                  </td>
                </tr>
              ) : (
                filteredEmails.map((email) => (
                  <tr key={email.id} className="border-b border-border hover:bg-accent/50 transition-colors">
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
                    <td className="p-3">
                      {email.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await retryEmail(email.id)
                            router.refresh()
                          }}
                          title="Erneut versuchen"
                          className="h-8 w-8 p-0 hover:bg-orange-100"
                        >
                          <RotateCcw className="w-4 h-4 text-orange-600" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TableCard>
    </div>
  )
}
