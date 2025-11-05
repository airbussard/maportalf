'use server'

/**
 * Work Requests Server Actions
 *
 * Manages work request operations for the employee portal.
 * Compatible with existing PHP system - uses same database structure.
 *
 * Features:
 * - Employee: Create, view, edit, withdraw own requests
 * - Manager/Admin: View all, approve, reject, direct create
 * - Conflict detection
 * - Calendar event integration
 * - Email notifications (TODO)
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { generateActionToken } from '@/lib/utils/generate-action-token'
import {
  WorkRequest,
  WorkRequestStatus,
  WorkRequestWithRelations,
  WorkRequestWithEmployee,
  CreateWorkRequestInput,
  UpdateWorkRequestInput,
  WorkRequestFilters,
  WorkRequestStats,
  WorkRequestConflict,
  validateCreateRequestInput,
  addSecondsToTime,
  isDateInPast,
  isValidTimeFormat,
  isEndTimeAfterStartTime
} from '@/lib/types/work-requests'

// ============================================================================
// Employee Actions - Own Requests
// ============================================================================

/**
 * Get all work requests for the current user
 * @returns Array of work requests ordered by date (newest first)
 */
export async function getMyWorkRequests(): Promise<WorkRequest[]> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Nicht authentifiziert')
    }

    const { data, error } = await supabase
      .from('work_requests')
      .select('*')
      .eq('employee_id', user.id)
      .order('request_date', { ascending: false })

    if (error) {
      console.error('Error fetching work requests:', error)
      throw new Error('Fehler beim Laden der Requests')
    }

    return data as WorkRequest[]
  } catch (error) {
    console.error('getMyWorkRequests error:', error)
    throw error
  }
}

/**
 * Get work requests for the current user with employee details
 * Used in detailed views
 */
export async function getMyWorkRequestsWithDetails(): Promise<WorkRequestWithEmployee[]> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Nicht authentifiziert')
    }

    const { data, error } = await supabase
      .from('work_requests')
      .select(`
        *,
        employee:profiles!employee_id(id, first_name, last_name, email)
      `)
      .eq('employee_id', user.id)
      .order('request_date', { ascending: false })

    if (error) {
      console.error('Error fetching work requests with details:', error)
      throw new Error('Fehler beim Laden der Requests')
    }

    return data as WorkRequestWithEmployee[]
  } catch (error) {
    console.error('getMyWorkRequestsWithDetails error:', error)
    throw error
  }
}

/**
 * Create a new work request
 * @param input Request data (date, is_full_day, times, reason)
 * @returns Created work request
 */
export async function createWorkRequest(
  input: CreateWorkRequestInput
): Promise<WorkRequest> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Nicht authentifiziert')
    }

    // Validate input
    const validationError = validateCreateRequestInput(input)
    if (validationError) {
      throw new Error(validationError)
    }

    // Check for existing request on same date
    const { data: existingRequest } = await supabase
      .from('work_requests')
      .select('id')
      .eq('employee_id', user.id)
      .eq('request_date', input.request_date)
      .neq('status', 'withdrawn')
      .single()

    if (existingRequest) {
      throw new Error('Sie haben bereits einen Request für dieses Datum')
    }

    // Prepare request data
    const requestData: Partial<WorkRequest> = {
      employee_id: user.id,
      request_date: input.request_date,
      is_full_day: input.is_full_day,
      reason: input.reason || null,
      status: 'pending'
    }

    // Add times for partial day requests (convert HH:MM to HH:MM:SS)
    if (!input.is_full_day) {
      if (!input.start_time || !input.end_time) {
        throw new Error('Start- und Endzeit sind für Teilzeit-Requests erforderlich')
      }
      requestData.start_time = addSecondsToTime(input.start_time)
      requestData.end_time = addSecondsToTime(input.end_time)
    } else {
      requestData.start_time = null
      requestData.end_time = null
    }

    // Create request
    const { data: newRequest, error } = await supabase
      .from('work_requests')
      .insert(requestData)
      .select()
      .single()

    if (error) {
      console.error('Error creating work request:', error)
      throw new Error('Fehler beim Erstellen des Requests')
    }

    // Queue email notification to managers/admins who opted in
    await queueWorkRequestNotification(newRequest.id)

    revalidatePath('/requests')
    return newRequest as WorkRequest
  } catch (error) {
    console.error('createWorkRequest error:', error)
    throw error
  }
}

