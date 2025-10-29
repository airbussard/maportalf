import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTicketStats } from '@/app/actions/ticket-stats'
import { StatsContent } from './stats-content'

export const metadata = {
  title: 'Ticket-Statistiken | Flighthour',
  description: 'Umfassende Analysen und Statistiken des Ticket-Systems'
}

export default async function TicketStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is manager or admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'admin'

  if (!isManagerOrAdmin) {
    redirect('/tickets')
  }

  // Get statistics
  const timeRange = (resolvedSearchParams.range as any) || 'month'
  const stats = await getTicketStats(timeRange)

  return (
    <div className="container mx-auto py-8 px-4">
      <StatsContent stats={stats} initialTimeRange={timeRange} />
    </div>
  )
}
