/**
 * Statistics PDF Report Generator
 * Professional FLIGHTHOUR branded export for booking & ticket statistics
 */

import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import type { BookingStats, BookingDataPoint } from '@/app/actions/calendar-stats'
import type { TicketStats } from '@/app/actions/ticket-stats'

// ─── Branding ───
const YELLOW = rgb(251 / 255, 185 / 255, 40 / 255)
const BLACK = rgb(0, 0, 0)
const DARK = rgb(0.2, 0.2, 0.2)
const GRAY = rgb(0.5, 0.5, 0.5)
const LIGHT = rgb(0.94, 0.94, 0.94)
const ROW_ALT = rgb(0.97, 0.97, 0.97)
const WHITE = rgb(1, 1, 1)
const GREEN = rgb(0.15, 0.6, 0.3)
const RED = rgb(0.8, 0.2, 0.2)
const MARGIN = 40
const PAGE_W = 842
const PAGE_H = 595

interface StatsExportOptions {
  includeBookings: boolean
  includeTickets: boolean
  bookingStats?: BookingStats | null
  ticketStats?: TicketStats | null
  rangeLabel: string
  showComparison: boolean
}

export async function generateStatsReportPdf(options: StatsExportOptions): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Logo laden
  let logoImage: any = null
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png')
    const logoBytes = fs.readFileSync(logoPath)
    logoImage = await pdfDoc.embedPng(logoBytes)
  } catch (e) { /* Continue without logo */ }

  // ─── Seite 1: Buchungsstatistik ───
  if (options.includeBookings && options.bookingStats) {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H])
    const bs = options.bookingStats
    let y = PAGE_H - MARGIN

    // Header
    y = drawPageHeader(page, font, fontBold, logoImage, 'Buchungsstatistik', options.rangeLabel, y)

    // KPI Boxen
    const avgPerMonth = bs.data.length > 0 ? Math.round(bs.totalBookings / bs.data.length) : 0
    const bestMonth = bs.data.reduce((best, d) => d.count > best.count ? d : best, { count: 0, displayLabel: '-' } as any)

    const kpis = [
      { label: 'Gesamt', value: String(bs.totalBookings), sub: 'Buchungen' },
      { label: 'Ø pro Monat', value: String(avgPerMonth), sub: 'Buchungen' },
      { label: 'Stärkster Monat', value: bestMonth.displayLabel, sub: `${bestMonth.count} Buchungen` },
    ]

    if (options.showComparison && bs.yearOverYearChange !== undefined && bs.yearOverYearChange !== null) {
      kpis.push({
        label: 'vs. Vorjahr',
        value: `${bs.yearOverYearChange >= 0 ? '+' : ''}${bs.yearOverYearChange}%`,
        sub: `Vorjahr: ${bs.previousYearTotal} Buchungen`,
      })
    }

    y = drawKPIBoxes(page, font, fontBold, kpis, y)
    y -= 15

    // Monatstabelle
    const showPrev = options.showComparison && bs.data.some(d => (d.previousCount ?? 0) > 0)

    const cols = showPrev
      ? [
          { header: 'Zeitraum', width: 140, align: 'left' as const },
          { header: 'Buchungen', width: 80, align: 'right' as const },
          { header: 'Vorjahr', width: 80, align: 'right' as const },
          { header: 'Veränderung', width: 90, align: 'right' as const },
        ]
      : [
          { header: 'Zeitraum', width: 200, align: 'left' as const },
          { header: 'Buchungen', width: 100, align: 'right' as const },
        ]

    const tableWidth = cols.reduce((s, c) => s + c.width, 0)
    const tableX = MARGIN + (PAGE_W - 2 * MARGIN - tableWidth) / 2 // Zentriert

    y = drawTableHeader(page, fontBold, cols, tableX, y)

    const rowH = 16
    bs.data.forEach((item, idx) => {
      if (y - rowH < 60) return

      if (idx % 2 === 0) {
        page.drawRectangle({ x: tableX, y: y - rowH, width: tableWidth, height: rowH, color: ROW_ALT })
      }

      const row = showPrev
        ? [
            item.displayLabel,
            String(item.count),
            String(item.previousCount ?? '-'),
            item.changePercent !== null && item.changePercent !== undefined
              ? `${item.changePercent >= 0 ? '+' : ''}${item.changePercent}%`
              : '-',
          ]
        : [item.displayLabel, String(item.count)]

      row.forEach((text, i) => {
        const color = showPrev && i === 3 && item.changePercent !== null && item.changePercent !== undefined
          ? (item.changePercent >= 0 ? GREEN : RED)
          : BLACK
        drawCell(page, text, tableX + colOffset(cols, i), y, cols[i].width, rowH, font, 8, color, cols[i].align)
      })

      y -= rowH
    })

    // Summen
    y -= 2
    page.drawRectangle({ x: tableX, y: y - rowH, width: tableWidth, height: rowH, color: LIGHT })
    drawCell(page, 'Gesamt', tableX, y, cols[0].width, rowH, fontBold, 8.5, BLACK, 'left')
    drawCell(page, String(bs.totalBookings), tableX + colOffset(cols, 1), y, cols[1].width, rowH, fontBold, 8.5, BLACK, 'right')
    if (showPrev && bs.previousYearTotal !== undefined) {
      drawCell(page, String(bs.previousYearTotal), tableX + colOffset(cols, 2), y, cols[2].width, rowH, fontBold, 8.5, BLACK, 'right')
    }

    drawFooter(page, font, fontBold)
  }

  // ─── Seite 2: Ticketstatistik ───
  if (options.includeTickets && options.ticketStats) {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H])
    const ts = options.ticketStats
    let y = PAGE_H - MARGIN

    // Header
    y = drawPageHeader(page, font, fontBold, logoImage, 'Ticketstatistik', options.rangeLabel, y)

    // KPIs
    const kpis = [
      { label: 'Gesamt', value: String(ts.totalTickets), sub: 'Tickets (ohne Spam)' },
      { label: 'Offen', value: String(ts.openTickets), sub: 'Aktuell offen' },
      { label: 'Ø Antwortzeit', value: ts.avgResponseTime !== null ? `${ts.avgResponseTime.toFixed(1)}h` : '-', sub: 'Bis erste Antwort' },
      { label: 'Ø Lösungszeit', value: ts.avgResolutionTime !== null ? `${ts.avgResolutionTime.toFixed(1)}h` : '-', sub: 'Bis Lösung' },
    ]

    y = drawKPIBoxes(page, font, fontBold, kpis, y)
    y -= 15

    // Status-Verteilung
    if (ts.statusDistribution.length > 0) {
      page.drawText('Status-Verteilung', { x: MARGIN, y, size: 11, font: fontBold, color: DARK })
      y -= 18

      const statusLabels: Record<string, string> = {
        open: 'Offen', in_progress: 'In Bearbeitung', pending: 'Wartend',
        resolved: 'Gelöst', closed: 'Geschlossen',
      }

      const sCols = [
        { header: 'Status', width: 160, align: 'left' as const },
        { header: 'Anzahl', width: 80, align: 'right' as const },
        { header: 'Anteil', width: 80, align: 'right' as const },
      ]

      y = drawTableHeader(page, fontBold, sCols, MARGIN, y)

      const sRowH = 16
      ts.statusDistribution.forEach((s, idx) => {
        if (y - sRowH < 60) return
        if (idx % 2 === 0) page.drawRectangle({ x: MARGIN, y: y - sRowH, width: 320, height: sRowH, color: ROW_ALT })
        drawCell(page, statusLabels[s.status] || s.status, MARGIN, y, 160, sRowH, font, 8, BLACK, 'left')
        drawCell(page, String(s.count), MARGIN + 160, y, 80, sRowH, font, 8, BLACK, 'right')
        drawCell(page, `${s.percentage.toFixed(1)}%`, MARGIN + 240, y, 80, sRowH, font, 8, BLACK, 'right')
        y -= sRowH
      })

      y -= 20
    }

    // Prioritäts-Verteilung
    if (ts.priorityDistribution.length > 0) {
      page.drawText('Prioritäts-Verteilung', { x: MARGIN, y, size: 11, font: fontBold, color: DARK })
      y -= 18

      const prioLabels: Record<string, string> = {
        low: 'Niedrig', medium: 'Mittel', high: 'Hoch', urgent: 'Dringend',
      }

      const pCols = [
        { header: 'Priorität', width: 160, align: 'left' as const },
        { header: 'Anzahl', width: 80, align: 'right' as const },
        { header: 'Anteil', width: 80, align: 'right' as const },
      ]

      y = drawTableHeader(page, fontBold, pCols, MARGIN, y)

      const pRowH = 16
      ts.priorityDistribution.forEach((p, idx) => {
        if (y - pRowH < 60) return
        if (idx % 2 === 0) page.drawRectangle({ x: MARGIN, y: y - pRowH, width: 320, height: pRowH, color: ROW_ALT })
        drawCell(page, prioLabels[p.priority] || p.priority, MARGIN, y, 160, pRowH, font, 8, BLACK, 'left')
        drawCell(page, String(p.count), MARGIN + 160, y, 80, pRowH, font, 8, BLACK, 'right')
        drawCell(page, `${p.percentage.toFixed(1)}%`, MARGIN + 240, y, 80, pRowH, font, 8, BLACK, 'right')
        y -= pRowH
      })

      y -= 20
    }

    // Wochentags-Verteilung (rechte Spalte oder darunter)
    if (ts.weekdayDistribution.length > 0 && y > 120) {
      page.drawText('Wochentags-Verteilung', { x: MARGIN, y, size: 11, font: fontBold, color: DARK })
      y -= 18

      const wCols = [
        { header: 'Tag', width: 120, align: 'left' as const },
        { header: 'Tickets', width: 80, align: 'right' as const },
      ]

      y = drawTableHeader(page, fontBold, wCols, MARGIN, y)

      const wRowH = 16
      ts.weekdayDistribution.forEach((w, idx) => {
        if (y - wRowH < 60) return
        if (idx % 2 === 0) page.drawRectangle({ x: MARGIN, y: y - wRowH, width: 200, height: wRowH, color: ROW_ALT })
        drawCell(page, w.weekday, MARGIN, y, 120, wRowH, font, 8, BLACK, 'left')
        drawCell(page, String(w.count), MARGIN + 120, y, 80, wRowH, font, 8, BLACK, 'right')
        y -= wRowH
      })
    }

    drawFooter(page, font, fontBold)
  }

  return await pdfDoc.save()
}

