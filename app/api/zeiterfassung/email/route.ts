import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateReportData, saveRecipient } from '@/app/actions/time-reports'
import { generateTimeReportPdf } from '@/lib/pdf/time-report-generator'

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

    // Generate PDF with logo
    const pdfBuffer = await generateTimeReportPdf(reportData)
    const filename = `zeiterfassung_${year}_${String(month).padStart(2, '0')}.pdf`

    // Upload PDF to Supabase Storage
    const adminSupabase = createAdminClient()
    const storagePath = `time-reports/${year}_${month}_${Date.now()}.pdf`

    const { error: uploadError } = await adminSupabase.storage
      .from('time-reports')
      .upload(storagePath, Buffer.from(pdfBuffer), {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('[Time Report] Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload PDF to storage' },
        { status: 500 }
      )
    }

    console.log('[Time Report] PDF uploaded to storage:', storagePath)

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

    // Queue emails instead of sending directly
    const failedRecipients: string[] = []
    let successCount = 0

    for (const recipient of validRecipients) {
      try {
        const { error: queueError } = await adminSupabase
          .from('email_queue')
          .insert({
            type: 'time_report',
            recipient_email: recipient,
            subject: subject,
            content: fullBody,
            attachment_storage_path: storagePath,
            attachment_filename: filename,
            status: 'pending',
            attempts: 0
          })

        if (queueError) {
          throw new Error(queueError.message)
        }

        successCount++
        console.log('[Time Report] Email queued for:', recipient)
      } catch (error: any) {
        console.error(`[Time Report] Failed to queue email for ${recipient}:`, error)
        failedRecipients.push(recipient)
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
        message: `E-Mail erfolgreich für ${successCount} Empfänger in die Warteschlange gestellt`,
      })
    } else {
      // Partial success
      const message = successCount > 0
        ? `E-Mail für ${successCount} Empfänger in Warteschlange. Fehler bei: ${failedRecipients.join(', ')}`
        : `E-Mail konnte nicht in Warteschlange gestellt werden. Fehler bei: ${failedRecipients.join(', ')}`

      return NextResponse.json({
        success: successCount > 0,
        partial: successCount > 0,
        message,
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
