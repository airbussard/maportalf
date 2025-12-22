'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface Contact {
  email: string
  first_name: string
  last_name: string
  phone: string | null
  last_event: string
  event_count: number
}

export interface ContactDetail {
  email: string
  first_name: string
  last_name: string
  phone: string | null
  events: ContactEvent[]
  tickets: ContactTicket[]
}

export interface ContactEvent {
  id: string
  start_time: string
  end_time: string
  status: string
  event_type: string
  location: string
}

export interface ContactTicket {
  id: string
  subject: string
  status: string
  created_at: string
}

/**
 * Check if user is manager or admin
 */
async function checkManagerAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['manager', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  return supabase
}

/**
 * Get all unique contacts from calendar_events
 * Grouped by email with aggregated data
 */
export async function getContacts(search?: string): Promise<Contact[]> {
  const supabase = await checkManagerAccess()

  // Get all events with customer email
  let query = supabase
    .from('calendar_events')
    .select('customer_email, customer_first_name, customer_last_name, customer_phone, start_time')
    .not('customer_email', 'is', null)
    .neq('customer_email', '')
    .order('start_time', { ascending: false })

  const { data: events, error } = await query

  if (error) {
    console.error('Error fetching contacts:', error)
    return []
  }

  // Group by email and aggregate
  const contactMap = new Map<string, Contact>()

  for (const event of events || []) {
    const email = event.customer_email?.toLowerCase().trim()
    if (!email) continue

    const existing = contactMap.get(email)
    if (existing) {
      existing.event_count++
      // Update name/phone if we have better data
      if (!existing.first_name && event.customer_first_name) {
        existing.first_name = event.customer_first_name
      }
      if (!existing.last_name && event.customer_last_name) {
        existing.last_name = event.customer_last_name
      }
      if (!existing.phone && event.customer_phone) {
        existing.phone = event.customer_phone
      }
    } else {
      contactMap.set(email, {
        email,
        first_name: event.customer_first_name || '',
        last_name: event.customer_last_name || '',
        phone: event.customer_phone || null,
        last_event: event.start_time,
        event_count: 1
      })
    }
  }

  let contacts = Array.from(contactMap.values())

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase()
    contacts = contacts.filter(c =>
      c.email.toLowerCase().includes(searchLower) ||
      c.first_name.toLowerCase().includes(searchLower) ||
      c.last_name.toLowerCase().includes(searchLower) ||
      (c.phone && c.phone.includes(search))
    )
  }

  // Sort by last event date (most recent first)
  contacts.sort((a, b) => new Date(b.last_event).getTime() - new Date(a.last_event).getTime())

  return contacts
}

/**
 * Get contact detail with events and tickets
 */
export async function getContact(email: string): Promise<ContactDetail | null> {
  const supabase = await checkManagerAccess()
  const emailLower = email.toLowerCase().trim()

  // Get events for this customer
  const { data: events, error: eventsError } = await supabase
    .from('calendar_events')
    .select('id, customer_first_name, customer_last_name, customer_phone, start_time, end_time, status, event_type, location')
    .ilike('customer_email', emailLower)
    .order('start_time', { ascending: false })

  if (eventsError) {
    console.error('Error fetching contact events:', eventsError)
    return null
  }

  if (!events || events.length === 0) {
    return null
  }

  // Get the most recent name/phone from events
  const latestEvent = events[0]

  // Get tickets for this email (created_from_email or reply_to_email)
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('id, subject, status, created_at')
    .or(`created_from_email.ilike.${emailLower},reply_to_email.ilike.${emailLower}`)
    .order('created_at', { ascending: false })

  if (ticketsError) {
    console.error('Error fetching contact tickets:', ticketsError)
  }

  return {
    email: emailLower,
    first_name: latestEvent.customer_first_name || '',
    last_name: latestEvent.customer_last_name || '',
    phone: latestEvent.customer_phone || null,
    events: events.map(e => ({
      id: e.id,
      start_time: e.start_time,
      end_time: e.end_time,
      status: e.status,
      event_type: e.event_type || 'booking',
      location: e.location
    })),
    tickets: (tickets || []).map(t => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      created_at: t.created_at
    }))
  }
}
