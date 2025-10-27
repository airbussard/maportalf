/**
 * Request Calendar View Component
 *
 * Displays work requests in a monthly calendar layout
 */

'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RequestCard } from './request-card'
import {
  type WorkRequest,
  getMonthName,
  getYear,
  groupRequestsByDate
} from '@/lib/types/work-requests'

interface RequestCalendarViewProps {
  requests: WorkRequest[]
  userId: string
  onEdit?: (request: WorkRequest) => void
  onWithdraw?: (request: WorkRequest) => void
  onDelete?: (request: WorkRequest) => void
}

export function RequestCalendarView({
  requests,
  userId,
  onEdit,
  onWithdraw,
  onDelete
}: RequestCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  // Get current month/year
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // Get first and last day of month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)

  // Get day of week for first day (0 = Sunday, 1 = Monday, etc.)
  // Adjust so Monday = 0
  const firstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7

  // Total days in month
  const daysInMonth = lastDayOfMonth.getDate()

  // Group requests by date
  const requestsByDate = useMemo(() => groupRequestsByDate(requests), [requests])

  // Filter requests for current month
  const monthRequests = useMemo(() => {
    return requests.filter((r) => {
      const date = new Date(r.request_date)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })
  }, [requests, currentMonth, currentYear])

  // Navigate months
  const previousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Generate calendar grid
  const calendarDays = []
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null) // Empty cells before month starts
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  // Get requests for a specific day
  const getRequestsForDay = (day: number): WorkRequest[] => {
    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return requestsByDate[dateKey] || []
  }

  // Check if day is today
  const isToday = (day: number): boolean => {
    const today = new Date()
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {getMonthName(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`)}{' '}
          {currentYear}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Heute
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        {monthRequests.length} Request{monthRequests.length !== 1 ? 's' : ''} in diesem Monat
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
          <div key={day} className="text-center font-medium text-sm text-muted-foreground p-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`min-h-[100px] border rounded-lg p-2 ${
              day === null
                ? 'bg-muted/20'
                : isToday(day)
                ? 'bg-primary/10 border-primary'
                : 'bg-card'
            }`}
          >
            {day !== null && (
              <>
                {/* Day number */}
                <div
                  className={`text-sm font-medium mb-1 ${
                    isToday(day) ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {day}
                </div>

                {/* Requests for this day */}
                <div className="space-y-1">
                  {getRequestsForDay(day).map((request) => (
                    <div
                      key={request.id}
                      className="text-xs p-1 rounded bg-primary/10 hover:bg-primary/20 cursor-pointer transition-colors"
                      onClick={() => onEdit && onEdit(request)}
                    >
                      <div className="font-medium truncate">
                        {request.is_full_day ? 'Ganztägig' : 'Teilzeit'}
                      </div>
                      <div className="text-muted-foreground truncate">
                        {request.status === 'pending' && '⏳ Ausstehend'}
                        {request.status === 'approved' && '✅ Genehmigt'}
                        {request.status === 'rejected' && '❌ Abgelehnt'}
                        {request.status === 'withdrawn' && '↩️ Zurückgezogen'}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Detailed list below calendar */}
      {monthRequests.length > 0 && (
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-semibold">Details</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {monthRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                userId={userId}
                onEdit={onEdit}
                onWithdraw={onWithdraw}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
