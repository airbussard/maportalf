import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBookingStats } from '@/app/actions/calendar-stats'
import { getTicketStats } from '@/app/actions/ticket-stats'
import { generateStatsReportPdf } from '@/lib/pdf/stats-report-generator'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'manager' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const params = request.nextUrl.searchParams
    const sections = (params.get('sections') || 'bookings,tickets').split(',')
    const range = params.get('range') || 'last12'
    const compare = params.get('compare') === 'true'
    const ticketRange = params.get('ticketRange') || 'year'

    const includeBookings = sections.includes('bookings')
    const includeTickets = sections.includes('tickets')

    // Booking Stats
    let bookingStats = null
    if (includeBookings) {
      let limit = 100
      let filterYear: number | undefined
      let limitToMonth: number | undefined

      if (range === 'last12') limit = 12
      else if (range === 'ytd') {
        filterYear = new Date().getFullYear()
        limitToMonth = new Date().getMonth()
        if (limitToMonth === 0) { filterYear--; limitToMonth = 12 }
        limit = 12
      } else if (range.startsWith('year-')) {
        filterYear = parseInt(range.replace('year-', ''))
        limit = 12
      }

      bookingStats = await getBookingStats('month', limit, compare, filterYear, limitToMonth)
    }

    // Ticket Stats
    let ticketStats = null
    if (includeTickets) {
      ticketStats = await getTicketStats(ticketRange as any)
    }

    // Range Label
    const rangeLabels: Record<string, string> = {
      last12: 'Letzte 12 Monate',
      ytd: `Jahr bis heute ${new Date().getFullYear()} (Jan-${['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][new Date().getMonth() - 1] || 'Dez'})`,
      allMonths: 'Alle Monate',
      weeks: '24 Wochen',
      allYears: 'Alle Jahre',
    }
    let rangeLabel = rangeLabels[range] || range
    if (range.startsWith('year-')) rangeLabel = `Jahr ${range.replace('year-', '')}`

    const pdfBytes = await generateStatsReportPdf({
      includeBookings,
      includeTickets,
      bookingStats,
      ticketStats,
      rangeLabel,
      showComparison: compare,
    })

    const filename = `flighthour_statistik_${new Date().toISOString().split('T')[0]}.pdf`

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error: any) {
    console.error('Stats PDF generation error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
