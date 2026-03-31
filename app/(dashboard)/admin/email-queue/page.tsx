import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Breadcrumb } from '@/components/nextadmin'
import { EmailQueueTable } from './components/email-queue-table'

export default async function EmailQueuePage() {
  // Use regular client for auth check
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

  // Fetch email queue using admin client to bypass RLS on tickets table
  // This allows admins to see ALL emails, not just emails from tickets they created/are assigned to
  const adminSupabase = createAdminClient()
  const { data: emailQueue } = await adminSupabase
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
      <Breadcrumb pageName="E-Mail Queue" items={[{ label: "Admin", href: "/admin" }]} />

      <EmailQueueTable emails={emailQueue || []} />
    </div>
  )
}
