'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Phone, AlertCircle, CheckCircle, Clock, MessageSquare } from 'lucide-react'
import { StatCard, TableCard, StatusBadge } from '@/components/nextadmin'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

interface SMSQueueItem {
  id: string
  phone_number: string
  message: string
  event_id: string | null
  notification_type: 'shift' | 'cancel' | null
  status: 'pending' | 'sent' | 'failed'
  twilio_message_id: string | null
  error_message: string | null
  attempts: number
  created_at: string
  sent_at: string | null
}

interface SMSQueueTableProps {
  smsItems: SMSQueueItem[]
}

export function SMSQueueTable({ smsItems }: SMSQueueTableProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'failed'>('all')

  const filteredItems = smsItems.filter(item => {
    if (filter === 'all') return true
    return item.status === filter
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <StatusBadge variant="warning"><Clock className="w-3 h-3 mr-1" /> Wartend</StatusBadge>
      case 'sent':
        return <StatusBadge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Gesendet</StatusBadge>
      case 'failed':
        return <StatusBadge variant="error"><AlertCircle className="w-3 h-3 mr-1" /> Fehlgeschlagen</StatusBadge>
      default:
        return <StatusBadge variant="neutral">{status}</StatusBadge>
    }
  }

  const getTypeBadge = (type: string | null) => {
    switch (type) {
      case 'shift':
        return <StatusBadge variant="orange">Verschiebung</StatusBadge>
      case 'cancel':
        return <StatusBadge variant="error">Absage</StatusBadge>
      default:
        return <StatusBadge variant="neutral">-</StatusBadge>
    }
  }

  const stats = {
    total: smsItems.length,
    pending: smsItems.filter(e => e.status === 'pending').length,
    sent: smsItems.filter(e => e.status === 'sent').length,
    failed: smsItems.filter(e => e.status === 'failed').length
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 2xl:gap-7.5">
        <StatCard label="Gesamt" value={stats.total} icon={MessageSquare} iconColor="#6B7280" iconBg="#6B728015" />
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
                <th className="text-left p-3 text-sm font-medium">Telefon</th>
                <th className="text-left p-3 text-sm font-medium">Nachricht</th>
                <th className="text-left p-3 text-sm font-medium">Typ</th>
                <th className="text-left p-3 text-sm font-medium">Status</th>
                <th className="text-left p-3 text-sm font-medium">Versuche</th>
                <th className="text-left p-3 text-sm font-medium">Erstellt</th>
                <th className="text-left p-3 text-sm font-medium">Fehler</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Keine SMS gefunden</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-sm">
                          {item.phone_number}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-sm max-w-xs">
                      <span className="truncate block" title={item.message}>
                        {item.message.length > 50
                          ? item.message.substring(0, 50) + '...'
                          : item.message
                        }
                      </span>
                    </td>
                    <td className="p-3">{getTypeBadge(item.notification_type)}</td>
                    <td className="p-3">{getStatusBadge(item.status)}</td>
                    <td className="p-3 text-sm">
                      {item.attempts}/3
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), {
                        addSuffix: true,
                        locale: de
                      })}
                    </td>
                    <td className="p-3 text-sm max-w-xs">
                      {item.error_message && (
                        <span className="text-red-600 truncate block" title={item.error_message}>
                          {item.error_message}
                        </span>
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