/**
 * Update an existing work request
 * Only allowed for pending requests by the employee who created it
 */
export async function updateWorkRequest(
  requestId: string,
  input: UpdateWorkRequestInput
): Promise<WorkRequest> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Nicht authentifiziert')
    }

    // Validate input
    const validationError = validateCreateRequestInput(input)
    if (validationError) {
      throw new Error(validationError)
    }

    // Prepare update data
    const updateData: Partial<WorkRequest> = {
      request_date: input.request_date,
      is_full_day: input.is_full_day,
      reason: input.reason || null
    }

    // Handle times
    if (!input.is_full_day && input.start_time && input.end_time) {
      updateData.start_time = addSecondsToTime(input.start_time)
      updateData.end_time = addSecondsToTime(input.end_time)
    } else {
      updateData.start_time = null
      updateData.end_time = null
    }

    // Update (only own pending requests)
    const { data: updatedRequest, error } = await supabase
      .from('work_requests')
      .update(updateData)
      .eq('id', requestId)
      .eq('employee_id', user.id) // Only own requests
      .eq('status', 'pending') // Only pending
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Request nicht gefunden oder kann nicht bearbeitet werden')
      }
      console.error('Error updating work request:', error)
      throw new Error('Fehler beim Aktualisieren des Requests')
    }

    revalidatePath('/requests')
    return updatedRequest as WorkRequest
  } catch (error) {
    console.error('updateWorkRequest error:', error)
    throw error
  }
}

/**
 * Withdraw a work request
 * Only allowed for pending requests by the employee who created it
 */
export async function withdrawWorkRequest(requestId: string): Promise<WorkRequest> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Nicht authentifiziert')
    }

    const { data: withdrawnRequest, error } = await supabase
      .from('work_requests')
      .update({ status: 'withdrawn' })
      .eq('id', requestId)
      .eq('employee_id', user.id) // Only own requests
      .eq('status', 'pending') // Only pending
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Request nicht gefunden oder kann nicht zurückgezogen werden')
      }
      console.error('Error withdrawing work request:', error)
      throw new Error('Fehler beim Zurückziehen des Requests')
    }

    revalidatePath('/requests')
    return withdrawnRequest as WorkRequest
  } catch (error) {
    console.error('withdrawWorkRequest error:', error)
    throw error
  }
}

// ============================================================================
// Manager/Admin Actions - All Requests
// ============================================================================

/**
 * Get all work requests (Manager/Admin only)
 * @param filters Optional filters (status, date range, employee)
 * @returns Array of work requests with employee and approver details
 */
export async function getAllWorkRequests(
  filters?: WorkRequestFilters
): Promise<WorkRequestWithRelations[]> {
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
      throw new Error('Keine Berechtigung zum Zugriff auf alle Requests')
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()

    // Build query with relations
    let query = adminSupabase
      .from('work_requests')
      .select(`
        *,
        employee:profiles!employee_id(id, first_name, last_name, email),
        approver:profiles!approved_by(id, first_name, last_name)
      `)
      .order('request_date', { ascending: false })

    // Apply filters
    if (filters?.status && filters.status.length > 0) {
      query = query.eq('status', filters.status as WorkRequestStatus)
    }
    if (filters?.fromDate) {
      query = query.gte('request_date', filters.fromDate)
    }
    if (filters?.toDate) {
      query = query.lte('request_date', filters.toDate)
    }
    if (filters?.employeeId) {
      query = query.eq('employee_id', filters.employeeId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching all work requests:', error)
      throw new Error('Fehler beim Laden der Requests')
    }

    return data as WorkRequestWithRelations[]
  } catch (error) {
    console.error('getAllWorkRequests error:', error)
    throw error
  }
}

