// Database Types (based on Supabase schema)

export type UserRole = 'employee' | 'manager' | 'admin'

export type Profile = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: UserRole
  department: string | null
  phone: string | null
  address: string | null
  avatar_url: string | null
  is_active: boolean
  theme_preference: 'system' | 'light' | 'dark'
  email_signature: string | null
  use_custom_signature: boolean
  created_at: string
  updated_at: string
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export type Ticket = {
  id: string
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  assigned_to: string | null
  created_by: string
  created_from_email: string | null
  reply_to_email: string | null
  is_spam: boolean
  created_at: string
  updated_at: string
}

export type Document = {
  id: string
  title: string
  description: string | null
  category: string
  file_url: string
  file_size: number
  mime_type: string
  uploaded_by: string
  created_at: string
}

export type TimeEntry = {
  id: string
  user_id: string
  category: string | null
  start_time: string
  end_time: string | null
  duration_minutes: number | null
  notes: string | null
  is_running: boolean
  created_at: string
  updated_at: string
}

export type WorkRequest = {
  id: string
  user_id: string
  request_type: string
  request_date: string
  duration_hours: number | null
  description: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  admin_notes: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export type CancellationReason = 'cancelled_by_us' | 'cancelled_by_customer'

export type CalendarEvent = {
  id: string
  google_event_id: string | null
  event_type: 'booking' | 'fi_assignment' | 'blocker'
  title: string | null
  customer_first_name: string | null
  customer_last_name: string | null
  customer_email: string | null
  customer_phone: string | null
  start_time: string
  end_time: string
  duration: number | null
  attendee_count: number | null
  location: string | null
  remarks: string | null
  status: 'pending' | 'confirmed' | 'cancelled'
  sync_status: 'pending' | 'synced' | 'error'
  is_all_day: boolean
  assigned_instructor_id: string | null
  assigned_instructor_name: string | null
  assigned_instructor_number: string | null
  actual_work_start_time: string | null
  actual_work_end_time: string | null
  request_id: string | null
  has_video_recording: boolean
  on_site_payment_amount: number | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancellation_reason: CancellationReason | null
  created_at: string
  updated_at: string
}
