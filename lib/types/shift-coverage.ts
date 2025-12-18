// Types für das Shift Coverage Request System

export type ShiftCoverageStatus = 'open' | 'accepted' | 'cancelled' | 'expired'

export interface ShiftCoverageRequest {
  id: string
  request_date: string // YYYY-MM-DD
  is_full_day: boolean
  start_time: string | null // HH:MM:SS
  end_time: string | null
  reason: string | null
  status: ShiftCoverageStatus
  created_by: string
  accepted_by: string | null
  accepted_at: string | null
  work_request_id: string | null
  created_at: string
  updated_at: string
  expires_at: string
}

export interface ShiftCoverageNotification {
  id: string
  coverage_request_id: string
  employee_id: string
  email_sent: boolean
  email_sent_at: string | null
  sms_sent: boolean
  sms_sent_at: string | null
  accept_token: string
  token_used: boolean
  token_used_at: string | null
  created_at: string
}

// Mit Relations für UI
export interface ShiftCoverageRequestWithRelations extends ShiftCoverageRequest {
  creator?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
  }
  acceptor?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
  }
  notifications?: ShiftCoverageNotificationWithEmployee[]
}

export interface ShiftCoverageNotificationWithEmployee extends ShiftCoverageNotification {
  employee?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
    phone?: string | null
  }
}

// Mitarbeiter für Coverage Dialog (von calendar-view geladen)
export interface CoverageEmployee {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
}

// Input für Erstellung
export interface CreateShiftCoverageInput {
  request_date: string // YYYY-MM-DD
  is_full_day: boolean
  start_time?: string // HH:MM
  end_time?: string
  reason?: string
  employee_ids: string[] // Welche Mitarbeiter benachrichtigt werden
  send_email: boolean
  send_sms: boolean
}

// Für Token-Validierung
export interface TokenValidationResult {
  valid: boolean
  status: 'valid' | 'already_accepted' | 'expired' | 'invalid' | 'cancelled'
  coverageRequest?: ShiftCoverageRequestWithRelations
  notification?: ShiftCoverageNotificationWithEmployee
  acceptorName?: string // Name des Mitarbeiters der bereits angenommen hat
}

// Für API Response
export interface AcceptCoverageResult {
  success: boolean
  message: string
  workRequestId?: string
  alreadyAccepted?: boolean
  acceptorName?: string
}

// Helper Functions
export function getStatusLabel(status: ShiftCoverageStatus): string {
  const labels: Record<ShiftCoverageStatus, string> = {
    open: 'Offen',
    accepted: 'Angenommen',
    cancelled: 'Storniert',
    expired: 'Abgelaufen'
  }
  return labels[status]
}

export function getStatusColor(status: ShiftCoverageStatus): string {
  const colors: Record<ShiftCoverageStatus, string> = {
    open: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
    expired: 'bg-red-100 text-red-800'
  }
  return colors[status]
}

export function formatCoverageDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export function formatCoverageTime(request: ShiftCoverageRequest): string {
  if (request.is_full_day) {
    return 'Ganztägig'
  }
  if (request.start_time && request.end_time) {
    const start = request.start_time.substring(0, 5) // HH:MM
    const end = request.end_time.substring(0, 5)
    return `${start} - ${end} Uhr`
  }
  return 'Ganztägig'
}

export function isExpired(request: ShiftCoverageRequest): boolean {
  return new Date(request.expires_at) < new Date()
}

export function getEmployeeName(employee: { first_name: string | null; last_name: string | null } | undefined): string {
  if (!employee) return 'Unbekannt'
  const parts = [employee.first_name, employee.last_name].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Unbekannt'
}
