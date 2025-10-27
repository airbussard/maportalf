/**
 * Work Requests Type Definitions
 *
 * Diese Types entsprechen EXAKT der bestehenden Datenbankstruktur.
 * Keine camelCase Konvertierung - snake_case wie in PostgreSQL.
 *
 * Database Table: work_requests
 * Compatible with PHP system - shared database
 */

/**
 * Base Work Request Type
 * Represents a row from the work_requests table
 */
export interface WorkRequest {
  /** UUID Primary Key */
  id: string

  /** Foreign Key to profiles.id */
  employee_id: string

  /** Date of the requested work day (YYYY-MM-DD) */
  request_date: string

  /** Whether this is a full day request */
  is_full_day: boolean

  /** Start time for partial day requests (HH:MM:SS or null) */
  start_time: string | null

  /** End time for partial day requests (HH:MM:SS or null) */
  end_time: string | null

  /** Optional reason/note for the request */
  reason: string | null

  /** Request status */
  status: WorkRequestStatus

  /** ID of the manager/admin who approved/rejected (null if pending) */
  approved_by: string | null

  /** Timestamp when approved/rejected (null if pending) */
  approved_at: string | null

  /** Reason for rejection (null if not rejected) */
  rejection_reason: string | null

  /** Reference to created calendar_events.id (null if not approved) */
  calendar_event_id: string | null

  /** Token for email quick actions (approve/reject via link) */
  action_token: string | null

  /** Expiration time for action_token */
  token_expires_at: string | null

  /** Creation timestamp */
  created_at: string

  /** Last update timestamp */
  updated_at: string
}

/**
 * Work Request Status
 * Must match DB CHECK constraint
 */
export type WorkRequestStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn'

/**
 * Work Request with Employee Relation
 * Used when querying with employee details
 */