/**
 * Get work request statistics (Manager/Admin only)
 * Used for dashboard cards
 */
export async function getWorkRequestStats(): Promise<WorkRequestStats> {
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

    // Get all requests
    const { data: allRequests } = await adminSupabase
      .from('work_requests')
      .select('status, request_date, approved_at')

    if (!allRequests) {
      return { pending: 0, approvedToday: 0, totalMonth: 0, totalYear: 0 }
    }

    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date()
    monthStart.setDate(1)
    const monthStartStr = monthStart.toISOString().split('T')[0]
    const yearStart = new Date()
    yearStart.setMonth(0, 1)
    const yearStartStr = yearStart.toISOString().split('T')[0]

    const stats: WorkRequestStats = {
      pending: allRequests.filter(r => r.status === 'pending').length,
      approvedToday: allRequests.filter(r =>
        r.status === 'approved' &&
        r.approved_at &&
        r.approved_at.startsWith(today)
      ).length,
      totalMonth: allRequests.filter(r =>
        r.request_date >= monthStartStr
      ).length,
      totalYear: allRequests.filter(r =>
        r.request_date >= yearStartStr
      ).length
    }

    return stats
  } catch (error) {
    console.error('getWorkRequestStats error:', error)
    throw error
  }
}

/**
 * Approve a work request (Manager/Admin only)
 * Creates a calendar event automatically
 */
export async function approveWorkRequest(requestId: string): Promise<WorkRequest> {
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
      throw new Error('Keine Berechtigung zum Genehmigen von Requests')
    }

    const adminSupabase = createAdminClient()

    // Get existing request with employee details
    const { data: existingRequest, error: fetchError } = await adminSupabase
      .from('work_requests')
      .select(`
        *,
        employee:profiles!employee_id(id, first_name, last_name, email, employee_number)
      `)
      .eq('id', requestId)
      .single()

    if (fetchError || !existingRequest) {
      throw new Error('Request nicht gefunden')
    }

    if (existingRequest.status !== 'pending') {
      throw new Error('Nur ausstehende Requests können genehmigt werden')
    }

    const employee = existingRequest.employee
    if (!employee) {
      throw new Error('Mitarbeiter nicht gefunden')
    }

    // Update request status
    const { data: approvedRequest, error: updateError } = await adminSupabase
      .from('work_requests')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) {
      console.error('Error approving work request:', updateError)
      throw new Error('Fehler beim Genehmigen des Requests')
    }

    // Create calendar event as FI assignment (fixed 8:00-9:00 in Google Calendar)
    const requestDate = existingRequest.request_date

    // FI event title with employee number and time range (if partial day)
    let eventTitle = `FI: ${employee.first_name} ${employee.last_name}${employee.employee_number ? ` (${employee.employee_number})` : ''}`
    if (!existingRequest.is_full_day && existingRequest.start_time && existingRequest.end_time) {
      eventTitle += ` ${existingRequest.start_time.slice(0, 5)}-${existingRequest.end_time.slice(0, 5)}`
    }

    const remarks = existingRequest.is_full_day
      ? 'Ganztägiger Arbeitstag (genehmigter Request)'
      : `Arbeitstag von ${existingRequest.start_time?.slice(0, 5)} bis ${existingRequest.end_time?.slice(0, 5)} (genehmigter Request)`

    const calendarEventId = `work_request_${requestId}`

    const eventData = {
      id: calendarEventId,
      user_id: employee.id,
      event_type: 'fi_assignment',  // Mark as FI assignment
      title: eventTitle,
      description: existingRequest.reason || 'Genehmigter Arbeitstag',

      // FI-specific fields
      assigned_instructor_id: employee.id || null,
      assigned_instructor_number: employee.employee_number || null,
      assigned_instructor_name: `${employee.first_name} ${employee.last_name}`,
      is_all_day: existingRequest.is_full_day,
      request_id: requestId,  // Link back to work request

      // Actual work times (for display and editing)
      actual_work_start_time: existingRequest.is_full_day ? null : existingRequest.start_time,
      actual_work_end_time: existingRequest.is_full_day ? null : existingRequest.end_time,

      // Empty customer fields (not used for FI events)
      customer_first_name: '',
      customer_last_name: '',
      customer_email: null,
      customer_phone: null,

      // Fixed times (8:00-9:00) for Google Calendar sync
      start_time: `${requestDate}T08:00:00`,
      end_time: `${requestDate}T09:00:00`,
      duration: 60,
      attendee_count: 1,
      status: 'confirmed',
      location: 'FLIGHTHOUR',
      remarks: remarks,
      created_by: user.id,
      sync_status: 'pending'
    }

    const { error: calendarError } = await adminSupabase
      .from('calendar_events')
      .insert(eventData)

    if (calendarError) {
      console.error('Error creating calendar event:', calendarError)
      // Don't throw - approval succeeded, calendar is bonus
    } else {
      // Update work_request with calendar_event_id
      await adminSupabase
        .from('work_requests')
        .update({ calendar_event_id: calendarEventId })
        .eq('id', requestId)
    }

    // TODO: Send approval email to employee
    // await sendApprovalEmail(approvedRequest, employee)

    revalidatePath('/requests')
    revalidatePath('/requests/manage')

    return approvedRequest as WorkRequest
  } catch (error) {
    console.error('approveWorkRequest error:', error)
    throw error
  }
}

