/**
 * MAYDAY Status Badge Component
 *
 * Displays visual indicators for pending/confirmed MAYDAY operations:
 * - Pending shift (amber badge with pulsing clock)
 * - Confirmed shift (green badge with check)
 * - Pending cancel confirmation (amber badge)
 * - Waiting for rebook (amber badge)
 * - Rebooked (green badge)
 */

'use client'

import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Clock, Check, AlertTriangle, CalendarX, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface MaydayToken {
  id: string
  action_type: 'shift' | 'cancel'
  confirmed: boolean
  confirmed_at: string | null
  created_at: string
  shift_applied: boolean
}

interface RebookToken {
  id: string
  used: boolean
  used_at: string | null
}

interface MaydayStatusBadgeProps {
  event: {
    pending_start_time?: string | null
    pending_end_time?: string | null
    shift_notified_at?: string | null
    shift_reason?: string | null
    status: string
    rebooked_at?: string | null
    mayday_tokens?: MaydayToken[]
    rebook_token?: RebookToken | null
  }
  compact?: boolean
}

export function MaydayStatusBadge({ event, compact = false }: MaydayStatusBadgeProps) {
  // Check for pending shift
  const hasPendingShift = !!(event.pending_start_time && event.pending_end_time)

  // Get latest MAYDAY token for this event (sorted by created_at desc)
  const latestToken = event.mayday_tokens?.[0]

  const isShiftToken = latestToken?.action_type === 'shift'
  const isCancelToken = latestToken?.action_type === 'cancel'
  const isConfirmed = latestToken?.confirmed

  // For cancelled events
  const isCancelled = event.status === 'cancelled'
  const rebookOffered = !!event.rebook_token
  const rebookUsed = event.rebook_token?.used || !!event.rebooked_at

  // ============================================
  // CASE 1: Pending Shift (highest priority)
  // ============================================
  if (hasPendingShift) {
    const notifiedDate = event.shift_notified_at
      ? format(new Date(event.shift_notified_at), 'dd.MM. HH:mm', { locale: de })
      : 'unbekannt'

    const newTime = event.pending_start_time
      ? format(new Date(event.pending_start_time), 'HH:mm', { locale: de })
      : '?'

    const newDate = event.pending_start_time
      ? format(new Date(event.pending_start_time), 'dd.MM.yyyy', { locale: de })
      : ''

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="secondary"
              className={cn(
                'cursor-help whitespace-nowrap',
                'bg-amber-100 text-amber-800 hover:bg-amber-200',
                'dark:bg-amber-900 dark:text-amber-100'
              )}
            >
              <Clock className="h-3 w-3 mr-1 animate-pulse" />
              {compact ? 'Verschiebung' : 'Verschiebung ausstehend'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-semibold">Verschiebung ausstehend</p>
            <p className="text-sm">Mitgeteilt am {notifiedDate}</p>
            <p className="text-sm font-medium mt-1">
              Neue Zeit: {newDate} um {newTime} Uhr
            </p>
            {event.shift_reason && (
              <p className="text-sm text-muted-foreground mt-1">
                Grund: {event.shift_reason}
              </p>
            )}
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Warte auf Kundenbestätigung
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // ============================================
  // CASE 2: Shift confirmed (recent)
  // ============================================
  if (isShiftToken && isConfirmed && latestToken.shift_applied) {
    const confirmedDate = latestToken.confirmed_at
      ? format(new Date(latestToken.confirmed_at), 'dd.MM. HH:mm', { locale: de })
      : ''

    // Only show for recent confirmations (within last 24 hours)
    const isRecent = latestToken.confirmed_at
      ? new Date().getTime() - new Date(latestToken.confirmed_at).getTime() < 24 * 60 * 60 * 1000
      : false

    if (isRecent) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className={cn(
                  'cursor-help whitespace-nowrap',
                  'bg-green-100 text-green-800 hover:bg-green-200',
                  'dark:bg-green-900 dark:text-green-100'
                )}
              >
                <Check className="h-3 w-3 mr-1" />
                {compact ? 'Bestätigt' : 'Verschiebung bestätigt'}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Kunde hat am {confirmedDate} bestätigt</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }
  }

  // ============================================
  // CASE 3: Cancelled event badges
  // ============================================
  if (isCancelled) {
    // Sub-case 3a: Already rebooked
    if (rebookUsed) {
      const rebookDate = event.rebooked_at
        ? format(new Date(event.rebooked_at), 'dd.MM. HH:mm', { locale: de })
        : event.rebook_token?.used_at
          ? format(new Date(event.rebook_token.used_at), 'dd.MM. HH:mm', { locale: de })
          : ''

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className={cn(
                  'cursor-help whitespace-nowrap',
                  'bg-green-100 text-green-800 hover:bg-green-200',
                  'dark:bg-green-900 dark:text-green-100'
                )}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Umgebucht
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Kunde hat am {rebookDate} umgebucht</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    // Sub-case 3b: Rebook offered but not used yet
    if (rebookOffered && !rebookUsed) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className={cn(
                  'cursor-help whitespace-nowrap',
                  'bg-amber-100 text-amber-800 hover:bg-amber-200',
                  'dark:bg-amber-900 dark:text-amber-100'
                )}
              >
                <CalendarX className="h-3 w-3 mr-1" />
                {compact ? 'Warte...' : 'Warte auf Umbuchung'}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">Umbuchungsangebot gesendet</p>
              <p className="text-sm text-muted-foreground">
                Kunde hat noch nicht umgebucht
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    // Sub-case 3c: Cancel notification sent but not confirmed
    if (isCancelToken && !isConfirmed) {
      const notifiedDate = latestToken.created_at
        ? format(new Date(latestToken.created_at), 'dd.MM. HH:mm', { locale: de })
        : ''

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className={cn(
                  'cursor-help whitespace-nowrap',
                  'bg-amber-100 text-amber-800 hover:bg-amber-200',
                  'dark:bg-amber-900 dark:text-amber-100'
                )}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {compact ? 'Absage' : 'Absage ausstehend'}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">Absage wurde mitgeteilt</p>
              <p className="text-sm">Am {notifiedDate}</p>
              <p className="text-sm text-muted-foreground">
                Kunde hat noch nicht bestätigt
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }
  }

  // No MAYDAY status to show
  return null
}
