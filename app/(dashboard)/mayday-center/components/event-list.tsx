'use client'

import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Mail, Phone, Users, Calendar, CalendarIcon, Check, Clock } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface CalendarEvent {
  id: string
  event_type: string
  title: string
  start_time: string
  end_time: string
  customer_first_name: string | null
  customer_last_name: string | null
  customer_email: string | null
  customer_phone: string | null
  attendee_count: number | null
  location: string | null
  confirmation_status?: 'pending' | 'confirmed' | 'no_notification'
  confirmed_at?: string | null
}

interface EventListProps {
  events: CalendarEvent[]
  selectedEvents: string[]
  onSelectEvent: (eventId: string) => void
  onSelectAll: () => void
  filterDate: 'today' | 'tomorrow' | 'week' | 'custom'
  onFilterDateChange: (value: 'today' | 'tomorrow' | 'week' | 'custom') => void
  filterFromTime: string
  onFilterFromTimeChange: (value: string) => void
  customDate: Date | null
  onCustomDateChange: (date: Date | null) => void
}

export function EventList({
  events,
  selectedEvents,
  onSelectEvent,
  onSelectAll,
  filterDate,
  onFilterDateChange,
  filterFromTime,
  onFilterFromTimeChange,
  customDate,
  onCustomDateChange
}: EventListProps) {
  const allSelected = events.length > 0 && selectedEvents.length === events.length

  const getCustomerName = (event: CalendarEvent) => {
    if (event.customer_first_name || event.customer_last_name) {
      return `${event.customer_first_name || ''} ${event.customer_last_name || ''}`.trim()
    }
    return event.title || 'Unbekannter Kunde'
  }

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: de })
  }

  const formatDateDisplay = (dateString: string) => {
    return format(new Date(dateString), 'EEE, dd.MM.', { locale: de })
  }

  const formatConfirmedAt = (dateString: string | null | undefined) => {
    if (!dateString) return ''
    return format(new Date(dateString), 'dd.MM. HH:mm', { locale: de })
  }

  const handleDateFilterChange = (value: string) => {
    const filterValue = value as 'today' | 'tomorrow' | 'week' | 'custom'
    onFilterDateChange(filterValue)
    if (filterValue !== 'custom') {
      onCustomDateChange(null)
    }
  }

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onCustomDateChange(date)
      onFilterDateChange('custom')
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="space-y-1.5">
          <Label htmlFor="filter-date" className="text-xs">Zeitraum</Label>
          <Select value={filterDate} onValueChange={handleDateFilterChange}>
            <SelectTrigger id="filter-date" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Heute</SelectItem>
              <SelectItem value="tomorrow">Morgen</SelectItem>
              <SelectItem value="week">Diese Woche</SelectItem>
              <SelectItem value="custom">Bestimmtes Datum</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filterDate === 'custom' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Datum wählen</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[160px] justify-start text-left font-normal",
                    !customDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDate ? format(customDate, 'dd.MM.yyyy', { locale: de }) : 'Datum wählen'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={customDate || undefined}
                  onSelect={handleCalendarSelect}
                  locale={de}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="filter-time" className="text-xs">Ab Uhrzeit</Label>
          <Input
            id="filter-time"
            type="time"
            value={filterFromTime}
            onChange={(e) => onFilterFromTimeChange(e.target.value)}
            className="w-[140px]"
            placeholder="Alle"
          />
        </div>

        {(filterFromTime || filterDate === 'custom') && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onFilterFromTimeChange('')
                onFilterDateChange('today')
                onCustomDateChange(null)
              }}
            >
              Filter zurücksetzen
            </Button>
          </div>
        )}
      </div>

      {/* Select All Header */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all"
            checked={allSelected}
            onCheckedChange={onSelectAll}
          />
          <Label htmlFor="select-all" className="text-sm cursor-pointer">
            Alle auswählen ({events.length} Termine)
          </Label>
        </div>
        {selectedEvents.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {selectedEvents.length} ausgewählt
          </span>
        )}
      </div>

      {/* Event List */}
      {events.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Keine Termine im ausgewählten Zeitraum</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => {
            const isSelected = selectedEvents.includes(event.id)
            const customerName = getCustomerName(event)

            return (
              <div
                key={event.id}
                className={`
                  flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer
                  ${isSelected
                    ? 'bg-primary/5 border-primary'
                    : 'bg-card hover:bg-accent/50'
                  }
                `}
                onClick={() => onSelectEvent(event.id)}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onSelectEvent(event.id)}
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Time */}
                <div className="w-24 flex-shrink-0">
                  <div className="text-sm font-medium">
                    {formatTime(event.start_time)} - {formatTime(event.end_time)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateDisplay(event.start_time)}
                  </div>
                </div>

                {/* Customer Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{customerName}</div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    {event.customer_email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {event.customer_email}
                      </span>
                    )}
                    {event.customer_phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {event.customer_phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Attendees */}
                {event.attendee_count && event.attendee_count > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {event.attendee_count}
                  </div>
                )}

                {/* Confirmation Status Badge */}
                {event.confirmation_status && event.confirmation_status !== 'no_notification' && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant={event.confirmation_status === 'confirmed' ? 'default' : 'secondary'}
                          className={cn(
                            'text-xs cursor-help',
                            event.confirmation_status === 'confirmed'
                              ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-100'
                          )}
                        >
                          {event.confirmation_status === 'confirmed' ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Bestätigt
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              Ausstehend
                            </>
                          )}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {event.confirmation_status === 'confirmed'
                          ? `Bestätigt am ${formatConfirmedAt(event.confirmed_at)} Uhr`
                          : 'E-Mail gesendet, noch nicht bestätigt'
                        }
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Contact Indicators */}
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${event.customer_email ? 'bg-green-500' : 'bg-gray-300'}`}
                    title={event.customer_email ? 'E-Mail vorhanden' : 'Keine E-Mail'}
                  />
                  <div
                    className={`h-2 w-2 rounded-full ${event.customer_phone ? 'bg-blue-500' : 'bg-gray-300'}`}
                    title={event.customer_phone ? 'Telefon vorhanden' : 'Kein Telefon'}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
