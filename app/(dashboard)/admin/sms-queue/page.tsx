import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Breadcrumb } from '@/components/nextadmin'
import { SMSQueueTable } from './components/sms-queue-table'

export default async function SMSQueuePage() {
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

  // Fetch SMS queue using admin client
  const adminSupabase = createAdminClient()
  const { data: smsQueue } = await adminSupabase
    .from('sms_queue')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="container mx-auto py-8 px-4">
      <Breadcrumb pageName="SMS Queue" items={[{ label: "Admin", href: "/admin" }]} />

      <SMSQueueTable smsItems={smsQueue || []} />
    </div>
  )
}
