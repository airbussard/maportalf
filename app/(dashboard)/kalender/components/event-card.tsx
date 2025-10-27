'use client'

import { Calendar, Clock, MapPin, User } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface EventCardProps {
  event: {
    id: string
    title: string
    customer_first_name: string
    customer_last_name: string
    start_time: string
    end_time: string
    location: string
    status: string
    sync_status: string
  }
  onClick: () => void
}

export function EventCard({ event, onClick }: EventCardProps) {
  const startDate = new Date(event.start_time)
  const endDate = new Date(event.end_time)

  const statusColors = {
    confirmed: 'bg-green-500/10 text-green-700 dark:text-green-400',
    tentative: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    cancelled: 'bg-red-500/10 text-red-700 dark:text-red-400'
  }

  const syncStatusColors = {
    synced: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    pending: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
    error: 'bg-red-500/10 text-red-700 dark:text-red-400'
  }

  return (
    <Card
      className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-semibold line-clamp-1">{event.title}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <User className="h-3 w-3" />
              {event.customer_first_name} {event.customer_last_name}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={statusColors[event.status as keyof typeof statusColors] || ''}
          >
            {event.status === 'confirmed' && 'Bestätigt'}
            {event.status === 'tentative' && 'Vorläufig'}
            {event.status === 'cancelled' && 'Abgesagt'}
          </Badge>
        </div>

        {/* Time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {startDate.toLocaleDateString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}
            {' • '}
            {startDate.toLocaleTimeString('de-DE', {
              hour: '2-digit',
              minute: '2-digit'
            })}
            {' - '}
            {endDate.toLocaleTimeString('de-DE', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="line-clamp-1">{event.location}</span>
        </div>

        {/* Sync Status */}
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-xs ${syncStatusColors[event.sync_status as keyof typeof syncStatusColors] || ''}`}
          >
            {event.sync_status === 'synced' && '✓ Synchronisiert'}
            {event.sync_status === 'pending' && '⏳ Ausstehend'}
            {event.sync_status === 'error' && '⚠ Fehler'}
          </Badge>
        </div>
      </div>
    </Card>
  )
}
