'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2 } from 'lucide-react'
import type { TimeEntry } from '@/lib/types/time-tracking'
import { deleteTimeEntry } from '@/app/actions/time-tracking'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface TimeEntriesListProps {
  entries: TimeEntry[]
  monthClosed: boolean
  onEdit: (entry: TimeEntry) => void
  onDelete: () => void
}

const WEEKDAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

export function TimeEntriesList({ entries, monthClosed, onEdit, onDelete }: TimeEntriesListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
      return
    }

    setDeleting(id)
    const result = await deleteTimeEntry(id)

    if (result.success) {
      onDelete()
    } else {
      alert(result.error || 'Fehler beim Löschen')
    }

    setDeleting(null)
  }

  const formatTime = (time: string | null) => {
    if (!time) return ''
    return time.substring(0, 5) // HH:MM
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return format(date, 'dd.MM.yyyy', { locale: de })
  }

  const getWeekday = (dateStr: string) => {
    const date = new Date(dateStr)
    return WEEKDAY_NAMES[date.getDay()]
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors gap-4"
        >
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <div>
                <div className="font-semibold">{formatDate(entry.date)}</div>
                <div className="text-sm text-muted-foreground">{getWeekday(entry.date)}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm">
              {entry.start_time && entry.end_time && (
                <div className="text-muted-foreground">
                  {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                </div>
              )}
              <div className="font-semibold text-primary">
                {formatDuration(entry.duration_minutes)}
              </div>
              {entry.category && (
                <Badge
                  variant="outline"
                  style={{
                    borderColor: entry.category.color,
                    color: entry.category.color,
                  }}
                >
                  {entry.category.name}
                </Badge>
              )}
            </div>

            {entry.description && (
              <div className="text-sm text-muted-foreground">
                Bemerkung: {entry.description}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!entry.is_approved && !monthClosed ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(entry)}
                  disabled={deleting === entry.id}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(entry.id)}
                  disabled={deleting === entry.id}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            ) : entry.is_approved ? (
              <Badge variant="secondary">Genehmigt</Badge>
            ) : (
              <Badge variant="outline">Monat abgeschlossen</Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