// ─── Shared Drawing Helpers ───

function drawPageHeader(
  page: PDFPage, font: PDFFont, fontBold: PDFFont,
  logoImage: any, title: string, subtitle: string, y: number
): number {
  // Logo
  if (logoImage) {
    const ratio = logoImage.width / logoImage.height
    const logoH = 22
    page.drawImage(logoImage, { x: MARGIN, y: y - logoH, width: logoH * ratio, height: logoH })
  }

  y -= 45
  page.drawText(title, { x: MARGIN, y, size: 20, font: fontBold, color: DARK })
  y -= 18
  page.drawText(subtitle, { x: MARGIN, y, size: 11, font, color: GRAY })
  y -= 10

  // Gelber Akzentstreifen
  page.drawRectangle({ x: MARGIN, y, width: PAGE_W - 2 * MARGIN, height: 2, color: YELLOW })
  y -= 20

  return y
}

function drawKPIBoxes(
  page: PDFPage, font: PDFFont, fontBold: PDFFont,
  kpis: { label: string; value: string; sub: string }[],
  y: number
): number {
  const boxW = (PAGE_W - 2 * MARGIN - (kpis.length - 1) * 10) / kpis.length
  const boxH = 50

  kpis.forEach((kpi, i) => {
    const x = MARGIN + i * (boxW + 10)

    // Box background
    page.drawRectangle({ x, y: y - boxH, width: boxW, height: boxH, color: LIGHT, borderColor: rgb(0.88, 0.88, 0.88), borderWidth: 0.5 })

    // Label
    page.drawText(kpi.label, { x: x + 10, y: y - 15, size: 7.5, font, color: GRAY })

    // Value
    const isChange = kpi.value.includes('%')
    const valueColor = isChange ? (kpi.value.startsWith('+') ? GREEN : kpi.value.startsWith('-') ? RED : DARK) : DARK
    page.drawText(kpi.value, { x: x + 10, y: y - 32, size: 14, font: fontBold, color: valueColor })

    // Sub
    page.drawText(kpi.sub, { x: x + 10, y: y - 44, size: 6.5, font, color: GRAY })
  })

  return y - boxH - 10
}

