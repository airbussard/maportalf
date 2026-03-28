'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  CalendarClock, Clock, CalendarDays, BarChart3, RefreshCw,
  ChevronLeft, ChevronRight, Check, Pencil, Plus, AlertTriangle,
  ChevronDown, ChevronUp, Timer,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getTimesheetEntries, generateTimesheetForMonth, adjustTimesheetEntry,
  addManualEntry, confirmMonthlyTimesheet, getTimesheetConfirmation,
} from '@/app/actions/timesheet'
import type { TimesheetDaySummary } from '@/lib/types/timesheet'
import { toast } from 'sonner'

interface TimesheetViewProps {
  userId: string
  initialYear: number
  initialMonth: number
}

export function TimesheetView({ userId, initialYear, initialMonth }: TimesheetViewProps) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [entries, setEntries] = useState<TimesheetDaySummary[]>([])
  const [confirmation, setConfirmation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [adjustDialog, setAdjustDialog] = useState<{ entry: TimesheetDaySummary } | null>(null)
  const [manualDialog, setManualDialog] = useState(false)

  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
  ]

  useEffect(() => {
    loadData()
  }, [year, month])

  async function loadData() {
    setLoading(true)
    try {
      const [data, conf] = await Promise.all([
        getTimesheetEntries(year, month),
        getTimesheetConfirmation(year, month),
      ])
      setEntries(data)
      setConfirmation(conf)
    } catch (err) {
      console.error('Laden fehlgeschlagen:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    startTransition(async () => {
      try {
        await generateTimesheetForMonth(userId, year, month)
        await loadData()
        toast.success('Daten aus Kalender aktualisiert')
      } catch (err) {
        toast.error('Aktualisierung fehlgeschlagen')
      }
    })
  }

  async function handleConfirm() {
    startTransition(async () => {
      try {
        await confirmMonthlyTimesheet(year, month)
        await loadData()
        toast.success('Monat bestätigt')
      } catch (err) {
        toast.error('Bestätigung fehlgeschlagen')
      }
    })
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Stats
  const totalMinutes = entries.reduce((s, e) => s + e.effective_minutes, 0)
  const workDays = entries.filter(e => e.effective_minutes > 0).length
  const totalBookings = entries.reduce((s, e) => s + e.calendar_booking_count, 0)
  const totalShift = entries.reduce((s, e) => s + (e.fi_shift_minutes || 0), 0)
  const idleMinutes = Math.max(0, totalShift - entries.reduce((s, e) => s + e.calendar_minutes, 0))

  const isConfirmed = confirmation?.confirmed_by_employee === true
  const isClosed = confirmation?.is_closed === true

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Zeiterfassung</h1>
          <p className="text-sm text-muted-foreground">Kalenderbasierte Arbeitszeitübersicht</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-[160px] text-center">
            {monthNames[month - 1]} {year}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={isPending}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isPending && "animate-spin")} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Status Badges */}
      {(isConfirmed || isClosed) && (
        <div className="flex gap-2">
          {isConfirmed && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">
              <Check className="h-3 w-3" /> Bestätigt
            </span>
          )}
          {isClosed && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">
              <Check className="h-3 w-3" /> Geschlossen (Admin)
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> Gesamtstunden
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMinutes(totalMinutes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Arbeitstage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{workDays}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Termine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalBookings}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Timer className="h-4 w-4" /> Leerlauf
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">
              {formatMinutes(idleMinutes)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Entries Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tagesübersicht</CardTitle>
          {!isClosed && (
            <Button variant="outline" size="sm" onClick={() => setManualDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Manuell
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarClock className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p>Keine Einträge für diesen Monat</p>
              <p className="text-sm mt-1">Klicke &quot;Aktualisieren&quot; um Daten aus dem Kalender zu laden</p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-[1fr_80px_80px_80px_80px_80px_40px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                <span>Datum</span>
                <span className="text-right">Termine</span>
                <span className="text-right">Kalender</span>
                <span className="text-right">Manuell</span>
                <span className="text-right">Gesamt</span>
                <span className="text-center">Status</span>
                <span />
              </div>

              {entries.map(entry => {
                const dateObj = new Date(entry.date + 'T00:00:00')
                const dayName = dateObj.toLocaleDateString('de-DE', { weekday: 'short' })
                const dateStr = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
                const isExpanded = expandedDay === entry.id
                const effectiveCal = entry.adjusted_minutes ?? entry.calendar_minutes

                return (
                  <div key={entry.id}>
                    <div
                      className={cn(
                        'grid grid-cols-[1fr_80px_80px_80px_80px_80px_40px] gap-2 px-3 py-2.5 rounded-md text-sm cursor-pointer hover:bg-muted/50 transition-colors',
                        entry.is_adjusted && 'bg-orange-50 dark:bg-orange-950/20',
                        entry.has_manual && 'bg-blue-50 dark:bg-blue-950/20',
                      )}
                      onClick={() => setExpandedDay(isExpanded ? null : entry.id)}
                    >
                      <span className="font-medium">
                        <span className="text-muted-foreground w-8 inline-block">{dayName}</span> {dateStr}
                      </span>
                      <span className="text-right">{entry.calendar_booking_count}</span>
                      <span className="text-right">{formatMinutes(effectiveCal)}</span>
                      <span className="text-right text-blue-600">{entry.manual_minutes > 0 ? formatMinutes(entry.manual_minutes) : '-'}</span>
                      <span className="text-right font-semibold">{formatMinutes(entry.effective_minutes)}</span>
                      <span className="flex justify-center">
                        {entry.is_adjusted && <span className="w-2 h-2 rounded-full bg-orange-400" title="Angepasst" />}
                        {entry.has_manual && <span className="w-2 h-2 rounded-full bg-blue-400 ml-1" title="Manuell" />}
                      </span>
                      <span className="flex justify-center">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                    </div>

                    {/* Expanded: Einzelne Buchungen */}
                    {isExpanded && (
                      <div className="ml-8 mr-4 mb-2 p-3 rounded-md bg-muted/30 border space-y-2">
                        {entry.booking_details && entry.booking_details.length > 0 ? (
                          entry.booking_details.map((b: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                {new Date(b.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                {' - '}
                                {new Date(b.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span>{b.customer_name || b.title || 'Termin'}</span>
                              <span className="font-medium">{b.duration_min} Min</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">Keine Buchungsdetails</p>
                        )}
                        {entry.manual_description && (
                          <div className="text-sm text-blue-600 border-t pt-2">
                            Manuell: {entry.manual_description} ({formatMinutes(entry.manual_minutes)})
                          </div>
                        )}
                        {entry.adjustment_reason && (
                          <div className="text-sm text-orange-600 border-t pt-2">
                            Anpassung: {entry.adjustment_reason}
                          </div>
                        )}
                        {!isClosed && (
                          <div className="flex gap-2 pt-2 border-t">
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setAdjustDialog({ entry }) }}>
                              <Pencil className="h-3 w-3 mr-1" /> Anpassen
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legende */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Automatisch (Kalender)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> Angepasst</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Manuell</span>
      </div>

      {/* Bestätigung */}
      {!isConfirmed && !isClosed && entries.length > 0 && (
        <Card className="border-[#fbb928]/30 bg-[#fbb928]/5">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">Monat bestätigen</p>
              <p className="text-sm text-muted-foreground">Bestätigen Sie Ihre Arbeitszeiterfassung für {monthNames[month - 1]} {year}</p>
            </div>
            <Button onClick={handleConfirm} disabled={isPending} className="bg-[#fbb928] hover:bg-[#e5a820] text-zinc-900">
              <Check className="h-4 w-4 mr-2" /> Bestätigen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Adjust Dialog */}
      {adjustDialog && (
        <AdjustDialog
          entry={adjustDialog.entry}
          onClose={() => setAdjustDialog(null)}
          onSave={async (minutes, reason) => {
            await adjustTimesheetEntry(adjustDialog.entry.id, minutes, reason)
            setAdjustDialog(null)
            await loadData()
            toast.success('Eintrag angepasst')
          }}
        />
      )}

      {/* Manual Entry Dialog */}
      {manualDialog && (
        <ManualEntryDialog
          year={year}
          month={month}
          onClose={() => setManualDialog(false)}
          onSave={async (date, minutes, description) => {
            await addManualEntry(date, minutes, description)
            setManualDialog(false)
            await loadData()
            toast.success('Manueller Eintrag hinzugefügt')
          }}
        />
      )}
    </div>
  )
}

// ─── Sub-Dialogs ───

function AdjustDialog({ entry, onClose, onSave }: {
  entry: TimesheetDaySummary
  onClose: () => void
  onSave: (minutes: number, reason: string) => Promise<void>
}) {
  const [minutes, setMinutes] = useState(String(entry.adjusted_minutes ?? entry.calendar_minutes))
  const [reason, setReason] = useState(entry.adjustment_reason || '')
  const [saving, setSaving] = useState(false)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eintrag anpassen - {new Date(entry.date + 'T00:00:00').toLocaleDateString('de-DE')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Kalender: {entry.calendar_minutes} Min ({entry.calendar_booking_count} Termine)
          </div>
          <div className="space-y-2">
            <Label>Angepasste Minuten</Label>
            <Input type="number" value={minutes} onChange={e => setMinutes(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Grund der Anpassung</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="z.B. Termin war länger als geplant" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button disabled={saving || !reason} onClick={async () => {
            setSaving(true)
            await onSave(parseInt(minutes) || 0, reason)
          }}>
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ManualEntryDialog({ year, month, onClose, onSave }: {
  year: number; month: number
  onClose: () => void
  onSave: (date: string, minutes: number, description: string) => Promise<void>
}) {
  const [date, setDate] = useState('')
  const [minutes, setMinutes] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manueller Eintrag</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Datum</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)}
              min={`${year}-${String(month).padStart(2, '0')}-01`}
              max={`${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`}
            />
          </div>
          <div className="space-y-2">
            <Label>Minuten</Label>
            <Input type="number" value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="z.B. 120" />
          </div>
          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="z.B. Büroarbeit, Schulung" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button disabled={saving || !date || !minutes || !description} onClick={async () => {
            setSaving(true)
            await onSave(date, parseInt(minutes) || 0, description)
          }}>
            Hinzufügen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
