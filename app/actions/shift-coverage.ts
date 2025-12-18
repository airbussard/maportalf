'use server'

/**
 * Shift Coverage Request Server Actions
 *
 * Ermöglicht Managern/Admins, Mitarbeiter für unbesetzte Tage anzufragen.
 * First-come-first-served Prinzip mit Token-basierter Annahme.
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import {
  ShiftCoverageRequest,
  ShiftCoverageRequestWithRelations,
  ShiftCoverageNotificationWithEmployee,
  CreateShiftCoverageInput,
  TokenValidationResult,
  AcceptCoverageResult,
  getEmployeeName
} from '@/lib/types/shift-coverage'
import { generateShiftCoverageEmail } from '@/lib/email-templates/shift-coverage-request'
import { generateShiftCoverageSMS } from '@/lib/sms/templates'
import { normalizePhoneNumber, isValidPhoneNumber } from '@/lib/sms/twilio-client'

// ============================================================================
// Manager/Admin Actions
// ============================================================================

/**
 * Erstellt eine neue Shift Coverage Anfrage und sendet Benachrichtigungen
 */
export async function createShiftCoverageRequest(
  input: CreateShiftCoverageInput
): Promise<{ success: boolean; error?: string; requestId?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Check if user is manager or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'manager' && profile?.role !== 'admin') {
      return { success: false, error: 'Keine Berechtigung' }
    }

    // Validate input
    if (!input.request_date) {
      return { success: false, error: 'Datum ist erforderlich' }
    }
    if (!input.employee_ids || input.employee_ids.length === 0) {
      return { success: false, error: 'Mindestens ein Mitarbeiter muss ausgewählt werden' }
    }
    if (!input.send_email && !input.send_sms) {
      return { success: false, error: 'Mindestens eine Benachrichtigungsart muss ausgewählt werden' }
    }

    const adminSupabase = createAdminClient()

    // Create the coverage request
    const { data: coverageRequest, error: insertError } = await adminSupabase
      .from('shift_coverage_requests')
      .insert({
        request_date: input.request_date,
        is_full_day: input.is_full_day,
        start_time: !input.is_full_day && input.start_time ? `${input.start_time}:00` : null,
        end_time: !input.is_full_day && input.end_time ? `${input.end_time}:00` : null,
        reason: input.reason || null,
        status: 'open',
        created_by: user.id
      })
      .select()
      .single()

    if (insertError || !coverageRequest) {
      console.error('Error creating coverage request:', insertError)
      return { success: false, error: 'Fehler beim Erstellen der Anfrage' }
    }

    // Get employee details for notifications
    const { data: employees } = await adminSupabase
      .from('profiles')
      .select('id, email, first_name, last_name, phone')
      .in('id', input.employee_ids)
      .eq('is_active', true)

    if (!employees || employees.length === 0) {
      return { success: false, error: 'Keine gültigen Mitarbeiter gefunden' }
    }

    // Create notifications for each employee
    for (const employee of employees) {
      // Create notification record with token
      const { data: notification, error: notifError } = await adminSupabase
        .from('shift_coverage_notifications')
        .insert({
          coverage_request_id: coverageRequest.id,
          employee_id: employee.id
        })
        .select()
        .single()

      if (notifError || !notification) {
        console.error(`Error creating notification for ${employee.email}:`, notifError)
        continue
      }

      // Queue email if enabled
      if (input.send_email && employee.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://flighthour.getemergence.com'
        const acceptUrl = `${appUrl}/shift-coverage/${notification.accept_token}`

        const emailContent = generateShiftCoverageEmail({
          employeeFirstName: employee.first_name || 'Mitarbeiter',
          requestDate: input.request_date,
          isFullDay: input.is_full_day,
          startTime: input.start_time,
          endTime: input.end_time,
          reason: input.reason,
          acceptUrl
        })

        const { error: emailError } = await adminSupabase.from('email_queue').insert({
          type: 'shift_coverage_request',
          recipient: employee.email,
          recipient_email: employee.email,
          subject: emailContent.subject,
          body: emailContent.plainText,
          content: emailContent.htmlContent,
          status: 'pending'
        })

        if (emailError) {
          console.error(`Error queueing email for ${employee.email}:`, emailError)
        } else {
          // Mark email as sent in notification
          await adminSupabase
            .from('shift_coverage_notifications')
            .update({ email_sent: true, email_sent_at: new Date().toISOString() })
            .eq('id', notification.id)
        }
      }

      // Queue SMS if enabled and phone exists
      if (input.send_sms && employee.phone && isValidPhoneNumber(employee.phone)) {
        const smsMessage = generateShiftCoverageSMS({
          requestDate: input.request_date
        })

        const { error: smsError } = await adminSupabase.from('sms_queue').insert({
          phone_number: normalizePhoneNumber(employee.phone),
          message: smsMessage,
          notification_type: 'shift_coverage',
          status: 'pending'
        })

        if (smsError) {
          console.error(`Error queueing SMS for ${employee.phone}:`, smsError)
        } else {
          // Mark SMS as sent in notification
          await adminSupabase
            .from('shift_coverage_notifications')
            .update({ sms_sent: true, sms_sent_at: new Date().toISOString() })
            .eq('id', notification.id)
        }
      }
    }

    revalidatePath('/kalender')
    return { success: true, requestId: coverageRequest.id }
  } catch (error) {
    console.error('createShiftCoverageRequest error:', error)
    return { success: false, error: 'Ein unerwarteter Fehler ist aufgetreten' }
  }
}