export interface WorkRequestWithEmployee extends WorkRequest {
  employee: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

/**
 * Work Request with All Relations
 * Used in management views with full details
 */
export interface WorkRequestWithRelations extends WorkRequest {
  employee?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  approver?: {
    id: string
    first_name: string
    last_name: string
  }
}

/**
 * Input type for creating a new work request
 * Excludes auto-generated and system fields
 */
export interface CreateWorkRequestInput {
  request_date: string
  is_full_day: boolean
  start_time?: string // Optional, required if !is_full_day (format: HH:MM)
  end_time?: string   // Optional, required if !is_full_day (format: HH:MM)
  reason?: string
}

/**
 * Input type for updating an existing work request
 * Only allowed for pending requests by the employee
 */
export interface UpdateWorkRequestInput {
  request_date: string
  is_full_day: boolean
  start_time?: string
  end_time?: string
  reason?: string
}

/**
 * Filter options for querying work requests
 * Used in management views
 */
export interface WorkRequestFilters {
  status?: WorkRequestStatus | ''
  fromDate?: string  // YYYY-MM-DD
  toDate?: string    // YYYY-MM-DD
  employeeId?: string
}

/**
 * Statistics for work requests
 * Used in management dashboard
 */
export interface WorkRequestStats {
  pending: number
  approvedToday: number
  totalMonth: number
  totalYear: number
}

/**
 * Conflict detection result
 * Shows other employees working on the same date
 */
export interface WorkRequestConflict {
  id: string
  employee: {
    first_name: string
    last_name: string
  }
  is_full_day: boolean
  start_time: string | null
  end_time: string | null
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get localized status label
 */
export function getStatusLabel(status: WorkRequestStatus): string {
  const labels: Record<WorkRequestStatus, string> = {
    pending: 'Ausstehend',
    approved: 'Genehmigt',
    rejected: 'Abgelehnt',
    withdrawn: 'Zurückgezogen'
  }
  return labels[status]
}

/**
 * Get status color for badges (Tailwind classes)
 */
export function getStatusColor(status: WorkRequestStatus): string {
  const colors: Record<WorkRequestStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    withdrawn: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  }
  return colors[status]
}

/**
 * Format time range for display
 * Handles full day vs partial day requests
 */
export function formatRequestTime(request: WorkRequest): string {
  if (request.is_full_day) {
    return 'Ganztägig'
  }

  if (request.start_time && request.end_time) {
    // Remove seconds from TIME (HH:MM:SS -> HH:MM)
    const start = request.start_time.slice(0, 5)
    const end = request.end_time.slice(0, 5)
    return `${start} - ${end}`
  }

  return 'Keine Zeit angegeben'
}

/**
 * Format date for display (long format, German)
 * @example "Montag, 15. Januar 2025"
 */
export function formatRequestDate(date: string): string {
  return new Date(date).toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Format date for display (short format)
 * @example "15.01.2025"
 */
export function formatRequestDateShort(date: string): string {
  return new Date(date).toLocaleDateString('de-DE')
}

/**
 * Get day name from date
 * @example "Montag"
 */
export function getDayName(date: string): string {
  return new Date(date).toLocaleDateString('de-DE', { weekday: 'long' })
}

/**
 * Format timestamp for display
 * @example "15.01.2025, 14:30"
 */
export function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return '-'

  return new Date(timestamp).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get employee full name from request
 */
export function getEmployeeName(request: WorkRequestWithRelations): string {
  if (!request.employee) return 'Unbekannt'
  return `${request.employee.first_name} ${request.employee.last_name}`.trim()
}

/**
 * Get approver full name from request
 */
export function getApproverName(request: WorkRequestWithRelations): string {
  if (!request.approver) return '-'
  return `${request.approver.first_name} ${request.approver.last_name}`.trim()
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate time format (HH:MM)
 */
export function isValidTimeFormat(time: string): boolean {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
}

/**
 * Check if date is in the past
 */
export function isDateInPast(date: string): boolean {
  const requestDate = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return requestDate < today
}

/**
 * Check if date is today
 */
export function isDateToday(date: string): boolean {
  const requestDate = new Date(date).toDateString()
  const today = new Date().toDateString()
  return requestDate === today
}

/**
 * Check if end time is after start time
 */
export function isEndTimeAfterStartTime(startTime: string, endTime: string): boolean {
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)

  return endHour > startHour || (endHour === startHour && endMin > startMin)
}

/**
 * Validate create request input
 * Returns error message or null if valid
 */
export function validateCreateRequestInput(input: CreateWorkRequestInput): string | null {
  // Validate date format
  if (!isValidDateFormat(input.request_date)) {
    return 'Ungültiges Datumsformat (erwartet: YYYY-MM-DD)'
  }

  // Check if date is not in the past
  if (isDateInPast(input.request_date)) {
    return 'Das Datum darf nicht in der Vergangenheit liegen'
  }

  // Validate times for partial day requests
  if (!input.is_full_day) {
    if (!input.start_time || !input.end_time) {
      return 'Start- und Endzeit sind für Teilzeit-Requests erforderlich'
    }

    if (!isValidTimeFormat(input.start_time)) {
      return 'Ungültiges Startzeit-Format (erwartet: HH:MM)'
    }

    if (!isValidTimeFormat(input.end_time)) {
      return 'Ungültiges Endzeit-Format (erwartet: HH:MM)'
    }

    if (!isEndTimeAfterStartTime(input.start_time, input.end_time)) {
      return 'Endzeit muss nach Startzeit liegen'
    }
  }

  return null
}

/**
 * Convert time from HH:MM to HH:MM:SS for database
 */
export function addSecondsToTime(time: string): string {
  return time + ':00'
}

/**
 * Remove seconds from time (HH:MM:SS -> HH:MM)
 */
export function removeSecondsFromTime(time: string | null): string | null {
  if (!time) return null
  return time.slice(0, 5)
}

// ============================================================================
// Calendar Helper Functions
// ============================================================================

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: string): boolean {
  const day = new Date(date).getDay()
  return day === 0 || day === 6
}

/**
 * Get month name from date
 */
export function getMonthName(date: string): string {
  return new Date(date).toLocaleDateString('de-DE', { month: 'long' })
}

/**
 * Get year from date
 */
export function getYear(date: string): number {
  return new Date(date).getFullYear()
}

/**
 * Group requests by month
 */
export function groupRequestsByMonth(
  requests: WorkRequest[]
): Record<string, WorkRequest[]> {
  return requests.reduce((acc, request) => {
    const monthKey = request.request_date.slice(0, 7) // YYYY-MM
    if (!acc[monthKey]) {
      acc[monthKey] = []
    }
    acc[monthKey].push(request)
    return acc
  }, {} as Record<string, WorkRequest[]>)
}

/**
 * Group requests by date
 */
export function groupRequestsByDate(
  requests: WorkRequest[]
): Record<string, WorkRequest[]> {
  return requests.reduce((acc, request) => {
    const dateKey = request.request_date
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(request)
    return acc
  }, {} as Record<string, WorkRequest[]>)
}

// ============================================================================
// Action Permissions
// ============================================================================

/**
 * Check if request can be edited
 * Only pending requests by the employee can be edited
 */
export function canEditRequest(request: WorkRequest, userId: string): boolean {
  return request.status === 'pending' && request.employee_id === userId
}

/**
 * Check if request can be withdrawn
 * Only pending requests by the employee can be withdrawn
 */
export function canWithdrawRequest(request: WorkRequest, userId: string): boolean {
  return request.status === 'pending' && request.employee_id === userId
}

/**
 * Check if request can be deleted
 * Only admins can delete requests (any status)
 */
export function canDeleteRequest(userRole: string): boolean {
  return userRole === 'admin'
}

/**
 * Check if user can approve/reject requests
 */
export function canManageRequests(userRole: string): boolean {
  return userRole === 'manager' || userRole === 'admin'
}

/**
 * Check if request can be approved
 */
export function canApproveRequest(request: WorkRequest): boolean {
  return request.status === 'pending'
}

/**
 * Check if request can be rejected
 */
export function canRejectRequest(request: WorkRequest): boolean {
  return request.status === 'pending'
}