function drawTableHeader(
  page: PDFPage, fontBold: PDFFont,
  cols: { header: string; width: number; align: string }[],
  tableX: number, y: number
): number {
  const tableWidth = cols.reduce((s, c) => s + c.width, 0)
  const rowH = 18

  page.drawRectangle({ x: tableX, y: y - rowH, width: tableWidth, height: rowH, color: DARK })

  let cx = tableX
  cols.forEach(col => {
    drawCell(page, col.header, cx, y, col.width, rowH, fontBold, 7.5, WHITE, col.align as any)
    cx += col.width
  })

  return y - rowH
}

function drawFooter(page: PDFPage, font: PDFFont, fontBold: PDFFont) {
  const now = new Date()
  const exportStr = `Exportiert am ${now.toLocaleDateString('de-DE')} um ${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`

  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 35, color: DARK })
  page.drawText(exportStr, { x: MARGIN, y: 14, size: 7, font, color: rgb(0.7, 0.7, 0.7) })
  page.drawText('FLIGHTHOUR — Vertraulich', {
    x: PAGE_W - MARGIN - fontBold.widthOfTextAtSize('FLIGHTHOUR — Vertraulich', 7),
    y: 14, size: 7, font: fontBold, color: YELLOW,
  })
}

function drawCell(
  page: PDFPage, text: string, x: number, y: number,
  width: number, height: number, font: PDFFont,
  size: number, color: any, align: 'left' | 'right' | 'center'
) {
  const textWidth = font.widthOfTextAtSize(text, size)
  let tx = x + 6
  if (align === 'right') tx = x + width - textWidth - 6
  if (align === 'center') tx = x + (width - textWidth) / 2
  page.drawText(text, { x: tx, y: y - height + 5, size, font, color })
}

function colOffset(cols: { width: number }[], index: number): number {
  return cols.slice(0, index).reduce((s, c) => s + c.width, 0)
}