/**
 * Reject a work request (Manager/Admin only)
 */
export async function rejectWorkRequest(
  requestId: string,
  rejectionReason?: string
): Promise<WorkRequest> {
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
      throw new Error('Keine Berechtigung zum Ablehnen von Requests')
    }

    const adminSupabase = createAdminClient()

    // Check if request exists and is pending
    const { data: existingRequest } = await adminSupabase
      .from('work_requests')
      .select('status')
      .eq('id', requestId)
      .single()

    if (!existingRequest) {
      throw new Error('Request nicht gefunden')
    }

    if (existingRequest.status !== 'pending') {
      throw new Error('Nur ausstehende Requests können abgelehnt werden')
    }

    // Update request
    const { data: rejectedRequest, error } = await adminSupabase
      .from('work_requests')
      .update({
        status: 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: rejectionReason || null
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('Error rejecting work request:', error)
      throw new Error('Fehler beim Ablehnen des Requests')
    }

    // TODO: Send rejection email to employee
    // await sendRejectionEmail(rejectedRequest, rejectionReason)

    revalidatePath('/requests')
    revalidatePath('/requests/manage')

    return rejectedRequest as WorkRequest
  } catch (error) {
    console.error('rejectWorkRequest error:', error)
    throw error
  }
}

/**
 * Create a work request directly (Manager/Admin only)
 * Bypasses approval - creates in approved state
 */
