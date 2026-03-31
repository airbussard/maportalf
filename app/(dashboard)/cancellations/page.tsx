import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCancelledEvents } from '@/app/actions/calendar-events'
import { CancellationsTable } from './components/cancellations-table'
import { Breadcrumb } from '@/components/nextadmin'

export default async function CancellationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['manager', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const result = await getCancelledEvents()
  const events = result.success ? result.data : []

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-7.5">
      <Breadcrumb pageName="Absagen" />

      {/* Content */}
      <CancellationsTable events={events || []} />
    </div>
  )
}
