'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, TrendingUp, Clock, Users, AlertCircle, Shield, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TicketStats, TimeRange } from '@/app/actions/ticket-stats'
import type { BookingStats, GroupBy } from '@/app/actions/calendar-stats'
import { getBookingStats } from '@/app/actions/calendar-stats'
import { TicketVolumeChart } from './components/ticket-volume-chart'
import { StatusDistributionChart } from './components/status-distribution-chart'
import { WeekdayDistributionChart } from './components/weekday-distribution-chart'
import { TeamWorkloadTable } from './components/team-workload-table'
import { BookingVolumeChart } from './components/booking-volume-chart'

interface StatsContentProps {
  stats: TicketStats | null
  initialTimeRange: TimeRange
  bookingStats: BookingStats | null
}

export function StatsContent({ stats, initialTimeRange, bookingStats: initialBookingStats }: StatsContentProps) {
  const router = useRouter()
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange)
  const [bookingStats, setBookingStats] = useState<BookingStats | null>(initialBookingStats)
  const [bookingGroupBy, setBookingGroupBy] = useState<GroupBy>('month')
  const [loadingBookingStats, setLoadingBookingStats] = useState(false)

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value as TimeRange)
    router.push(`/tickets/stats?range=${value}`)
  }

  const handleBookingGroupByChange = async (value: string) => {
    const newGroupBy = value as GroupBy
    setBookingGroupBy(newGroupBy)
    setLoadingBookingStats(true)

    try {
      const limit = newGroupBy === 'year' ? 100 : 12
      const newStats = await getBookingStats(newGroupBy, limit)
      setBookingStats(newStats)
    } catch (error) {
      console.error('Error loading booking stats:', error)
    } finally {
      setLoadingBookingStats(false)
    }
  }

  // Load initial booking stats on mount
  useEffect(() => {
    if (!initialBookingStats) {
      handleBookingGroupByChange('month')
    }
  }, [])

  if (!stats) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Keine Statistiken verfügbar</p>
      </Card>
    )
  }

  const formatHours = (hours: number | null) => {
    if (hours === null) return 'N/A'
    if (hours < 1) return `${Math.round(hours * 60)} Min`
    if (hours < 24) return `${hours.toFixed(1)} Std`
    return `${(hours / 24).toFixed(1)} Tage`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            Ticket-Statistiken
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Umfassende Analysen und Insights
          </p>
        </div>

        {/* Time Range Filter */}
        <Select value={timeRange} onValueChange={handleTimeRangeChange}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="4weeks">Letzte 4 Wochen</SelectItem>
            <SelectItem value="week">Letzte Woche</SelectItem>
            <SelectItem value="month">Letzter Monat</SelectItem>
            <SelectItem value="year">Letztes Jahr</SelectItem>
            <SelectItem value="day">Letzter Tag</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt Tickets</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTickets}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Im gewählten Zeitraum
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offene Tickets</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openTickets}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aktuell ungelöst
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ø Antwortzeit</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(stats.avgResponseTime)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Durchschnittlich
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ø Lösungszeit</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(stats.avgResolutionTime)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Bis zur Lösung
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spam-Rate</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.spamRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Erkannte Spam-Tickets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team-Größe</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teamWorkload.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aktive Bearbeiter
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="distribution">Verteilung</TabsTrigger>
          <TabsTrigger value="time">Zeitanalyse</TabsTrigger>
          <TabsTrigger value="bookings">Buchungen</TabsTrigger>
          {/* <TabsTrigger value="team">Team</TabsTrigger> */}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Ticket-Volumen über Zeit</CardTitle>
                <CardDescription>Anzahl Tickets pro Tag</CardDescription>
              </CardHeader>
              <CardContent>
                <TicketVolumeChart data={stats.ticketsOverTime} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status-Verteilung</CardTitle>
                <CardDescription>Aktuelle Ticket-Status</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusDistributionChart data={stats.statusDistribution} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Status-Verteilung</CardTitle>
                <CardDescription>Verteilung nach Ticket-Status</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusDistributionChart data={stats.statusDistribution} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prioritäts-Verteilung</CardTitle>
                <CardDescription>Verteilung nach Priorität</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusDistributionChart data={stats.priorityDistribution.map(p => ({
                  status: p.priority,
                  count: p.count,
                  percentage: p.percentage
                }))} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Time Analysis Tab */}
        <TabsContent value="time" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Wochentags-Analyse</CardTitle>
                <CardDescription>Ticket-Verteilung nach Wochentag</CardDescription>
              </CardHeader>
              <CardContent>
                <WeekdayDistributionChart data={stats.weekdayDistribution} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ticket-Trend</CardTitle>
                <CardDescription>Entwicklung über den Zeitraum</CardDescription>
              </CardHeader>
              <CardContent>
                <TicketVolumeChart data={stats.ticketsOverTime} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold">Buchungs-Statistiken</h2>
              <p className="text-sm text-muted-foreground">Nur Buchungs-Events (keine Blocker, keine FI-Zuweisungen)</p>
            </div>
            <Select value={bookingGroupBy} onValueChange={handleBookingGroupByChange} disabled={loadingBookingStats}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">12 Monate</SelectItem>
                <SelectItem value="week">12 Wochen</SelectItem>
                <SelectItem value="year">Alle Jahre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingBookingStats ? (
            <Card className="p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </Card>
          ) : bookingStats ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gesamt Buchungen</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{bookingStats.totalBookings}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Im gesamten Zeitraum
                    </p>
                  </CardContent>
                </Card>

                {bookingStats.availableYears.length > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Daten verfügbar</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {bookingStats.availableYears[bookingStats.availableYears.length - 1]} - {bookingStats.availableYears[0]}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {bookingStats.availableYears.length} {bookingStats.availableYears.length === 1 ? 'Jahr' : 'Jahre'}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>
                    Buchungen pro {bookingGroupBy === 'month' ? 'Monat' : bookingGroupBy === 'week' ? 'Woche' : 'Jahr'}
                  </CardTitle>
                  <CardDescription>
                    {bookingGroupBy === 'year'
                      ? 'Alle verfügbaren Jahre'
                      : `Letzte ${bookingStats.data.length} ${bookingGroupBy === 'month' ? 'Monate' : 'Wochen'}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BookingVolumeChart data={bookingStats.data} groupBy={bookingGroupBy} />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Keine Buchungs-Daten verfügbar</p>
            </Card>
          )}
        </TabsContent>

        {/* Team Tab - Temporarily Hidden */}
        {/* <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team-Auslastung</CardTitle>
              <CardDescription>Zugewiesene Tickets pro Mitarbeiter</CardDescription>
            </CardHeader>
            <CardContent>
              <TeamWorkloadTable data={stats.teamWorkload} />
            </CardContent>
          </Card>
        </TabsContent> */}
      </Tabs>
    </div>
  )
}
