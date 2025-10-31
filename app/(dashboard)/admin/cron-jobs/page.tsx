import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CronJobsContent } from './cron-jobs-content'

export const metadata = {
  title: 'Cron Jobs | Flighthour',
  description: 'Manuelle Verwaltung und Ausführung von Cron Jobs'
}

export default async function CronJobsPage() {
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

  return (
    <div className="container mx-auto py-8 px-4">
      <CronJobsContent />
    </div>
  )
}
