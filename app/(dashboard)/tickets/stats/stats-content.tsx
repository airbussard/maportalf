'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, TrendingUp, TrendingDown, Clock, Users, AlertCircle, Shield, Calendar, Ticket, Timer, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TicketStats, TimeRange } from '@/app/actions/ticket-stats'
import type { BookingStats, GroupBy } from '@/app/actions/calendar-stats'
import { getBookingStats } from '@/app/actions/calendar-stats'
import { TicketVolumeChart } from './components/ticket-volume-chart'
import { StatusDistributionChart } from './components/status-distribution-chart'
import { WeekdayDistributionChart } from './components/weekday-distribution-chart'
import { TeamWorkloadTable } from './components/team-workload-table'
import { BookingVolumeChart } from './components/booking-volume-chart'
import { StatsExportDialog } from './components/stats-export-dialog'

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
  const [bookingFilter, setBookingFilter] = useState('last12')
  const [loadingBookingStats, setLoadingBookingStats] = useState(false)
  const [compareYear, setCompareYear] = useState(false)

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value as TimeRange)
    router.push(`/tickets/stats?range=${value}`)
  }

  const refreshBookingStats = async (filter: string, compare: boolean) => {
    setLoadingBookingStats(true)
    try {
      let groupBy: GroupBy = 'month'
      let limit = 100
      let filterYear: number | undefined

      let limitToMonth: number | undefined

      if (filter === 'last12') {
        groupBy = 'month'
        limit = 12
      } else if (filter === 'ytd') {
        groupBy = 'month'
        filterYear = new Date().getFullYear()
        limitToMonth = new Date().getMonth() // Monat 0-basiert = letzter abgeschlossener Monat
        if (limitToMonth === 0) { filterYear--; limitToMonth = 12 } // Jan → zeige Dez Vorjahr
        limit = 12
      } else if (filter === 'allMonths') {
        groupBy = 'month'
        limit = 100
      } else if (filter === 'weeks') {
        groupBy = 'week'
        limit = 24
      } else if (filter === 'allYears') {
        groupBy = 'year'
        limit = 100
      } else if (filter.startsWith('year-')) {
        groupBy = 'month'
        filterYear = parseInt(filter.replace('year-', ''))
        limit = 12
      }

      setBookingGroupBy(groupBy)
      const newStats = await getBookingStats(groupBy, limit, compare, filterYear, limitToMonth)
      setBookingStats(newStats)
    } catch (error) {
      console.error('Error loading booking stats:', error)
    } finally {
      setLoadingBookingStats(false)
    }
  }

  const handleFilterChange = async (value: string) => {
    setBookingFilter(value)
    await refreshBookingStats(value, compareYear)
  }

  const handleCompareToggle = async (checked: boolean) => {
    setCompareYear(checked)
    await refreshBookingStats(bookingFilter, checked)
  }

  // Load initial booking stats on mount
  useEffect(() => {
    if (!initialBookingStats) {
      refreshBookingStats('last12', false)
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
    <div className="space-y-7.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold leading-[30px] text-foreground flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            Ticket-Statistiken
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Umfassende Analysen und Insights
          </p>
        </div>

        <div className="flex items-center gap-2">
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

          <StatsExportDialog
            availableYears={bookingStats?.availableYears || []}
            currentFilter={bookingFilter}
            currentCompare={compareYear}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 2xl:gap-7.5">
        <div className="rounded-[10px] bg-card p-6 shadow-1 dark:shadow-card">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#3C50E0]/10">
              <Ticket className="size-6 text-[#3C50E0]" />
            </div>
            <div>
              <h4 className="text-heading-6 font-bold text-foreground">{stats.totalTickets}</h4>
              <p className="text-sm font-medium text-muted-foreground">Gesamt Tickets</p>
            </div>
          </div>
        </div>

        <div className="rounded-[10px] bg-card p-6 shadow-1 dark:shadow-card">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#FF9C55]/10">
              <Clock className="size-6 text-[#FF9C55]" />
            </div>
            <div>
              <h4 className="text-heading-6 font-bold text-foreground">{stats.openTickets}</h4>
              <p className="text-sm font-medium text-muted-foreground">Offene Tickets</p>
            </div>
          </div>
        </div>

        <div className="rounded-[10px] bg-card p-6 shadow-1 dark:shadow-card">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#219653]/10">
              <Timer className="size-6 text-[#219653]" />
            </div>
            <div>
              <h4 className="text-heading-6 font-bold text-foreground">{formatHours(stats.avgResponseTime)}</h4>
              <p className="text-sm font-medium text-muted-foreground">Ø Antwortzeit</p>
            </div>
          </div>
        </div>

        <div className="rounded-[10px] bg-card p-6 shadow-1 dark:shadow-card">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#fbb928]/10">
              <CheckCircle2 className="size-6 text-[#fbb928]" />
            </div>
            <div>
              <h4 className="text-heading-6 font-bold text-foreground">{formatHours(stats.avgResolutionTime)}</h4>
              <p className="text-sm font-medium text-muted-foreground">Ø Lösungszeit</p>
            </div>
          </div>
        </div>

        <div className="rounded-[10px] bg-card p-6 shadow-1 dark:shadow-card">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#3C50E0]/10">
              <Shield className="size-6 text-[#3C50E0]" />
            </div>
            <div>
              <h4 className="text-heading-6 font-bold text-foreground">{stats.spamRate.toFixed(1)}%</h4>
              <p className="text-sm font-medium text-muted-foreground">Spam-Rate</p>
            </div>
          </div>
        </div>

        <div className="rounded-[10px] bg-card p-6 shadow-1 dark:shadow-card">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#219653]/10">
              <Users className="size-6 text-[#219653]" />
            </div>
            <div>
              <h4 className="text-heading-6 font-bold text-foreground">{stats.teamWorkload.length}</h4>
              <p className="text-sm font-medium text-muted-foreground">Team-Größe</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
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
            <div className="rounded-[10px] bg-card px-7.5 pb-6 pt-7.5 shadow-1 dark:shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-lg font-bold text-foreground">Ticket-Volumen über Zeit</h2>
              </div>
              <div className="-ml-4 -mr-5">
                <TicketVolumeChart data={stats.ticketsOverTime} />
              </div>
            </div>

            <div className="rounded-[10px] bg-card px-7.5 pb-6 pt-7.5 shadow-1 dark:shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-lg font-bold text-foreground">Status-Verteilung</h2>
              </div>
              <div className="-mx-3">
                <StatusDistributionChart data={stats.statusDistribution} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-[10px] bg-card px-7.5 pb-6 pt-7.5 shadow-1 dark:shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-lg font-bold text-foreground">Status-Verteilung</h2>
              </div>
              <div className="-mx-3">
                <StatusDistributionChart data={stats.statusDistribution} />
              </div>
            </div>

            <div className="rounded-[10px] bg-card px-7.5 pb-6 pt-7.5 shadow-1 dark:shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-lg font-bold text-foreground">Prioritäts-Verteilung</h2>
              </div>
              <div className="-mx-3">
                <StatusDistributionChart data={stats.priorityDistribution.map(p => ({
                  status: p.priority,
                  count: p.count,
                  percentage: p.percentage
                }))} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Time Analysis Tab */}
        <TabsContent value="time" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-[10px] bg-card px-7.5 pb-6 pt-7.5 shadow-1 dark:shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-lg font-bold text-foreground">Wochentags-Analyse</h2>
              </div>
              <div className="-ml-4 -mr-5">
                <WeekdayDistributionChart data={stats.weekdayDistribution} />
              </div>
            </div>

            <div className="rounded-[10px] bg-card px-7.5 pb-6 pt-7.5 shadow-1 dark:shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-lg font-bold text-foreground">Ticket-Trend</h2>
              </div>
              <div className="-ml-4 -mr-5">
                <TicketVolumeChart data={stats.ticketsOverTime} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold">Buchungs-Statistiken</h2>
              <p className="text-sm text-muted-foreground">Nur Buchungs-Events (keine Blocker, keine FI-Zuweisungen)</p>
            </div>
            <div className="flex items-center gap-4">
              {(bookingGroupBy === 'month') && (
                <div className="flex items-center gap-2">
                  <Switch id="compare-year" checked={compareYear} onCheckedChange={handleCompareToggle} disabled={loadingBookingStats} />
                  <Label htmlFor="compare-year" className="text-sm whitespace-nowrap">Vorjahr</Label>
                </div>
              )}
              <Select value={bookingFilter} onValueChange={handleFilterChange} disabled={loadingBookingStats}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last12">Letzte 12 Monate</SelectItem>
                  <SelectItem value="ytd">Jahr bis heute (YTD)</SelectItem>
                  <SelectItem value="allMonths">Alle Monate</SelectItem>
                  <SelectItem value="weeks">24 Wochen</SelectItem>
                  <SelectItem value="allYears">Alle Jahre</SelectItem>
                  {bookingStats?.availableYears?.map(y => (
                    <SelectItem key={y} value={`year-${y}`}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loadingBookingStats ? (
            <Card className="p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </Card>
          ) : bookingStats ? (
            <>
              <div className={`grid grid-cols-1 ${compareYear && bookingStats.yearOverYearChange !== undefined ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 mb-4`}>
                <div className="rounded-[10px] bg-card p-6 shadow-1 dark:shadow-card">
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-full bg-[#3C50E0]/10">
                      <Calendar className="size-6 text-[#3C50E0]" />
                    </div>
                    <div>
                      <h4 className="text-heading-6 font-bold text-foreground">{bookingStats.totalBookings}</h4>
                      <p className="text-sm font-medium text-muted-foreground">Gesamt Buchungen</p>
                    </div>
                  </div>
                </div>

                {bookingStats.availableYears.length > 0 && (
                  <div className="rounded-[10px] bg-card p-6 shadow-1 dark:shadow-card">
                    <div className="flex items-center gap-4">
                      <div className="flex size-12 items-center justify-center rounded-full bg-[#FF9C55]/10">
                        <BarChart3 className="size-6 text-[#FF9C55]" />
                      </div>
                      <div>
                        <h4 className="text-heading-6 font-bold text-foreground">
                          {bookingStats.availableYears[bookingStats.availableYears.length - 1]} - {bookingStats.availableYears[0]}
                        </h4>
                        <p className="text-sm font-medium text-muted-foreground">
                          {bookingStats.availableYears.length} {bookingStats.availableYears.length === 1 ? 'Jahr' : 'Jahre'} verfügbar
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {compareYear && bookingStats.yearOverYearChange !== undefined && bookingStats.yearOverYearChange !== null && (
                  <div className="rounded-[10px] bg-card p-6 shadow-1 dark:shadow-card">
                    <div className="flex items-center gap-4">
                      <div className={`flex size-12 items-center justify-center rounded-full ${bookingStats.yearOverYearChange >= 0 ? 'bg-[#219653]/10' : 'bg-[#F23030]/10'}`}>
                        {bookingStats.yearOverYearChange >= 0
                          ? <TrendingUp className="size-6 text-[#219653]" />
                          : <TrendingDown className="size-6 text-[#F23030]" />
                        }
                      </div>
                      <div>
                        <h4 className={`text-heading-6 font-bold ${bookingStats.yearOverYearChange >= 0 ? 'text-[#219653]' : 'text-[#F23030]'}`}>
                          {bookingStats.yearOverYearChange >= 0 ? '+' : ''}{bookingStats.yearOverYearChange}%
                        </h4>
                        <p className="text-sm font-medium text-muted-foreground">
                          Vorjahr: {bookingStats.previousYearTotal} Buchungen
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-[10px] bg-card px-7.5 pb-6 pt-7.5 shadow-1 dark:shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h2 className="text-lg font-bold text-foreground">
                    Buchungen pro {bookingGroupBy === 'month' ? 'Monat' : bookingGroupBy === 'week' ? 'Woche' : 'Jahr'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {bookingGroupBy === 'year'
                      ? 'Alle verfügbaren Jahre'
                      : `Letzte ${bookingStats.data.length} ${bookingGroupBy === 'month' ? 'Monate' : 'Wochen'}`}
                  </p>
                </div>
                <div className="-ml-4 -mr-5">
                  <BookingVolumeChart data={bookingStats.data} groupBy={bookingGroupBy} showComparison={compareYear} />
                </div>
              </div>
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
          <div className="rounded-[10px] bg-card shadow-1 dark:shadow-card">
            <div className="px-7.5 pt-7.5 pb-4">
              <h2 className="text-lg font-bold text-foreground">Team Auslastung</h2>
              <p className="text-sm text-muted-foreground mt-1">Zugewiesene Tickets pro Mitarbeiter</p>
            </div>
            <TeamWorkloadTable data={stats.teamWorkload} />
          </div>
        </TabsContent> */}
      </Tabs>
    </div>
  )
}
