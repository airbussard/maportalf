export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Ticket {
  id: string
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  assigned_to?: string | null
  created_by: string
  created_from_email?: string | null
  reply_to_email?: string | null
  ticket_number?: number | null
  is_spam?: boolean
  created_at: string
  updated_at: string
  // Joined data
  assigned_user?: {
    id: string
    first_name?: string
    last_name?: string
    email: string
  } | null
  creator?: {
    id: string
    first_name?: string
    last_name?: string
    email: string
  }
  tags?: Tag[]
}

export interface TicketMessage {
  id: string
  ticket_id: string
  content: string
  sender_id: string
  is_internal: boolean
  created_at: string
  // Joined data
  sender?: {
    id: string
    first_name?: string
    last_name?: string
    email: string
    is_active?: boolean
  }
  email_status?: {
    status: 'pending' | 'sending' | 'sent' | 'failed'
    sent_at?: string
    error_message?: string
    attempts?: number
    max_attempts?: number
  }
}

export interface TicketAttachment {
  id: string
  ticket_id: string
  message_id?: string | null
  filename: string
  original_filename: string
  mime_type: string
  size_bytes: number
  storage_path: string
  uploaded_by?: string | null
  is_inline?: boolean
  content_id?: string | null
  created_at: string
}

export interface Tag {
  id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

export interface TicketTag {
  ticket_id: string
  tag_id: string
  created_at: string
}

export interface TicketFilters {
  filter?: 'all' | 'assigned' | 'spam'
  status?: TicketStatus
  page?: number
  search?: string
  tags?: string[] // Array of tag IDs for filtering
  date_preset?: 'today' | 'week' | 'month' | 'custom' // Quick date filter presets
  created_from?: string // ISO date string for range start
  created_to?: string // ISO date string for range end
}
