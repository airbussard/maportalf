'use server'

/**
 * Calendar Statistics Server Actions
 *
 * Provides aggregated booking statistics for analytics
 * Manager/Admin only access
 */

import { createClient } from '@/lib/supabase/server'

export type GroupBy = 'month' | 'week' | 'year'

export interface BookingStats {
  totalBookings: number
  data: {
    period: string
    count: number
    displayLabel: string
  }[]
  availableYears: number[]
}

/**
 * Get booking statistics grouped by time period
 * Only counts event_type='booking' and excludes cancelled events
 */
export async function getBookingStats(
  groupBy: GroupBy = 'month',
  limit: number = 12
): Promise<BookingStats | null> {
  try {
    const supabase = await createClient()

    // Check authentication and permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'manager' && profile?.role !== 'admin') {
      throw new Error('Unauthorized - Manager or Admin access required')
    }

    // Fetch all booking events (not cancelled)
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('start_time, created_at')
      .eq('event_type', 'booking')
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error fetching booking stats:', error)
      throw error
    }

    if (!events || events.length === 0) {
      return {
        totalBookings: 0,
        data: [],
        availableYears: []
      }
    }

    // Group events by selected period
    const groupedData = new Map<string, number>()
    const yearsSet = new Set<number>()

    events.forEach(event => {
      const date = new Date(event.start_time)
      const year = date.getFullYear()
      yearsSet.add(year)

      let periodKey: string
      let displayLabel: string

      switch (groupBy) {
        case 'year':
          periodKey = year.toString()
          displayLabel = year.toString()
          break

        case 'week':
          // Get ISO week number
          const weekNumber = getISOWeek(date)
          periodKey = `${year}-W${String(weekNumber).padStart(2, '0')}`
          displayLabel = `KW ${weekNumber} ${year}`
          break

        case 'month':
        default:
          const month = date.getMonth() + 1
          periodKey = `${year}-${String(month).padStart(2, '0')}`
          const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
          displayLabel = `${monthNames[date.getMonth()]} ${year}`
          break
      }

      groupedData.set(periodKey, (groupedData.get(periodKey) || 0) + 1)
    })

    // Convert to array and sort
    let dataArray = Array.from(groupedData.entries())
      .map(([period, count]) => {
        // Reconstruct displayLabel from period key
        let displayLabel: string
        if (groupBy === 'year') {
          displayLabel = period
        } else if (groupBy === 'week') {
          const [year, week] = period.split('-W')
          displayLabel = `KW ${parseInt(week)} ${year}`
        } else {
          const [year, month] = period.split('-')
          const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
          displayLabel = `${monthNames[parseInt(month) - 1]} ${year}`
        }

        return {
          period,
          count,
          displayLabel
        }
      })
      .sort((a, b) => a.period.localeCompare(b.period))

    // Limit to most recent periods (except for years)
    if (groupBy !== 'year' && dataArray.length > limit) {
      dataArray = dataArray.slice(-limit)
    }

    const availableYears = Array.from(yearsSet).sort((a, b) => b - a)

    return {
      totalBookings: events.length,
      data: dataArray,
      availableYears
    }

  } catch (error) {
    console.error('Error in getBookingStats:', error)
    return null
  }
}

/**
 * Get ISO week number from date
 */
function getISOWeek(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return weekNo
}
