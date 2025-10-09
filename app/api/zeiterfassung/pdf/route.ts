import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateReportData } from '@/app/actions/time-reports'
import PDFDocument from 'pdfkit'

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

    // Create PDF
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    })

    // Collect PDF chunks
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))

    // Header
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(`Zeiterfassung - ${reportData.month_name} ${reportData.year}`, {
        align: 'center'
      })

    doc.moveDown(0.5)

    doc
      .fontSize(16)
      .font('Helvetica')
      .fillColor('#666')
      .text('Abrechnungsübersicht', { align: 'center' })

    doc.moveDown(2)

    // Table setup
    const tableTop = doc.y
    const columnWidths = {
      nr: 40,
      name: 150,
      days: 60,
      hours: 60,
      rate: 70,
      interim: 90,
      eval: 60,
      prov: 80,
      total: 100
    }

    let x = 50
    const y = tableTop

    // Table header
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#000')

    // Header background
    doc
      .rect(50, y, 842 - 100, 20)
      .fillAndStroke('#f0f0f0', '#ddd')

    doc.fillColor('#000')

    // Header text
    doc.text('Pers. Nr.', x + 5, y + 6, { width: columnWidths.nr, align: 'right' })
    x += columnWidths.nr
    doc.text('Name', x + 5, y + 6, { width: columnWidths.name })
    x += columnWidths.name
    doc.text('Arbeitstage', x + 5, y + 6, { width: columnWidths.days, align: 'right' })
    x += columnWidths.days
    doc.text('Stunden', x + 5, y + 6, { width: columnWidths.hours, align: 'right' })
    x += columnWidths.hours
    doc.text('Gehalt p.H.', x + 5, y + 6, { width: columnWidths.rate, align: 'right' })
    x += columnWidths.rate
    doc.text('Zwischengeh.', x + 5, y + 6, { width: columnWidths.interim, align: 'right' })
    x += columnWidths.interim
    doc.text('Bew.', x + 5, y + 6, { width: columnWidths.eval, align: 'right' })
    x += columnWidths.eval
    doc.text('Provision', x + 5, y + 6, { width: columnWidths.prov, align: 'right' })
    x += columnWidths.prov
    doc.text('Gesamtgehalt', x + 5, y + 6, { width: columnWidths.total, align: 'right' })

    doc.moveDown(1.5)

    // Table rows
    doc.fontSize(9).font('Helvetica')

    reportData.employees.forEach((emp, index) => {
      const rowY = doc.y
      x = 50

      // Row background (alternating)
      if (index % 2 === 0) {
        doc.rect(50, rowY, 842 - 100, 20).fill('#fafafa')
      }

      doc.fillColor('#000')

      // Row data
      doc.text(String(index + 1), x + 5, rowY + 6, { width: columnWidths.nr, align: 'right' })
      x += columnWidths.nr
      doc.text(emp.employee_name, x + 5, rowY + 6, { width: columnWidths.name })
      x += columnWidths.name
      doc.text(String(emp.work_days), x + 5, rowY + 6, { width: columnWidths.days, align: 'right' })
      x += columnWidths.days
      doc.text(emp.total_hours.toFixed(2), x + 5, rowY + 6, { width: columnWidths.hours, align: 'right' })
      x += columnWidths.hours
      doc.text(`${emp.hourly_rate.toFixed(2)} €`, x + 5, rowY + 6, { width: columnWidths.rate, align: 'right' })
      x += columnWidths.rate
      doc.text(`${emp.interim_salary.toFixed(2)} €`, x + 5, rowY + 6, { width: columnWidths.interim, align: 'right' })
      x += columnWidths.interim
      doc.text(String(emp.evaluation_count), x + 5, rowY + 6, { width: columnWidths.eval, align: 'right' })
      x += columnWidths.eval
      doc.text(`${emp.provision.toFixed(2)} €`, x + 5, rowY + 6, { width: columnWidths.prov, align: 'right' })
      x += columnWidths.prov
      doc.text(`${emp.total_salary.toFixed(2)} €`, x + 5, rowY + 6, { width: columnWidths.total, align: 'right' })

      doc.moveDown(1.5)
    })

    // Totals row
    const totalsY = doc.y
    x = 50

    // Totals background
    doc.rect(50, totalsY, 842 - 100, 20).fillAndStroke('#f9f9f9', '#ddd')

    doc.fillColor('#000').font('Helvetica-Bold')

    x += columnWidths.nr
    doc.text('Gesamt', x + 5, totalsY + 6, { width: columnWidths.name })
    x += columnWidths.name
    doc.text(String(reportData.totals.total_days), x + 5, totalsY + 6, { width: columnWidths.days, align: 'right' })
    x += columnWidths.days
    doc.text(reportData.totals.total_hours.toFixed(2), x + 5, totalsY + 6, { width: columnWidths.hours, align: 'right' })
    x += columnWidths.hours
    x += columnWidths.rate // skip rate column
    doc.text(`${reportData.totals.total_interim.toFixed(2)} €`, x + 5, totalsY + 6, { width: columnWidths.interim, align: 'right' })
    x += columnWidths.interim
    doc.text(String(reportData.totals.total_evaluations), x + 5, totalsY + 6, { width: columnWidths.eval, align: 'right' })
    x += columnWidths.eval
    doc.text(`${reportData.totals.total_provision.toFixed(2)} €`, x + 5, totalsY + 6, { width: columnWidths.prov, align: 'right' })
    x += columnWidths.prov
    doc.text(`${reportData.totals.total_salary.toFixed(2)} €`, x + 5, totalsY + 6, { width: columnWidths.total, align: 'right' })

    // Footer
    doc.moveDown(3)
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#666')
      .text(`Exportiert am: ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE')}`, { align: 'center' })
    doc.text('FLIGHTHOUR - Vertrauliche Informationen', { align: 'center' })

    // Finalize PDF
    doc.end()

    // Wait for PDF to finish
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks))
      })
    })

    // Return PDF
    const filename = `zeiterfassung_${year}_${String(month).padStart(2, '0')}.pdf`

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(pdfBuffer)

    return new NextResponse(uint8Array, {
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
