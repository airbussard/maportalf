'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Phone, AlertCircle, CheckCircle, Clock, MessageSquare } from 'lucide-react'
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
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Wartend</Badge>
      case 'sent':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Gesendet</Badge>
      case 'failed':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" /> Fehlgeschlagen</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string | null) => {
    switch (type) {
      case 'shift':
        return <Badge variant="outline" className="text-orange-600 border-orange-300">Verschiebung</Badge>
      case 'cancel':
        return <Badge variant="outline" className="text-red-600 border-red-300">Absage</Badge>
      default:
        return <Badge variant="outline">-</Badge>
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
                    <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
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
        </CardContent>
      </Card>
    </div>
  )
}
