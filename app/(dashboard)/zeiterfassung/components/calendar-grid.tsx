'use client'

import type { TimeEntry } from '@/lib/types/time-tracking'

interface CalendarGridProps {
  year: number
  month: number
  entries: TimeEntry[]
}

const WEEKDAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export function CalendarGrid({ year, month, entries }: CalendarGridProps) {
  // Calculate calendar data
  const firstDayOfMonth = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstWeekday = firstDayOfMonth.getDay() // 0 = Sunday, 1 = Monday, ...

  // Convert to Monday = 0
  const firstWeekdayMonday = firstWeekday === 0 ? 6 : firstWeekday - 1

  // Group entries by date
  const entriesByDate: Record<string, TimeEntry[]> = {}
  entries.forEach((entry) => {
    if (!entriesByDate[entry.date]) {
      entriesByDate[entry.date] = []
    }
    entriesByDate[entry.date].push(entry)
  })

  // Calculate total minutes per day
  const minutesByDate: Record<string, number> = {}
  Object.keys(entriesByDate).forEach((date) => {
    minutesByDate[date] = entriesByDate[date].reduce(
      (sum, entry) => sum + entry.duration_minutes,
      0
    )
  })

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`
  }

  const isToday = (day: number) => {
    const now = new Date()
    return (
      now.getDate() === day &&
      now.getMonth() + 1 === month &&
      now.getFullYear() === year
    )
  }

  const isWeekend = (day: number) => {
    const date = new Date(year, month - 1, day)
    const weekday = date.getDay()
    return weekday === 0 || weekday === 6 // Saturday or Sunday
  }

  return (
    <div className="grid grid-cols-7 gap-px bg-border border border-border rounded-lg overflow-hidden">
      {/* Weekday headers */}
      {WEEKDAY_NAMES.map((day) => (
        <div
          key={day}
          className="bg-muted p-3 text-center font-semibold text-sm text-muted-foreground"
        >
          {day}
        </div>
      ))}

      {/* Empty cells before first day */}
      {Array.from({ length: firstWeekdayMonday }).map((_, i) => (
        <div key={`empty-${i}`} className="bg-background p-3 min-h-[80px]"></div>
      ))}

      {/* Days of the month */}
      {Array.from({ length: daysInMonth }).map((_, i) => {
        const day = i + 1
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(
          2,
          '0'
        )}`
        const dayMinutes = minutesByDate[dateStr] || 0
        const today = isToday(day)
        const weekend = isWeekend(day)

        return (
          <div
            key={day}
            className={`
              bg-background p-3 min-h-[80px] relative cursor-pointer hover:bg-accent transition-colors
              ${today ? 'ring-2 ring-primary ring-inset' : ''}
              ${weekend ? 'bg-muted/30' : ''}
            `}
          >
            <div className="flex flex-col h-full">
              <div className="font-medium text-sm mb-1">{day}</div>
              {dayMinutes > 0 && (
                <div className="mt-auto text-xs font-semibold text-primary">
                  {formatDuration(dayMinutes)}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Empty cells after last day to complete the grid */}
      {Array.from({
        length: 7 - ((firstWeekdayMonday + daysInMonth) % 7),
      }).map((_, i) => {
        // Don't render if it would complete a full row
        if ((firstWeekdayMonday + daysInMonth) % 7 === 0) return null
        return <div key={`empty-end-${i}`} className="bg-background p-3 min-h-[80px]"></div>
      })}
    </div>
  )
}
