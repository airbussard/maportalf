export interface TimesheetEntry {
  id: string
  employee_id: string
  year: number
  month: number
  date: string // YYYY-MM-DD

  // Kalenderbasiert
  calendar_minutes: number
  calendar_booking_count: number
  fi_shift_minutes: number

  // Anpassungen
  adjusted_minutes: number | null
  adjustment_reason: string | null
  adjusted_at: string | null
  adjusted_by: string | null

  // Manuelle Einträge
  manual_minutes: number
  manual_description: string | null

  // Metadaten
  booking_details: BookingDetail[]
  created_at: string
  updated_at: string
}

export interface BookingDetail {
  id: string
  title: string
  start: string
  end: string
  duration_min: number
  customer_name?: string
}

export interface TimesheetDaySummary extends TimesheetEntry {
  effective_minutes: number // COALESCE(adjusted, calendar) + manual
  is_adjusted: boolean
  has_manual: boolean
}

export interface TimesheetMonthSummary {
  employee_id: string
  employee_name: string
  employee_email: string
  employee_number: string | null
  year: number
  month: number

  // Stunden
  total_calendar_minutes: number
  total_manual_minutes: number
  total_adjusted_minutes: number
  total_effective_minutes: number
  total_effective_hours: number
  work_days: number
  total_bookings: number
  idle_minutes: number // Differenz Schicht vs. Buchungen

  // Vergütung
  compensation_type: 'hourly' | 'salary' | 'combined' | null
  hourly_rate: number | null
  monthly_salary: number | null
  hourly_pay: number        // Stunden × Stundenlohn
  fixed_pay: number         // Fixgehalt
  bonus_amount: number      // Einmaliger Zusatzbetrag
  total_pay: number         // hourly_pay + fixed_pay + bonus
  fictional_hours: number   // total_pay / hourly_rate
  hourly_rate_fallback: boolean // true wenn 20€ Fallback

  // Status
  is_confirmed: boolean     // Bestätigt durch MA
  confirmed_at: string | null
  is_closed: boolean        // Geschlossen durch Admin
  closed_at: string | null
}

export interface TimesheetAdminOverview {
  year: number
  month: number
  month_name: string
  employees: TimesheetMonthSummary[]
  totals: {
    total_hours: number
    total_days: number
    total_bookings: number
    total_hourly_pay: number
    total_fixed_pay: number
    total_pay: number
  }
}
