import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EventDetail } from './event-detail'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch the event
  const { data: event, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !event) redirect('/kalender')

  // Fetch employees for FI assignment dropdown
  const { data: employees } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, employee_number')
    .eq('is_active', true)
    .order('last_name')

  return <EventDetail event={event} employees={employees || []} />
}
