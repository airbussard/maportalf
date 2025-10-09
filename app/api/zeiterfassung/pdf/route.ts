import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateReportData } from '@/app/actions/time-reports'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const employeeId = searchParams.get('employee') || 'all'

    // Generate report data
    const reportResult = await generateReportData(year, month, employeeId)

    if (!reportResult.success || !reportResult.data) {
      return NextResponse.json(
        { error: reportResult.error || 'Failed to generate report' },
        { status: 500 }
      )
    }

    const reportData = reportResult.data

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

    // Header
    page.drawText(`Zeiterfassung - ${reportData.month_name} ${reportData.year}`, {
      x: width / 2 - 150,
      y: height - 50,
      size: 24,
      font: helveticaBoldFont,
      color: black,
    })

    page.drawText('Abrechnungsübersicht', {
      x: width / 2 - 80,
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

    // Save PDF
    const pdfBytes = await pdfDoc.save()
    const filename = `zeiterfassung_${year}_${String(month).padStart(2, '0')}.pdf`

    // Convert Uint8Array to Buffer for NextResponse
    const buffer = Buffer.from(pdfBytes)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