export async function createWorkRequestDirect(
  employeeId: string,
  input: CreateWorkRequestInput
): Promise<WorkRequest> {
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
      throw new Error('Keine Berechtigung zum direkten Anlegen von Requests')
    }

    // Validate input
    const validationError = validateCreateRequestInput(input)
    if (validationError) {
      throw new Error(validationError)
    }

    const adminSupabase = createAdminClient()

    // Check if employee exists
    const { data: employee } = await adminSupabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('id', employeeId)
      .single()

    if (!employee) {
      throw new Error('Mitarbeiter nicht gefunden')
    }

    // Check for existing request on same date
    const { data: existingRequest } = await adminSupabase
      .from('work_requests')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('request_date', input.request_date)
      .neq('status', 'withdrawn')
      .single()

    if (existingRequest) {
      throw new Error('Es existiert bereits ein Request für diesen Mitarbeiter an diesem Datum')
    }

    // Prepare request data
    const requestData: Partial<WorkRequest> = {
      employee_id: employeeId,
      request_date: input.request_date,
      is_full_day: input.is_full_day,
      reason: input.reason || null,
      status: 'approved', // Directly approved
      approved_by: user.id,
      approved_at: new Date().toISOString()
    }

    // Add times
    if (!input.is_full_day && input.start_time && input.end_time) {
      requestData.start_time = addSecondsToTime(input.start_time)
      requestData.end_time = addSecondsToTime(input.end_time)
    } else {
      requestData.start_time = null
      requestData.end_time = null
    }

    // Create request
    const { data: newRequest, error } = await adminSupabase
      .from('work_requests')
      .insert(requestData)
      .select()
      .single()

    if (error) {
      console.error('Error creating direct work request:', error)
      throw new Error('Fehler beim Erstellen des Requests')
    }

    // Create calendar event
    const calendarEventId = `work_request_${newRequest.id}`
    const requestDate = newRequest.request_date

    let eventTitle = `${employee.first_name} ${employee.last_name} - Arbeitstag`
    if (!input.is_full_day && input.start_time && input.end_time) {
      eventTitle += ` (${input.start_time}-${input.end_time})`
    }

    const eventData = {
      id: calendarEventId,
      user_id: employeeId,
      title: eventTitle,
      description: input.reason || 'Direkt angelegter Arbeitstag',
      customer_first_name: employee.first_name,
      customer_last_name: employee.last_name,
      customer_email: employee.email,
      customer_phone: '',
      start_time: `${requestDate}T08:00:00`,
      end_time: `${requestDate}T09:00:00`,
      duration: 60,
      attendee_count: 1,
      status: 'confirmed',
      location: 'FLIGHTHOUR',
      remarks: input.is_full_day
        ? 'Ganztägiger Arbeitstag'
        : `Arbeitstag von ${input.start_time} bis ${input.end_time}`,
      created_by: user.id,
      sync_status: 'pending'
    }

    await adminSupabase.from('calendar_events').insert(eventData)

    // Update with calendar_event_id
    await adminSupabase
      .from('work_requests')
      .update({ calendar_event_id: calendarEventId })
      .eq('id', newRequest.id)

    revalidatePath('/requests')
    revalidatePath('/requests/manage')

    return newRequest as WorkRequest
  } catch (error) {
    console.error('createWorkRequestDirect error:', error)
    throw error
  }
}

/**
 * Delete a work request (Admin only)
 * Hard delete from database
 */
export async function deleteWorkRequest(requestId: string): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Nicht authentifiziert')
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      throw new Error('Nur Admins können Requests löschen')
    }

    const adminSupabase = createAdminClient()

    // Get calendar_event_id before deleting
    const { data: request } = await adminSupabase
      .from('work_requests')
      .select('calendar_event_id')
      .eq('id', requestId)
      .single()

    // Delete calendar event if exists
    if (request?.calendar_event_id) {
      await adminSupabase
        .from('calendar_events')
        .delete()
        .eq('id', request.calendar_event_id)
    }

    // Delete request
    const { error } = await adminSupabase
      .from('work_requests')
      .delete()
      .eq('id', requestId)

    if (error) {
      console.error('Error deleting work request:', error)
      throw new Error('Fehler beim Löschen des Requests')
    }

    revalidatePath('/requests')
    revalidatePath('/requests/manage')
  } catch (error) {
    console.error('deleteWorkRequest error:', error)
    throw error
  }
}

// ============================================================================
// Conflict Detection
// ============================================================================

/**
 * Check for conflicting work requests on the same date
 * @param requestDate Date to check (YYYY-MM-DD)
 * @param excludeId Optional request ID to exclude (for editing)
 * @returns Array of conflicting requests
 */
