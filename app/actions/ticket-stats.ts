'use server'

/**
 * Ticket Statistics Server Actions
 *
 * Provides aggregated data and analytics for the ticket system
 * Manager/Admin only access
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type TimeRange = 'day' | 'week' | 'month' | 'year'

export interface TicketStats {
  // KPIs
  totalTickets: number
  openTickets: number
  avgResponseTime: number | null // in hours
  avgResolutionTime: number | null // in hours
  spamRate: number // percentage
  teamWorkload: {
    employeeName: string
    ticketCount: number
  }[]

  // Time-based data
  ticketsOverTime: {
    date: string
    count: number
  }[]

  // Distribution data
  statusDistribution: {
    status: string
    count: number
    percentage: number
  }[]

  priorityDistribution: {
    priority: string
    count: number
    percentage: number
  }[]

  weekdayDistribution: {
    weekday: string
    count: number
  }[]
}

/**
 * Get comprehensive ticket statistics
 */
export async function getTicketStats(timeRange: TimeRange = 'month'): Promise<TicketStats | null> {
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

    // Use admin client for admins (bypasses RLS to see all tickets)
    // Managers see only their own tickets (RLS remains active)
    const isAdmin = profile?.role === 'admin'
    const dataClient = isAdmin ? createAdminClient() : supabase

    // Calculate date range
    const now = new Date()
    const startDate = new Date()

    switch (timeRange) {
      case 'day':
        startDate.setDate(now.getDate() - 1)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    // Fetch all tickets in range (excluding spam by default)
    // dataClient: Admin sees ALL tickets, Manager sees only assigned tickets
    const { data: tickets, error } = await dataClient
      .from('tickets')
      .select(`
        *,
        assigned_user:profiles!tickets_assigned_to_fkey(id, first_name, last_name),
        messages:ticket_messages(id, created_at, sender_id)
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching tickets for stats:', error)
      throw error
    }

    if (!tickets || tickets.length === 0) {
      return getEmptyStats()
    }

    // Calculate KPIs
    const totalTickets = tickets.filter(t => !t.is_spam).length
    const totalTicketsIncludingSpam = tickets.length
    const openTickets = tickets.filter(t => t.status === 'open' && !t.is_spam).length
    const spamRate = totalTicketsIncludingSpam > 0
      ? (tickets.filter(t => t.is_spam).length / totalTicketsIncludingSpam) * 100
      : 0

    // Calculate average response time (time to first non-creator message)
    let responseTimes: number[] = []
    for (const ticket of tickets.filter(t => !t.is_spam)) {
      const messages = (ticket.messages || []) as any[]
      const firstResponse = messages
        .filter(m => m.sender_id !== ticket.created_by)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]

      if (firstResponse) {
        const responseTime = new Date(firstResponse.created_at).getTime() - new Date(ticket.created_at).getTime()
        responseTimes.push(responseTime / (1000 * 60 * 60)) // Convert to hours
      }
    }
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null

    // Calculate average resolution time (time to resolved/closed status)
    const resolvedTickets = tickets.filter(t =>
      !t.is_spam && (t.status === 'resolved' || t.status === 'closed')
    )
    let resolutionTimes: number[] = []
    for (const ticket of resolvedTickets) {
      const resolutionTime = new Date(ticket.updated_at).getTime() - new Date(ticket.created_at).getTime()
      resolutionTimes.push(resolutionTime / (1000 * 60 * 60)) // Convert to hours
    }
    const avgResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : null

    // Team workload
    const workloadMap = new Map<string, number>()
    tickets.filter(t => !t.is_spam && t.assigned_to).forEach(ticket => {
      const employee = ticket.assigned_user as any
      if (employee) {
        const name = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown'
        workloadMap.set(name, (workloadMap.get(name) || 0) + 1)
      }
    })
    const teamWorkload = Array.from(workloadMap.entries())
      .map(([employeeName, ticketCount]) => ({ employeeName, ticketCount }))
      .sort((a, b) => b.ticketCount - a.ticketCount)

    // Tickets over time (group by date)
    const ticketsByDate = new Map<string, number>()
    tickets.filter(t => !t.is_spam).forEach(ticket => {
      const date = new Date(ticket.created_at).toISOString().split('T')[0]
      ticketsByDate.set(date, (ticketsByDate.get(date) || 0) + 1)
    })
    const ticketsOverTime = Array.from(ticketsByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Status distribution
    const statusMap = new Map<string, number>()
    tickets.filter(t => !t.is_spam).forEach(ticket => {
      statusMap.set(ticket.status, (statusMap.get(ticket.status) || 0) + 1)
    })
    const statusDistribution = Array.from(statusMap.entries())
      .map(([status, count]) => ({
        status,
        count,
        percentage: (count / totalTickets) * 100
      }))

    // Priority distribution
    const priorityMap = new Map<string, number>()
    tickets.filter(t => !t.is_spam).forEach(ticket => {
      priorityMap.set(ticket.priority, (priorityMap.get(ticket.priority) || 0) + 1)
    })
    const priorityDistribution = Array.from(priorityMap.entries())
      .map(([priority, count]) => ({
        priority,
        count,
        percentage: (count / totalTickets) * 100
      }))

    // Weekday distribution
    const weekdayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
    const weekdayMap = new Map<number, number>()
    tickets.filter(t => !t.is_spam).forEach(ticket => {
      const weekday = new Date(ticket.created_at).getDay()
      weekdayMap.set(weekday, (weekdayMap.get(weekday) || 0) + 1)
    })
    const weekdayDistribution = Array.from(weekdayMap.entries())
      .map(([day, count]) => ({
        weekday: weekdayNames[day],
        count
      }))
      .sort((a, b) => weekdayNames.indexOf(a.weekday) - weekdayNames.indexOf(b.weekday))

    return {
      totalTickets,
      openTickets,
      avgResponseTime,
      avgResolutionTime,
      spamRate,
      teamWorkload,
      ticketsOverTime,
      statusDistribution,
      priorityDistribution,
      weekdayDistribution
    }

  } catch (error) {
    console.error('Error in getTicketStats:', error)
    return null
  }
}

function getEmptyStats(): TicketStats {
  return {
    totalTickets: 0,
    openTickets: 0,
    avgResponseTime: null,
    avgResolutionTime: null,
    spamRate: 0,
    teamWorkload: [],
    ticketsOverTime: [],
    statusDistribution: [],
    priorityDistribution: [],
    weekdayDistribution: []
  }
}
