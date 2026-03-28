'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  ChevronLeft, ChevronRight, RefreshCw, Download, Users,
  Check, Lock, Unlock, AlertTriangle, Eye, Euro,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  getTimesheetSummary, regenerateAllTimesheets,
  closeTimesheetMonth, reopenTimesheetMonth, getTimesheetEntries,
  addBonusToMonth,
} from '@/app/actions/timesheet'
import type { TimesheetAdminOverview, TimesheetMonthSummary, TimesheetDaySummary } from '@/lib/types/timesheet'
import { toast } from 'sonner'

export function AdminTimesheetView() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState<TimesheetAdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [onlyWithData, setOnlyWithData] = useState(false)
  const [detailEmployee, setDetailEmployee] = useState<TimesheetMonthSummary | null>(null)
  const [detailEntries, setDetailEntries] = useState<TimesheetDaySummary[]>([])
  const [closeDialog, setCloseDialog] = useState<TimesheetMonthSummary | null>(null)
  const [bonusInput, setBonusInput] = useState('')
  const [bonusDialog, setBonusDialog] = useState<TimesheetMonthSummary | null>(null)
  const [bonusAmount, setBonusAmount] = useState('')
  const [bonusNotes, setBonusNotes] = useState('')

  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
  ]

  useEffect(() => { loadData() }, [year, month])

  async function loadData() {
    setLoading(true)
    try {
      // Automatisch alle Timesheets aus Kalender generieren/aktualisieren
      await regenerateAllTimesheets(year, month)
      const result = await getTimesheetSummary(year, month)
      setData(result)
    } catch (err) {
      console.error(err)
      toast.error('Daten konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegenerateAll() {
    startTransition(async () => {
      try {
        const result = await regenerateAllTimesheets(year, month)
        toast.success(`${result.employeesProcessed} Mitarbeiter aktualisiert (${result.totalDays} Tage)`)
        await loadData()
      } catch (err) {
        toast.error('Aktualisierung fehlgeschlagen')
      }
    })
  }

  async function handleCloseMonth(emp: TimesheetMonthSummary) {
    setCloseDialog(emp)
    setBonusInput(String(emp.bonus_amount || 0))
  }

  async function confirmCloseMonth() {
    if (!closeDialog) return
    startTransition(async () => {
      try {
        await closeTimesheetMonth(closeDialog.employee_id, year, month, parseFloat(bonusInput) || 0)
        toast.success('Monat festgeschrieben')
        setCloseDialog(null)
        await loadData()
      } catch (err) {
        toast.error('Fehler beim Festschreiben')
      }
    })
  }

  async function handleSaveBonus() {
    if (!bonusDialog) return
    startTransition(async () => {
      try {
        await addBonusToMonth(bonusDialog.employee_id, year, month, parseFloat(bonusAmount) || 0, bonusNotes)
        toast.success('Bonus gespeichert')
        setBonusDialog(null)
        await loadData()
      } catch (err) {
        toast.error('Fehler beim Speichern')
      }
    })
  }

  async function handleReopenMonth(empId: string) {
    startTransition(async () => {
      try {
        await reopenTimesheetMonth(empId, year, month)
        toast.success('Monat wieder geöffnet')
        await loadData()
      } catch (err) {
        toast.error('Fehler beim Öffnen')
      }
    })
  }

  async function openDetail(emp: TimesheetMonthSummary) {
    setDetailEmployee(emp)
    try {
      const entries = await getTimesheetEntries(year, month, emp.employee_id)
      setDetailEntries(entries)
    } catch (err) {
      toast.error('Details konnten nicht geladen werden')
    }
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const employees = data?.employees || []
  const filtered = onlyWithData ? employees.filter(e => e.total_effective_minutes > 0 || e.total_pay > 0) : employees

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Zeiterfassung Verwaltung</h1>
          <p className="text-sm text-muted-foreground">Kalenderbasierte Abrechnung - Monatsübersicht</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-[140px] text-center">{monthNames[month - 1]} {year}</span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleRegenerateAll} disabled={isPending}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isPending && "animate-spin")} />
            Alle aktualisieren
          </Button>
          <Button variant="outline" asChild>
            <a href={`/api/zeiterfassung/pdf?year=${year}&month=${month}`} target="_blank">
              <Download className="h-4 w-4 mr-2" /> PDF
            </a>
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Switch id="only-data" checked={onlyWithData} onCheckedChange={setOnlyWithData} />
        <Label htmlFor="only-data" className="text-sm">Nur mit Daten</Label>
        <span className="text-sm text-muted-foreground ml-4">
          {filtered.length} von {employees.length} Mitarbeiter
        </span>
      </div>

      {/* Totals */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Gesamtstunden</p>
              <p className="text-xl font-bold">{formatMinutes(Math.round(data.totals.total_hours * 60))}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Arbeitstage</p>
              <p className="text-xl font-bold">{data.totals.total_days}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Termine</p>
              <p className="text-xl font-bold">{data.totals.total_bookings}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Gesamtkosten</p>
              <p className="text-xl font-bold">{formatCurrency(data.totals.total_pay)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Employee Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">MA-Nr.</th>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-right p-3 font-medium">Tage</th>
                  <th className="text-right p-3 font-medium">Stunden</th>
                  <th className="text-right p-3 font-medium">€/Std.</th>
                  <th className="text-right p-3 font-medium">Stundengeh.</th>
                  <th className="text-right p-3 font-medium">Fixgehalt</th>
                  <th className="text-right p-3 font-medium font-bold">Gesamt</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 10 }).map((_, j) => (
                        <td key={j} className="p-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      Keine Mitarbeiter mit Daten
                    </td>
                  </tr>
                ) : (
                  filtered.map(emp => (
                    <tr key={emp.employee_id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-muted-foreground">{emp.employee_number || '-'}</td>
                      <td className="p-3 font-medium">{emp.employee_name}</td>
                      <td className="p-3 text-right">{emp.work_days}</td>
                      <td className="p-3 text-right">{formatMinutes(emp.total_effective_minutes)}</td>
                      <td className="p-3 text-right">
                        {emp.hourly_rate ? `${emp.hourly_rate.toFixed(2)}€` : (
                          <span className="text-orange-500 flex items-center justify-end gap-1">
                            <AlertTriangle className="h-3 w-3" /> 20€
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">{formatCurrency(emp.hourly_pay)}</td>
                      <td className="p-3 text-right">{emp.fixed_pay > 0 ? formatCurrency(emp.fixed_pay) : '-'}</td>
                      <td className="p-3 text-right font-bold">{formatCurrency(emp.total_pay)}</td>
                      <td className="p-3 text-center">
                        {emp.is_closed ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full px-2 py-0.5">
                            <Lock className="h-3 w-3" /> Geschl.
                          </span>
                        ) : emp.is_confirmed ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full px-2 py-0.5">
                            <Check className="h-3 w-3" /> Best.
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Offen</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetail(emp)} title="Details">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setBonusDialog(emp); setBonusAmount(String(emp.bonus_amount || 0)); setBonusNotes('') }} title="Bonus">
                            <Euro className="h-3.5 w-3.5" />
                          </Button>
                          {emp.is_closed ? (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReopenMonth(emp.employee_id)} title="Wieder öffnen">
                              <Unlock className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCloseMonth(emp)} title="Festschreiben">
                              <Lock className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {!loading && filtered.length > 0 && data && (
                <tfoot>
                  <tr className="border-t-2 bg-muted/30 font-bold">
                    <td className="p-3" colSpan={2}>Gesamt</td>
                    <td className="p-3 text-right">{data.totals.total_days}</td>
                    <td className="p-3 text-right">{formatMinutes(Math.round(data.totals.total_hours * 60))}</td>
                    <td className="p-3" />
                    <td className="p-3 text-right">{formatCurrency(data.totals.total_hourly_pay)}</td>
                    <td className="p-3 text-right">{formatCurrency(data.totals.total_fixed_pay)}</td>
                    <td className="p-3 text-right">{formatCurrency(data.totals.total_pay)}</td>
                    <td className="p-3" colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      {detailEmployee && (
        <Dialog open onOpenChange={() => setDetailEmployee(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {detailEmployee.employee_name} - {monthNames[month - 1]} {year}
              </DialogTitle>
            </DialogHeader>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Stunden</p>
                <p className="text-lg font-bold">{formatMinutes(detailEmployee.total_effective_minutes)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Stundenlohn</p>
                <p className="text-lg font-bold">
                  {detailEmployee.hourly_rate ? `${detailEmployee.hourly_rate.toFixed(2)}€` : '20€ (Fallback)'}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Gesamtgehalt</p>
                <p className="text-lg font-bold">{formatCurrency(detailEmployee.total_pay)}</p>
                {detailEmployee.fixed_pay > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ({formatCurrency(detailEmployee.hourly_pay)} + {formatCurrency(detailEmployee.fixed_pay)} Fix)
                  </p>
                )}
              </div>
            </div>

            {/* Day List */}
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {detailEntries.map(entry => {
                const dateObj = new Date(entry.date + 'T00:00:00')
                const calendarUrl = `/kalender?date=${entry.date}`
                return (
                  <a
                    key={entry.id}
                    href={calendarUrl}
                    className={cn(
                      'flex items-center justify-between p-2 rounded text-sm cursor-pointer transition-colors hover:bg-accent',
                      entry.is_adjusted && 'bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/40',
                      entry.has_manual && 'bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40',
                    )}
                  >
                    <span className="w-24 text-[#fbb928] font-medium underline underline-offset-2">
                      {dateObj.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    </span>
                    <span className="text-muted-foreground">{entry.calendar_booking_count} Termine</span>
                    <span className="font-medium">{formatMinutes(entry.effective_minutes)}</span>
                    <span>
                      {entry.is_adjusted && <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" title="Angepasst" />}
                      {entry.has_manual && <span className="w-2 h-2 rounded-full bg-blue-400 inline-block ml-1" title="Manuell" />}
                    </span>
                  </a>
                )
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Close Month Dialog */}
      {closeDialog && (
        <Dialog open onOpenChange={() => setCloseDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Monat festschreiben - {closeDialog.employee_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Nach dem Festschreiben werden die aktuellen Vergütungsdaten eingefroren.
                Spätere Änderungen am Stundenlohn wirken sich nicht mehr auf diesen Monat aus.
              </p>
              <div className="space-y-2">
                <Label>Einmaliger Bonus (EUR)</Label>
                <Input type="number" step="0.01" value={bonusInput} onChange={e => setBonusInput(e.target.value)} placeholder="0.00" />
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Stundengehalt:</span><span>{formatCurrency(closeDialog.hourly_pay)}</span></div>
                <div className="flex justify-between"><span>Fixgehalt:</span><span>{formatCurrency(closeDialog.fixed_pay)}</span></div>
                {(parseFloat(bonusInput) || 0) > 0 && <div className="flex justify-between text-[#fbb928]"><span>Bonus:</span><span>{formatCurrency(parseFloat(bonusInput) || 0)}</span></div>}
                <div className="flex justify-between font-bold border-t pt-1">
                  <span>Gesamt:</span>
                  <span>{formatCurrency(closeDialog.hourly_pay + closeDialog.fixed_pay + (parseFloat(bonusInput) || 0))}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCloseDialog(null)}>Abbrechen</Button>
              <Button onClick={confirmCloseMonth} disabled={isPending}>
                <Lock className="h-4 w-4 mr-2" /> Festschreiben
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Bonus Dialog */}
      {bonusDialog && (
        <Dialog open onOpenChange={() => setBonusDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bonus - {bonusDialog.employee_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Betrag (EUR)</Label>
                <Input type="number" step="0.01" value={bonusAmount} onChange={e => setBonusAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Notiz (optional)</Label>
                <Input value={bonusNotes} onChange={e => setBonusNotes(e.target.value)} placeholder="z.B. Sonderzahlung, Prämie" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBonusDialog(null)}>Abbrechen</Button>
              <Button onClick={handleSaveBonus} disabled={isPending}>Speichern</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount)
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
