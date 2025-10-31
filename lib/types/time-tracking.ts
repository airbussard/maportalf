// Time Tracking Types

export interface TimeCategory {
  id: string
  name: string
  description: string | null
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TimeEntry {
  id: string
  employee_id: string
  category_id: string | null
  date: string
  start_time: string | null
  end_time: string | null
  duration_minutes: number
  description: string | null
  is_approved: boolean
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  category?: TimeCategory
}

export interface TimeReport {
  id: string
  employee_id: string
  year: number
  month: number
  total_minutes: number
  total_hours: number
  is_closed: boolean
  closed_by: string | null
  closed_at: string | null
  evaluation_count: number
  bonus_amount: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface EmployeeSettings {
  employee_id: string
  compensation_type: 'hourly' | 'salary' | 'combined'
  hourly_rate: number | null
  monthly_salary: number | null
  currency: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface TimeEntryFormData {
  date: string
  start_time?: string
  end_time?: string
  duration_minutes: number
  category_id?: string
  description?: string
}

export interface MonthlyStats {
  total_minutes: number
  total_hours: number
  days_worked: number
  average_per_day: number
  entries_count: number
}

export interface TimeReportRecipient {
  id: string
  email: string
  name: string | null
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface EmployeeReportData {
  employee_id: string
  employee_name: string
  employee_email: string
  work_days: number
  total_hours: number
  hourly_rate: number
  interim_salary: number
  bonus_amount: number
  evaluation_count: number
  provision: number
  total_salary: number
}

export interface MonthlyReportData {
  year: number
  month: number
  month_name: string
  employees: EmployeeReportData[]
  totals: {
    total_days: number
    total_hours: number
    total_interim: number
    total_evaluations: number
    total_provision: number
    total_salary: number
  }
}

export interface EmailReportData {
  recipients: string[]
  subject: string
  body: string
  save_recipients: boolean
}
