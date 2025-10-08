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