/**
 * Holt alle Shift Coverage Anfragen (für Manager-Ansicht)
 */
export async function getShiftCoverageRequests(): Promise<ShiftCoverageRequestWithRelations[]> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Nicht authentifiziert')
    }

    // Check if user is manager or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'manager' && profile?.role !== 'admin') {
      throw new Error('Keine Berechtigung')
    }

    const adminSupabase = createAdminClient()

    const { data, error } = await adminSupabase
      .from('shift_coverage_requests')
      .select(`
        *,
        creator:profiles!created_by(id, first_name, last_name, email),
        acceptor:profiles!accepted_by(id, first_name, last_name, email)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching coverage requests:', error)
      throw new Error('Fehler beim Laden der Anfragen')
    }

    // Check for expired requests and update status
    const now = new Date()
    for (const request of data || []) {
      if (request.status === 'open' && new Date(request.expires_at) < now) {
        await adminSupabase
          .from('shift_coverage_requests')
          .update({ status: 'expired' })
          .eq('id', request.id)
        request.status = 'expired'
      }
    }

    return data as ShiftCoverageRequestWithRelations[]
  } catch (error) {
    console.error('getShiftCoverageRequests error:', error)
    throw error
  }
}

/**
 * Holt nur offene Shift Coverage Anfragen
 */
export async function getOpenShiftCoverageRequests(): Promise<ShiftCoverageRequestWithRelations[]> {
  try {
    const requests = await getShiftCoverageRequests()
    return requests.filter(r => r.status === 'open')
  } catch (error) {
    console.error('getOpenShiftCoverageRequests error:', error)
    throw error
  }
}

/**
 * Storniert eine Shift Coverage Anfrage
 */
export async function cancelShiftCoverageRequest(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    // Check if user is manager or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'manager' && profile?.role !== 'admin') {
      return { success: false, error: 'Keine Berechtigung' }
    }

    const adminSupabase = createAdminClient()

    const { error } = await adminSupabase
      .from('shift_coverage_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId)
      .eq('status', 'open') // Only cancel open requests

    if (error) {
      console.error('Error cancelling coverage request:', error)
      return { success: false, error: 'Fehler beim Stornieren' }
    }

    revalidatePath('/kalender')
    return { success: true }
  } catch (error) {
    console.error('cancelShiftCoverageRequest error:', error)
    return { success: false, error: 'Ein unerwarteter Fehler ist aufgetreten' }
  }
}

// ============================================================================
// Token-basierte Annahme (öffentlich, ohne Login)
// ============================================================================

/**
 * Validiert einen Accept-Token
 */
export async function validateCoverageToken(token: string): Promise<TokenValidationResult> {
  try {
    const adminSupabase = createAdminClient()

    // Find notification by token
    const { data: notification, error: notifError } = await adminSupabase
      .from('shift_coverage_notifications')
      .select(`
        *,
        employee:profiles!employee_id(id, first_name, last_name, email, phone)
      `)
      .eq('accept_token', token)
      .single()

    if (notifError || !notification) {
      return { valid: false, status: 'invalid' }
    }

    // Get the coverage request
    const { data: coverageRequest, error: requestError } = await adminSupabase
      .from('shift_coverage_requests')
      .select(`
        *,
        creator:profiles!created_by(id, first_name, last_name, email),
        acceptor:profiles!accepted_by(id, first_name, last_name, email)
      `)
      .eq('id', notification.coverage_request_id)
      .single()

    if (requestError || !coverageRequest) {
      return { valid: false, status: 'invalid' }
    }

    // Check if already used
    if (notification.token_used) {
      // Check if it was this person who accepted
      if (coverageRequest.accepted_by === notification.employee_id) {
        return {
          valid: false,
          status: 'already_accepted',
          coverageRequest,
          notification,
          acceptorName: getEmployeeName(notification.employee)
        }
      }
      // Someone else accepted
      return {
        valid: false,
        status: 'already_accepted',
        coverageRequest,
        notification,
        acceptorName: getEmployeeName(coverageRequest.acceptor)
      }
    }

    // Check if request is still open
    if (coverageRequest.status === 'accepted') {
      return {
        valid: false,
        status: 'already_accepted',
        coverageRequest,
        notification,
        acceptorName: getEmployeeName(coverageRequest.acceptor)
      }
    }

    if (coverageRequest.status === 'cancelled') {
      return { valid: false, status: 'cancelled', coverageRequest, notification }
    }

    if (coverageRequest.status === 'expired' || new Date(coverageRequest.expires_at) < new Date()) {
      return { valid: false, status: 'expired', coverageRequest, notification }
    }

    return {
      valid: true,
      status: 'valid',
      coverageRequest,
      notification
    }
  } catch (error) {
    console.error('validateCoverageToken error:', error)
    return { valid: false, status: 'invalid' }
  }
}

/**
 * Nimmt eine Shift Coverage Anfrage an
 * Erstellt automatisch einen genehmigten Work Request
 */
export async function acceptShiftCoverage(token: string): Promise<AcceptCoverageResult> {
  try {
    const adminSupabase = createAdminClient()

    // Validate token first
    const validation = await validateCoverageToken(token)

    if (!validation.valid) {
      if (validation.status === 'already_accepted') {
        return {
          success: false,
          message: `Diese Schicht wurde bereits von ${validation.acceptorName} übernommen.`,
          alreadyAccepted: true,
          acceptorName: validation.acceptorName
        }
      }
      if (validation.status === 'expired') {
        return { success: false, message: 'Diese Anfrage ist abgelaufen.' }
      }
      if (validation.status === 'cancelled') {
        return { success: false, message: 'Diese Anfrage wurde storniert.' }
      }
      return { success: false, message: 'Ungültiger oder abgelaufener Link.' }
    }

    const { coverageRequest, notification } = validation

    if (!coverageRequest || !notification) {
      return { success: false, message: 'Anfrage nicht gefunden.' }
    }

    // Double-check the request is still open (race condition protection)
    const { data: currentRequest } = await adminSupabase
      .from('shift_coverage_requests')
      .select('status, accepted_by')
      .eq('id', coverageRequest.id)
      .single()

    if (currentRequest?.status !== 'open') {
      // Someone else accepted in the meantime
      const { data: acceptor } = await adminSupabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', currentRequest?.accepted_by)
        .single()

      return {
        success: false,
        message: `Diese Schicht wurde gerade von ${getEmployeeName(acceptor ?? undefined)} übernommen.`,
        alreadyAccepted: true,
        acceptorName: getEmployeeName(acceptor ?? undefined)
      }
    }

    // Get employee details
    const { data: employee } = await adminSupabase
      .from('profiles')
      .select('id, first_name, last_name, email, employee_number')
      .eq('id', notification.employee_id)
      .single()

    if (!employee) {
      return { success: false, message: 'Mitarbeiter nicht gefunden.' }
    }

    // Start transaction-like operations
    const now = new Date().toISOString()

    // 1. Mark notification as used
    await adminSupabase
      .from('shift_coverage_notifications')
      .update({ token_used: true, token_used_at: now })
      .eq('id', notification.id)

    // 2. Update coverage request status
    await adminSupabase
      .from('shift_coverage_requests')
      .update({
        status: 'accepted',
        accepted_by: employee.id,
        accepted_at: now
      })
      .eq('id', coverageRequest.id)

    // 3. Create approved work request
    const { data: workRequest, error: workRequestError } = await adminSupabase
      .from('work_requests')
      .insert({
        employee_id: employee.id,
        request_date: coverageRequest.request_date,
        is_full_day: coverageRequest.is_full_day,
        start_time: coverageRequest.start_time,
        end_time: coverageRequest.end_time,
        reason: `Schichtübernahme: ${coverageRequest.reason || 'Auf Anfrage'}`,
        status: 'approved',
        approved_by: coverageRequest.created_by, // Approved by whoever created the coverage request
        approved_at: now
      })
      .select()
      .single()

    if (workRequestError) {
      console.error('Error creating work request:', workRequestError)
      // Rollback - reopen the coverage request
      await adminSupabase
        .from('shift_coverage_requests')
        .update({ status: 'open', accepted_by: null, accepted_at: null })
        .eq('id', coverageRequest.id)
      await adminSupabase
        .from('shift_coverage_notifications')
        .update({ token_used: false, token_used_at: null })
        .eq('id', notification.id)

      return { success: false, message: 'Fehler beim Erstellen des Arbeitsantrags.' }
    }

    // 4. Link work request to coverage request
    await adminSupabase
      .from('shift_coverage_requests')
      .update({ work_request_id: workRequest.id })
      .eq('id', coverageRequest.id)

    // 5. Create calendar event
    const requestDate = coverageRequest.request_date
    const calendarEventId = `shift_coverage_${coverageRequest.id}`

    let eventTitle = `FI: ${employee.first_name} ${employee.last_name}${employee.employee_number ? ` (${employee.employee_number})` : ''}`
    if (!coverageRequest.is_full_day && coverageRequest.start_time && coverageRequest.end_time) {
      eventTitle += ` ${coverageRequest.start_time.slice(0, 5)}-${coverageRequest.end_time.slice(0, 5)}`
    }

    const eventData = {
      id: calendarEventId,
      user_id: employee.id,
      event_type: 'fi_assignment',
      title: eventTitle,
      description: `Schichtübernahme: ${coverageRequest.reason || 'Auf Anfrage'}`,
      assigned_instructor_id: employee.id,
      assigned_instructor_number: employee.employee_number || null,
      assigned_instructor_name: `${employee.first_name} ${employee.last_name}`,
      is_all_day: coverageRequest.is_full_day,
      actual_work_start_time: coverageRequest.is_full_day ? null : coverageRequest.start_time,
      actual_work_end_time: coverageRequest.is_full_day ? null : coverageRequest.end_time,
      customer_first_name: '',
      customer_last_name: '',
      customer_email: null,
      customer_phone: null,
      start_time: `${requestDate}T08:00:00`,
      end_time: `${requestDate}T09:00:00`,
      duration: 60,
      attendee_count: 1,
      status: 'confirmed',
      location: 'FLIGHTHOUR',
      remarks: coverageRequest.is_full_day
        ? 'Ganztägiger Arbeitstag (Schichtübernahme)'
        : `Arbeitstag von ${coverageRequest.start_time?.slice(0, 5)} bis ${coverageRequest.end_time?.slice(0, 5)} (Schichtübernahme)`,
      created_by: coverageRequest.created_by,
      sync_status: 'pending'
    }

    await adminSupabase.from('calendar_events').insert(eventData)

    // Update work request with calendar_event_id
    await adminSupabase
      .from('work_requests')
      .update({ calendar_event_id: calendarEventId })
      .eq('id', workRequest.id)

    // 6. Mark all other notifications for this request as used (they can't accept anymore)
    await adminSupabase
      .from('shift_coverage_notifications')
      .update({ token_used: true, token_used_at: now })
      .eq('coverage_request_id', coverageRequest.id)
      .neq('id', notification.id)

    return {
      success: true,
      message: `Du bist jetzt für den ${new Date(coverageRequest.request_date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })} eingetragen!`,
      workRequestId: workRequest.id
    }
  } catch (error) {
    console.error('acceptShiftCoverage error:', error)
    return { success: false, message: 'Ein unerwarteter Fehler ist aufgetreten.' }
  }
}

/**
 * Holt die Anzahl offener Shift Coverage Anfragen (für Badge)
 */
export async function getOpenCoverageCount(): Promise<number> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return 0
    }

    const adminSupabase = createAdminClient()

    const { count, error } = await adminSupabase
      .from('shift_coverage_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')
      .gt('expires_at', new Date().toISOString())

    if (error) {
      console.error('Error counting open coverage requests:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('getOpenCoverageCount error:', error)
    return 0
  }
}

/**
 * Holt alle aktiven Mitarbeiter für die Auswahl
 */
export async function getActiveEmployeesForCoverage(): Promise<Array<{
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
}>> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Nicht authentifiziert')
    }

    // Check if user is manager or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'manager' && profile?.role !== 'admin') {
      throw new Error('Keine Berechtigung')
    }

    const adminSupabase = createAdminClient()

    const { data, error } = await adminSupabase
      .from('profiles')
      .select('id, email, first_name, last_name, phone')
      .eq('is_active', true)
      .is('exit_date', null)
      .order('first_name')

    if (error) {
      console.error('Error fetching employees:', error)
      throw new Error('Fehler beim Laden der Mitarbeiter')
    }

    return data || []
  } catch (error) {
    console.error('getActiveEmployeesForCoverage error:', error)
    throw error
  }
}