export async function checkWorkRequestConflicts(
  requestDate: string,
  excludeId?: string
): Promise<WorkRequestConflict[]> {
  try {
    const adminSupabase = createAdminClient()

    let query = adminSupabase
      .from('work_requests')
      .select(`
        id,
        is_full_day,
        start_time,
        end_time,
        employee:profiles!employee_id(first_name, last_name)
      `)
      .eq('request_date', requestDate)
      .eq('status', 'approved')

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error checking conflicts:', error)
      return []
    }

    // Map Supabase response to WorkRequestConflict type
    return (data || []).map((item: any) => ({
      id: item.id,
      employee: Array.isArray(item.employee) ? item.employee[0] : item.employee,
      is_full_day: item.is_full_day,
      start_time: item.start_time,
      end_time: item.end_time
    })) as WorkRequestConflict[]
  } catch (error) {
    console.error('checkWorkRequestConflicts error:', error)
    return []
  }
}

/**
 * Get conflict count for a specific date
 */
export async function getConflictCount(
  requestDate: string,
  excludeId?: string
): Promise<number> {
  const conflicts = await checkWorkRequestConflicts(requestDate, excludeId)
  return conflicts.length
}

/**
 * Get count of pending/open requests (for dashboard widget)
 * Returns count of requests that are pending or approved
 */
export async function getPendingRequestsCount() {
  try {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from('work_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (error) {
      console.error('Failed to get pending requests count:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Failed to get pending requests count:', error)
    return 0
  }
}

// ============================================================================
// Email Notifications
// ============================================================================

/**
 * Queue work request email notifications to Manager/Admin users who opted in
 * @param requestId The work request ID
 */
async function queueWorkRequestNotification(requestId: string): Promise<void> {
  try {
    const adminSupabase = createAdminClient()

    // Get work request with employee details
    const { data: workRequest, error: requestError } = await adminSupabase
      .from('work_requests')
      .select(`
        *,
        profiles:user_id(first_name, last_name, email)
      `)
      .eq('id', requestId)
      .single()

    if (requestError || !workRequest) {
      console.error('Error fetching work request for email:', requestError)
      return
    }

    // Get all Manager/Admin users with email notification enabled
    const { data: recipients, error: recipientsError } = await adminSupabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('role', ['manager', 'admin'])
      .eq('receive_request_emails', true)

    if (recipientsError || !recipients || recipients.length === 0) {
      console.log('No recipients found for work request emails')
      return
    }

    // Generate approve and reject tokens (7 days validity)
    const approveToken = await generateActionToken(requestId, 'approve', 7)
    const rejectToken = await generateActionToken(requestId, 'reject', 7)

    // Determine request type
    const requestType = workRequest.type || 'sonstiges'

    // Employee name
    const employeeName = `${workRequest.profiles?.first_name || ''} ${workRequest.profiles?.last_name || ''}`.trim()
      || workRequest.profiles?.email
      || 'Mitarbeiter'

    // Format dates
    const startDate = workRequest.start_date || workRequest.request_date
    const endDate = workRequest.end_date || workRequest.request_date

    // Queue email for each recipient
    for (const recipient of recipients) {
      const recipientName = `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim()
        || recipient.email

      // Insert into email queue
      await adminSupabase.from('email_queue').insert({
        type: 'work_request',
        recipient_email: recipient.email,
        content: JSON.stringify({
          requestId: requestId,
          employeeName: employeeName,
          requestType: requestType,
          startDate: startDate,
          endDate: endDate,
          reason: workRequest.reason,
          approveToken: approveToken.token,
          rejectToken: rejectToken.token,
          recipientName: recipientName
        }),
        status: 'pending'
      })
    }

    console.log(`Queued ${recipients.length} work request notification emails`)
  } catch (error) {
    console.error('Error queueing work request notification:', error)
    // Don't throw - work request was created successfully
  }
}
