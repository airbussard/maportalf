'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, TrendingUp, AlertCircle } from 'lucide-react'
import { getTimeEntries, getMonthlyStats, isMonthClosed } from '@/app/actions/time-tracking'
import { getTimeCategories } from '@/app/actions/time-categories'
import type { TimeEntry, TimeCategory, MonthlyStats } from '@/lib/types/time-tracking'
import { TimeEntryModal } from './time-entry-modal'
import { TimeEntriesList } from './time-entries-list'
import { CalendarGrid } from './calendar-grid'

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]

interface TimeTrackingViewProps {
  initialYear: number
  initialMonth: number
  userId: string
}

export function TimeTrackingView({ initialYear, initialMonth, userId }: TimeTrackingViewProps) {
  const router = useRouter()
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [categories, setCategories] = useState<TimeCategory[]>([])
  const [stats, setStats] = useState<MonthlyStats | null>(null)
  const [monthClosed, setMonthClosed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)

  useEffect(() => {
    loadData()
  }, [year, month])

  const loadData = async () => {
    setLoading(true)

    // Load entries
    const entriesResult = await getTimeEntries(year, month)
    if (entriesResult.success && entriesResult.data) {
      setEntries(entriesResult.data)
    }

    // Load categories
    const categoriesResult = await getTimeCategories()
    if (categoriesResult.success && categoriesResult.data) {
      setCategories(categoriesResult.data)
    }

    // Load stats
    const statsResult = await getMonthlyStats(year, month)
    if (statsResult.success && statsResult.data) {
      setStats(statsResult.data)
    }

    // Check if month is closed
    const closed = await isMonthClosed(year, month)
    setMonthClosed(closed)

    setLoading(false)
  }

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear)
    setMonth(newMonth)
    router.push(`/zeiterfassung?year=${newYear}&month=${newMonth}`)
  }

  const navigatePreviousMonth = () => {
    if (month === 1) {
      handleMonthChange(year - 1, 12)
    } else {
      handleMonthChange(year, month - 1)
    }
  }

  const navigateNextMonth = () => {
    if (month === 12) {
      handleMonthChange(year + 1, 1)
    } else {
      handleMonthChange(year, month + 1)
    }
  }

  const handleOpenModal = (entry?: TimeEntry) => {
    setEditingEntry(entry || null)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingEntry(null)
  }

  const handleSaveSuccess = () => {
    handleCloseModal()
    loadData() // Reload data
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins > 0 ? mins + 'm' : ''}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Zeiterfassung</h1>
          <p className="text-muted-foreground mt-2">
            Erfassen Sie Ihre Arbeitszeiten und verwalten Sie Ihre Stundenübersicht
          </p>
          {monthClosed && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Dieser Monat wurde abgeschlossen. Einträge können nicht mehr bearbeitet werden.
              </AlertDescription>
            </Alert>
          )}
        </div>
        <Button onClick={() => handleOpenModal()} disabled={monthClosed}>
          <Plus className="w-4 h-4 mr-2" />
          Neue Zeiterfassung
        </Button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={navigatePreviousMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-2xl font-semibold min-w-[200px] text-center">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <Button variant="outline" size="icon" onClick={navigateNextMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtstunden im Monat</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatDuration(stats.total_minutes) : '0h 0m'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.entries_count || 0} Einträge
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arbeitstage</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.days_worked || 0}</div>
            <p className="text-xs text-muted-foreground">
              von {new Date(year, month, 0).getDate()} Tagen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Durchschnitt pro Tag</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatDuration(stats.average_per_day) : '0h 0m'}
            </div>
            <p className="text-xs text-muted-foreground">an Arbeitstagen</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Monatsübersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarGrid
            year={year}
            month={month}
            entries={entries}
          />
        </CardContent>
      </Card>

      {/* Entries List */}
      <Card>
        <CardHeader>
          <CardTitle>Aktuelle Einträge</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Keine Einträge für diesen Monat vorhanden
            </p>
          ) : (
            <TimeEntriesList
              entries={entries}
              monthClosed={monthClosed}
              onEdit={handleOpenModal}
              onDelete={loadData}
            />
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {modalOpen && (
        <TimeEntryModal
          entry={editingEntry}
          categories={categories}
          year={year}
          month={month}
          onClose={handleCloseModal}
          onSuccess={handleSaveSuccess}
        />
      )}
    </div>
  )
}
