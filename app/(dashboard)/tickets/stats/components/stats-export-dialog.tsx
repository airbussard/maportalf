'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Download, FileText } from 'lucide-react'

interface StatsExportDialogProps {
  availableYears: number[]
  currentFilter: string
  currentCompare: boolean
}

export function StatsExportDialog({ availableYears, currentFilter, currentCompare }: StatsExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [includeBookings, setIncludeBookings] = useState(true)
  const [includeTickets, setIncludeTickets] = useState(true)
  const [range, setRange] = useState(currentFilter)
  const [compare, setCompare] = useState(currentCompare)
  const [ticketRange, setTicketRange] = useState('year')
  const [exporting, setExporting] = useState(false)

  const handleExport = () => {
    setExporting(true)

    const sections = []
    if (includeBookings) sections.push('bookings')
    if (includeTickets) sections.push('tickets')

    if (sections.length === 0) return

    const params = new URLSearchParams({
      sections: sections.join(','),
      range,
      compare: String(compare),
      ticketRange,
    })

    window.open(`/api/stats/pdf?${params.toString()}`, '_blank')

    setTimeout(() => {
      setExporting(false)
      setOpen(false)
    }, 1000)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          PDF Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#fbb928]" />
            Statistik exportieren
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Inhalte */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Inhalte</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Buchungsstatistik</p>
                  <p className="text-xs text-muted-foreground">Monatliche Buchungszahlen</p>
                </div>
                <Switch checked={includeBookings} onCheckedChange={setIncludeBookings} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Ticketstatistik</p>
                  <p className="text-xs text-muted-foreground">Status, Priorität, Antwortzeiten</p>
                </div>
                <Switch checked={includeTickets} onCheckedChange={setIncludeTickets} />
              </div>
            </div>
          </div>

          {/* Zeitraum Buchungen */}
          {includeBookings && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Zeitraum Buchungen</Label>
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last12">Letzte 12 Monate</SelectItem>
                  <SelectItem value="allMonths">Alle Monate</SelectItem>
                  {availableYears.map(y => (
                    <SelectItem key={y} value={`year-${y}`}>Jahr {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch id="export-compare" checked={compare} onCheckedChange={setCompare} />
                <Label htmlFor="export-compare" className="text-sm">Vorjahresvergleich einschließen</Label>
              </div>
            </div>
          )}

          {/* Zeitraum Tickets */}
          {includeTickets && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Zeitraum Tickets</Label>
              <Select value={ticketRange} onValueChange={setTicketRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">Letztes Jahr</SelectItem>
                  <SelectItem value="month">Letzter Monat</SelectItem>
                  <SelectItem value="4weeks">Letzte 4 Wochen</SelectItem>
                  <SelectItem value="week">Letzte Woche</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button
            onClick={handleExport}
            disabled={exporting || (!includeBookings && !includeTickets)}
            className="bg-[#fbb928] hover:bg-[#e5a820] text-zinc-900"
          >
            {exporting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                Wird erstellt...
              </span>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                PDF erstellen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
