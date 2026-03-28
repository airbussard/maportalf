/**
 * Timesheet PDF Report Generator
 * Kalenderbasierte Abrechnungsübersicht
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import type { TimesheetAdminOverview, TimesheetMonthSummary } from '@/lib/types/timesheet'

const BRAND_YELLOW = rgb(251 / 255, 185 / 255, 40 / 255) // #fbb928
const BLACK = rgb(0, 0, 0)
const DARK_GRAY = rgb(0.25, 0.25, 0.25)
const GRAY = rgb(0.5, 0.5, 0.5)
const LIGHT_GRAY = rgb(0.94, 0.94, 0.94)
const ROW_ALT = rgb(0.97, 0.97, 0.97)
const WHITE = rgb(1, 1, 1)
const ORANGE = rgb(0.9, 0.6, 0.1)
const MARGIN = 40

export async function generateTimesheetPdf(data: TimesheetAdminOverview): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([842, 595]) // A4 Querformat
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const { width, height } = page.getSize()

  // ─── Logo ───
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png')
    const logoBytes = fs.readFileSync(logoPath)
    const logoImage = await pdfDoc.embedPng(logoBytes)
    const ratio = logoImage.width / logoImage.height
    const logoH = 22
    page.drawImage(logoImage, { x: MARGIN, y: height - MARGIN - logoH, width: logoH * ratio, height: logoH })
  } catch (e) {
    // Continue without logo
  }

  // ─── Header ───
  page.drawText(`Abrechnungsübersicht`, {
    x: MARGIN, y: height - MARGIN - 50, size: 20, font: fontBold, color: DARK_GRAY,
  })
  page.drawText(`${data.month_name} ${data.year}`, {
    x: MARGIN, y: height - MARGIN - 68, size: 14, font, color: GRAY,
  })

  // Gelber Akzentstreifen
  page.drawRectangle({ x: MARGIN, y: height - MARGIN - 78, width: width - 2 * MARGIN, height: 2, color: BRAND_YELLOW })

  // ─── Tabelle ───
  const cols = [
    { header: 'MA-Nr.', width: 50, align: 'left' as const },
    { header: 'Name', width: 140, align: 'left' as const },
    { header: 'Tage', width: 40, align: 'right' as const },
    { header: 'Stunden', width: 55, align: 'right' as const },
    { header: 'EUR/Std.', width: 55, align: 'right' as const },
    { header: 'Stundengeh.', width: 75, align: 'right' as const },
    { header: 'Fixgehalt', width: 75, align: 'right' as const },
    { header: 'Gesamt', width: 85, align: 'right' as const },
    { header: 'Status', width: 55, align: 'center' as const },
    { header: 'Bestätigt', width: 55, align: 'center' as const },
  ]

  const tableWidth = cols.reduce((s, c) => s + c.width, 0)
  const tableX = MARGIN
  const rowH = 18
  let y = height - MARGIN - 100

  // Spalten-Positionen berechnen
  const colX: number[] = []
  let cx = tableX
  for (const col of cols) {
    colX.push(cx)
    cx += col.width
  }

  // Header-Zeile
  page.drawRectangle({ x: tableX, y: y - rowH, width: tableWidth, height: rowH, color: DARK_GRAY })
  cols.forEach((col, i) => {
    drawCell(page, col.header, colX[i], y, col.width, rowH, fontBold, 7.5, WHITE, col.align)
  })
  y -= rowH

  // Daten-Zeilen (mit Daten ODER Gesamtgehalt > 0 für Fixgehälter)
  const activeEmployees = data.employees.filter(e =>
    e.total_effective_minutes > 0 || e.total_pay > 0 || e.is_confirmed || e.is_closed
  )

  activeEmployees.forEach((emp, idx) => {
    if (y - rowH < 60) return // Seitenende

    // Hintergrund
    if (idx % 2 === 0) {
      page.drawRectangle({ x: tableX, y: y - rowH, width: tableWidth, height: rowH, color: ROW_ALT })
    }

    const rateDisplay = emp.hourly_rate
      ? `${emp.hourly_rate.toFixed(2)} EUR`
      : '20 EUR *'

    const statusText = emp.is_closed ? 'Geschl.' : emp.is_confirmed ? 'Best.' : 'Offen'
    const confirmedText = emp.is_confirmed ? 'Ja' : '-'

    const row = [
      emp.employee_number || '-',
      emp.employee_name.substring(0, 20),
      String(emp.work_days),
      fmtHHMM(emp.total_effective_minutes),
      rateDisplay,
      formatEUR(emp.hourly_pay),
      emp.fixed_pay > 0 ? formatEUR(emp.fixed_pay) : '-',
      formatEUR(emp.total_pay),
      statusText,
      confirmedText,
    ]

    row.forEach((text, i) => {
      const color = (i === 4 && !emp.hourly_rate) ? ORANGE : BLACK
      drawCell(page, text, colX[i], y, cols[i].width, rowH, font, 7.5, color, cols[i].align)
    })

    y -= rowH
  })

  // ─── Summen-Zeile ───
  y -= 2
  page.drawRectangle({ x: tableX, y: y - rowH, width: tableWidth, height: rowH, color: LIGHT_GRAY })

  const totals = [
    '', 'Gesamt',
    String(data.totals.total_days),
    fmtHHMM(Math.round(data.totals.total_hours * 60)),
    '',
    formatEUR(data.totals.total_hourly_pay),
    formatEUR(data.totals.total_fixed_pay),
    formatEUR(data.totals.total_pay),
    '', '',
  ]
  totals.forEach((text, i) => {
    if (!text) return
    drawCell(page, text, colX[i], y, cols[i].width, rowH, fontBold, 8, BLACK, cols[i].align)
  })

  // ─── Hinweis Fallback ───
  const hasFallback = activeEmployees.some(e => e.hourly_rate_fallback)
  if (hasFallback) {
    page.drawText('* Kein Stundenlohn hinterlegt — Fallback: 20,00 €/Std.', {
      x: MARGIN, y: y - rowH - 18, size: 7, font, color: ORANGE,
    })
  }

  // ─── Footer ───
  const now = new Date()
  const exportStr = `Exportiert am ${now.toLocaleDateString('de-DE')} um ${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`

  page.drawRectangle({ x: 0, y: 0, width, height: 35, color: DARK_GRAY })

  page.drawText(exportStr, { x: MARGIN, y: 14, size: 7, font, color: rgb(0.7, 0.7, 0.7) })
  page.drawText('FLIGHTHOUR — Vertraulich', {
    x: width - MARGIN - fontBold.widthOfTextAtSize('FLIGHTHOUR — Vertraulich', 7),
    y: 14, size: 7, font: fontBold, color: BRAND_YELLOW,
  })

  return await pdfDoc.save()
}

// ─── Helpers ───

function drawCell(
  page: any, text: string, x: number, y: number,
  width: number, height: number,
  font: any, size: number, color: any, align: 'left' | 'right' | 'center'
) {
  const textWidth = font.widthOfTextAtSize(text, size)
  let tx = x + 4
  if (align === 'right') tx = x + width - textWidth - 4
  if (align === 'center') tx = x + (width - textWidth) / 2

  page.drawText(text, { x: tx, y: y - height + 5, size, font, color })
}

function fmtHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatEUR(amount: number): string {
  if (amount === 0) return '0,00 €'
  return amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
