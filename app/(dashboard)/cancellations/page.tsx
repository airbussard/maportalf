import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCancelledEvents } from '@/app/actions/calendar-events'
import { CancellationsTable } from './components/cancellations-table'
import { CalendarX2 } from 'lucide-react'

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
          <CalendarX2 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Abgesagte Termine</h1>
          <p className="text-muted-foreground">
            Übersicht aller abgesagten Termine mit Optionen zum Neuplanen oder endgültigen Löschen
          </p>
        </div>
      </div>

      {/* Content */}
      <CancellationsTable events={events || []} />
    </div>
  )
}
