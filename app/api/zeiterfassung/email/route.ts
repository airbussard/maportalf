import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateReportData, saveRecipient } from '@/app/actions/time-reports'
import nodemailer from 'nodemailer'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export async function POST(request: NextRequest) {
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
      .select('role, first_name, last_name, email')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { year, month, employee, recipients, subject, body: emailBody, save_recipients } = body

    // Validate inputs
    if (!year || !month || !recipients || !subject || !emailBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Filter valid email addresses
    const validRecipients = recipients.filter((email: string) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    })

    if (validRecipients.length === 0) {
      return NextResponse.json({ error: 'No valid email addresses' }, { status: 400 })
    }

    // Generate report data
    const reportResult = await generateReportData(year, month, employee || 'all')

    if (!reportResult.success || !reportResult.data) {
      return NextResponse.json(
        { error: reportResult.error || 'Failed to generate report' },
        { status: 500 }
      )
    }

    const reportData = reportResult.data

    // Generate PDF
    const pdfBuffer = await generatePdfBuffer(reportData)

    // Get email settings from database
    const adminSupabase = createAdminClient()
    const { data: emailSettings } = await adminSupabase
      .from('email_settings')
      .select('*')
      .eq('is_active', true)
      .single()

    if (!emailSettings) {
      return NextResponse.json(
        { error: 'Email settings not configured' },
        { status: 500 }
      )
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailSettings.smtp_host,
      port: emailSettings.smtp_port,
      secure: emailSettings.smtp_port === 465,
      auth: {
        user: emailSettings.smtp_username,
        pass: emailSettings.smtp_password,
      },
    })

    // Prepare signature
    const senderName = profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.email

    const signature = `

--
Mit freundlichen Grüßen
${senderName}
FLIGHTHOUR`

    const fullBody = emailBody + signature

    // Send emails
    const failedRecipients: string[] = []
    const errorDetails: Record<string, string> = {}
    let successCount = 0

    const filename = `zeiterfassung_${year}_${String(month).padStart(2, '0')}.pdf`

    for (const recipient of validRecipients) {
      try {
        await transporter.sendMail({
          from: `FLIGHTHOUR <${emailSettings.smtp_username}>`,
          replyTo: profile.email,
          to: recipient,
          subject: subject,
          text: fullBody,
          attachments: [
            {
              filename: filename,
              content: Buffer.from(pdfBuffer),
              contentType: 'application/pdf',
            },
          ],
        })
        successCount++
      } catch (error: any) {
        console.error(`Failed to send email to ${recipient}:`, error)
        failedRecipients.push(recipient)
        errorDetails[recipient] = error.message || 'Unknown error'
      }
    }

    // Save recipients if requested
    if (save_recipients) {
      for (const email of validRecipients) {
        try {
          await saveRecipient(email)
        } catch (error) {
          console.error(`Failed to save recipient ${email}:`, error)
        }
      }
    }

    // Return response
    if (failedRecipients.length === 0) {
      return NextResponse.json({
        success: true,
        message: `E-Mail erfolgreich an ${successCount} Empfänger versendet`,
      })
    } else {
      // Partial success
      const message = successCount > 0
        ? `E-Mail erfolgreich an ${successCount} Empfänger versendet. Fehler bei: ${failedRecipients.join(', ')}`
        : `E-Mail konnte nicht versendet werden. Fehler bei: ${failedRecipients.join(', ')}`

      return NextResponse.json({
        success: successCount > 0,
        partial: successCount > 0,
        message,
        error_details: errorDetails,
        sent_count: successCount,
        failed_count: failedRecipients.length,
      })
    }
  } catch (error: any) {
    console.error('Email send error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to generate PDF buffer
async function generatePdfBuffer(reportData: any): Promise<Uint8Array> {
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
  reportData.employees.forEach((emp: any, index: number) => {
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
