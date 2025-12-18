'use client'

import { useState } from 'react'
import { Calendar, Clock, MapPin, User, Video, Euro, Mail, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { resendBookingConfirmationEmail } from '@/app/actions/calendar-events'
import { toast } from 'sonner'
import { MaydayStatusBadge } from './mayday-status-badge'

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

interface EventCardProps {
  event: {
    id: string
    title: string
    customer_first_name: string
    customer_last_name: string
    customer_email?: string | null
    start_time: string
    end_time: string
    location: string
    status: string
    sync_status: string
    event_type?: 'booking' | 'fi_assignment' | 'blocker'
    assigned_instructor_name?: string
    assigned_instructor_number?: string
    is_all_day?: boolean
    actual_work_start_time?: string
    actual_work_end_time?: string
    has_video_recording?: boolean
    on_site_payment_amount?: number | null
    // MAYDAY pending shift fields
    pending_start_time?: string | null
    pending_end_time?: string | null
    shift_notified_at?: string | null
    shift_reason?: string | null
    rebooked_at?: string | null
    mayday_tokens?: MaydayToken[]
    rebook_token?: RebookToken | null
  }
  onClick?: () => void
}

export function EventCard({ event, onClick }: EventCardProps) {
  const [isResendingEmail, setIsResendingEmail] = useState(false)
  const startDate = new Date(event.start_time)
  const endDate = new Date(event.end_time)
  const isFIEvent = event.event_type === 'fi_assignment'
  const isBlocker = event.event_type === 'blocker'
  const isBookingWithEmail = event.event_type === 'booking' && event.customer_email

  const handleResendEmail = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent opening the dialog
    setIsResendingEmail(true)
    try {
      const result = await resendBookingConfirmationEmail(event.id)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Fehler beim Senden der E-Mail')
    } finally {
      setIsResendingEmail(false)
    }
  }

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
      className={`p-2 sm:p-3 hover:shadow-md transition-all ${onClick ? 'cursor-pointer' : ''} ${
        isFIEvent
          ? 'bg-[#FCD34D]/20 border-[#FCD34D]/50 hover:border-[#FCD34D]'
          : isBlocker
          ? 'bg-red-500/20 border-red-500/50 hover:border-red-500'
          : 'hover:border-primary/50'
      }`}
      onClick={onClick}
    >
      {/* Mobile Layout (< sm) */}
      <div className="sm:hidden space-y-2">
        {/* Row 1: Time and Name */}
        <div className="flex items-center gap-2">
          {/* Hide time for FI events, show for bookings */}
          {!event.is_all_day && !isFIEvent && (
            <div className="flex items-center gap-1 text-xs min-w-[70px]">
              <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="font-medium">
                {startDate.toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-semibold truncate">
              {isFIEvent ? (
                <>
                  FI: {event.assigned_instructor_name}
                  {event.assigned_instructor_number && ` (${event.assigned_instructor_number})`}
                  {event.actual_work_start_time && event.actual_work_end_time && (
                    <span className="text-muted-foreground ml-1">
                      {event.actual_work_start_time.slice(0,5)}-{event.actual_work_end_time.slice(0,5)}
                    </span>
                  )}
                </>
              ) : isBlocker ? (
                <>
                  {event.title || event.customer_first_name || 'Blocker'}
                </>
              ) : (
                <>
                  {event.customer_first_name} {event.customer_last_name}
                </>
              )}
            </span>
          </div>
        </div>

        {/* Row 2: Badges */}
        <div className="flex items-center gap-2">
          {isFIEvent ? (
            <Badge className="text-xs bg-[#FCD34D] text-gray-900 hover:bg-[#FCD34D]/90">
              Geplanter MA
            </Badge>
          ) : isBlocker ? (
            <Badge className="text-xs bg-red-500 text-white hover:bg-red-500/90">
              Blocker
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className={`text-xs ${statusColors[event.status as keyof typeof statusColors] || ''}`}
            >
              {event.status === 'confirmed' && 'Bestätigt'}
              {event.status === 'tentative' && 'Vorläufig'}
              {event.status === 'cancelled' && 'Abgesagt'}
            </Badge>
          )}
          {/* Video & Payment Icons (only for booking events) */}
          {!isFIEvent && !isBlocker && (
            <>
              {event.has_video_recording && (
                <div className="flex items-center gap-1 text-xs text-primary" title="Videoaufnahme gebucht">
                  <Video className="h-3 w-3" />
                  <span className="hidden sm:inline">Video</span>
                </div>
              )}
              {event.on_site_payment_amount != null && event.on_site_payment_amount > 0 && (
                <div className="flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400" title="Vor Ort zu zahlen">
                  <Euro className="h-3 w-3" />
                  <span>{event.on_site_payment_amount.toFixed(2)}</span>
                </div>
              )}
            </>
          )}
          <Badge
            variant="outline"
            className={`text-xs ${syncStatusColors[event.sync_status as keyof typeof syncStatusColors] || ''}`}
          >
            {event.sync_status === 'synced' && '✓'}
            {event.sync_status === 'pending' && '⏳'}
            {event.sync_status === 'error' && '⚠'}
          </Badge>
          {/* MAYDAY Status Badge (Mobile) */}
          <MaydayStatusBadge event={event} compact />
          {/* Resend Email Button (only for bookings with email) */}
          {isBookingWithEmail && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={handleResendEmail}
              disabled={isResendingEmail}
              title="Buchungsbestätigung erneut senden"
            >
              {isResendingEmail ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Mail className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Desktop Layout (>= sm) */}
      <div className="hidden sm:flex items-center gap-4">
        {/* Time - hide for FI events completely, show for bookings */}
        {!event.is_all_day && !isFIEvent && (
          <div className="flex items-center gap-2 text-sm min-w-[100px] lg:min-w-[140px]">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium">
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
          </div>
        )}

        {/* Name - Customer or FI */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-semibold truncate">
            {isFIEvent ? (
              <>
                FI: {event.assigned_instructor_name}
                {event.assigned_instructor_number && ` (${event.assigned_instructor_number})`}
                {event.actual_work_start_time && event.actual_work_end_time && (
                  <span className="text-muted-foreground ml-2">
                    {event.actual_work_start_time.slice(0,5)}-{event.actual_work_end_time.slice(0,5)}
                  </span>
                )}
              </>
            ) : isBlocker ? (
              <>
                {event.title || event.customer_first_name || 'Blocker'}
              </>
            ) : (
              <>
                {event.customer_first_name} {event.customer_last_name}
              </>
            )}
          </span>
        </div>

        {/* Location */}
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground min-w-[200px]">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isFIEvent ? (
            <Badge className="text-xs bg-[#FCD34D] text-gray-900 hover:bg-[#FCD34D]/90">
              Geplanter Mitarbeiter
            </Badge>
          ) : isBlocker ? (
            <Badge className="text-xs bg-red-500 text-white hover:bg-red-500/90">
              Blocker
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className={`text-xs ${statusColors[event.status as keyof typeof statusColors] || ''}`}
            >
              {event.status === 'confirmed' && 'Bestätigt'}
              {event.status === 'tentative' && 'Vorläufig'}
              {event.status === 'cancelled' && 'Abgesagt'}
            </Badge>
          )}
          {/* Video & Payment Icons (only for booking events) */}
          {!isFIEvent && !isBlocker && (
            <>
              {event.has_video_recording && (
                <div className="flex items-center gap-1 text-xs text-primary" title="Videoaufnahme gebucht">
                  <Video className="h-4 w-4" />
                  <span>Video</span>
                </div>
              )}
              {event.on_site_payment_amount != null && event.on_site_payment_amount > 0 && (
                <div className="flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400" title="Vor Ort zu zahlen">
                  <Euro className="h-4 w-4" />
                  <span>{event.on_site_payment_amount.toFixed(2)} EUR</span>
                </div>
              )}
            </>
          )}
          <Badge
            variant="outline"
            className={`text-xs ${syncStatusColors[event.sync_status as keyof typeof syncStatusColors] || ''}`}
          >
            {event.sync_status === 'synced' && '✓'}
            {event.sync_status === 'pending' && '⏳'}
            {event.sync_status === 'error' && '⚠'}
          </Badge>
          {/* MAYDAY Status Badge (Desktop) */}
          <MaydayStatusBadge event={event} />
          {/* Resend Email Button (only for bookings with email) */}
          {isBookingWithEmail && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={handleResendEmail}
              disabled={isResendingEmail}
              title="Buchungsbestätigung erneut senden"
            >
              {isResendingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
