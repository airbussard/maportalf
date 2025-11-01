/**
 * Time Report PDF Generator
 * Shared PDF generation logic with logo
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import type { MonthlyReportData } from '@/lib/types/time-tracking'

export async function generateTimeReportPdf(reportData: MonthlyReportData): Promise<Uint8Array> {
  // Create PDF document (A4 landscape)
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([842, 595]) // A4 landscape

  // Embed fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const { width, height } = page.getSize()

  // Colors
  const black = rgb(0, 0, 0)
  const gray = rgb(0.4, 0.4, 0.4)
  const lightGray = rgb(0.94, 0.94, 0.94)
  const veryLightGray = rgb(0.98, 0.98, 0.98)

  // ===== LOGO EINBAUEN =====
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png')
    const logoBytes = fs.readFileSync(logoPath)
    const logoImage = await pdfDoc.embedPng(logoBytes)

    // Calculate logo dimensions (keep aspect ratio, 40% smaller)
    const logoAspectRatio = logoImage.width / logoImage.height
    const logoHeight = 24
    const logoWidth = logoHeight * logoAspectRatio

    // Draw logo (top left)
    page.drawImage(logoImage, {
      x: 50,
      y: height - 70,
      width: logoWidth,
      height: logoHeight,
    })
  } catch (error) {
    console.error('[PDF] Failed to embed logo:', error)
    // Continue without logo
  }

  // Header (shifted right to make room for logo)
  page.drawText(`Zeiterfassung - ${reportData.month_name} ${reportData.year}`, {
    x: 250,
    y: height - 50,
    size: 24,
    font: helveticaBoldFont,
    color: black,
  })

  page.drawText('Abrechnungsübersicht', {
    x: 250,
    y: height - 75,
    size: 16,
    font: helveticaFont,
    color: gray,
  })

  // Table
  const tableTop = height - 120
  const rowHeight = 20
  const colWidths = [40, 150, 60, 60, 70, 90, 60, 80, 100]
  const colStarts = [50]
  for (let i = 0; i < colWidths.length - 1; i++) {
    colStarts.push(colStarts[i] + colWidths[i])
  }

  // Header row background
  page.drawRectangle({
    x: 50,
    y: tableTop - rowHeight,
    width: width - 100,
    height: rowHeight,
    color: lightGray,
  })

  // Header text
  const headers = ['Pers. Nr.', 'Name', 'Arbeitstage', 'Stunden', 'Gehalt p.H.', 'Zwischengeh.', 'Bew.', 'Provision', 'Gesamtgehalt']
  headers.forEach((header, i) => {
    const x = colStarts[i] + 5
    const align = i === 0 ? 'right' : i === 1 ? 'left' : 'right'
    const textWidth = helveticaBoldFont.widthOfTextAtSize(header, 9)
    const xPos = align === 'right' ? colStarts[i] + colWidths[i] - textWidth - 5 : x

    page.drawText(header, {
      x: xPos,
      y: tableTop - 14,
      size: 9,
      font: helveticaBoldFont,
      color: black,
    })
  })

  // Data rows
  let currentY = tableTop - rowHeight
  reportData.employees.forEach((emp, index) => {
    currentY -= rowHeight

    // Alternating row background
    if (index % 2 === 0) {
      page.drawRectangle({
        x: 50,
        y: currentY,
        width: width - 100,
        height: rowHeight,
        color: veryLightGray,
      })
    }

    // Row data
    const rowData = [
      String(index + 1),
      emp.employee_name.substring(0, 23),
      String(emp.work_days),
      emp.total_hours.toFixed(2),
      `${emp.hourly_rate.toFixed(2)} €`,
      `${emp.interim_salary.toFixed(2)} €`,
      String(emp.evaluation_count),
      `${emp.provision.toFixed(2)} €`,
      `${emp.total_salary.toFixed(2)} €`,
    ]

    rowData.forEach((text, i) => {
      const align = i === 1 ? 'left' : 'right'
      const font = helveticaFont
      const textWidth = font.widthOfTextAtSize(text, 9)
      const xPos = align === 'right'
        ? colStarts[i] + colWidths[i] - textWidth - 5
        : colStarts[i] + 5

      page.drawText(text, {
        x: xPos,
        y: currentY + 6,
        size: 9,
        font: font,
        color: black,
      })
    })
  })

  // Totals row
  currentY -= rowHeight
  page.drawRectangle({
    x: 50,
    y: currentY,
    width: width - 100,
    height: rowHeight,
    color: veryLightGray,
  })

  const totalsData = [
    '',
    'Gesamt',
    String(reportData.totals.total_days),
    reportData.totals.total_hours.toFixed(2),
    '',
    `${reportData.totals.total_interim.toFixed(2)} €`,
    String(reportData.totals.total_evaluations),
    `${reportData.totals.total_provision.toFixed(2)} €`,
    `${reportData.totals.total_salary.toFixed(2)} €`,
  ]

  totalsData.forEach((text, i) => {
    if (!text) return
    const align = i === 1 ? 'left' : 'right'
    const font = helveticaBoldFont
    const textWidth = font.widthOfTextAtSize(text, 9)
    const xPos = align === 'right'
      ? colStarts[i] + colWidths[i] - textWidth - 5
      : colStarts[i] + 5

    page.drawText(text, {
      x: xPos,
      y: currentY + 6,
      size: 9,
      font: font,
      color: black,
    })
  })

  // Footer
  const now = new Date()
  const dateStr = now.toLocaleDateString('de-DE')
  const timeStr = now.toLocaleTimeString('de-DE')

  page.drawText(`Exportiert am: ${dateStr} ${timeStr}`, {
    x: width / 2 - 80,
    y: 40,
    size: 8,
    font: helveticaFont,
    color: gray,
  })

  page.drawText('FLIGHTHOUR - Vertrauliche Informationen', {
    x: width / 2 - 100,
    y: 25,
    size: 8,
    font: helveticaFont,
    color: gray,
  })

  // Save and return PDF bytes
  return await pdfDoc.save()
}
