import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmailQueueTable } from './components/email-queue-table'

export default async function EmailQueuePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Fetch email queue
  const { data: emailQueue } = await supabase
    .from('email_queue')
    .select(`
      *,
      ticket:tickets(
        id,
        ticket_number,
        subject
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">E-Mail Warteschlange</h1>
        <p className="text-muted-foreground mt-1">
          Überwachung und Verwaltung der E-Mail-Versand-Queue
        </p>
      </div>

      <EmailQueueTable emails={emailQueue || []} />
    </div>
  )
}
