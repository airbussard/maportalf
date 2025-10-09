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
  notes: string | null
  created_at: string
  updated_at: string
}

export interface EmployeeSettings {
  employee_id: string
  compensation_type: 'hourly' | 'salary'
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
