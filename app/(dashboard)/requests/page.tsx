/**
 * Work Requests Page (Employee View)
 *
 * Main page for employees to manage their work requests
 * Features: List/Calendar views, Create/Edit dialogs, ICS export
 */

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyWorkRequests } from '@/app/actions/work-requests'
import { RequestsContent } from './requests-content'

export const metadata = {
  title: 'Meine Requests | Flighthour',
  description: 'Arbeitstage verwalten und beantragen'
}

async function RequestsPageContent() {
  // Check authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile for name
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  const userName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : user.email || 'Unbekannt'

  // Load user's requests
  const requests = await getMyWorkRequests()

  return <RequestsContent requests={requests} userId={user.id} userName={userName} />
}

export default function RequestsPage() {
  return (
    <Suspense fallback={<RequestsPageSkeleton />}>
      <RequestsPageContent />
    </Suspense>
  )
}

function RequestsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </div>
      <div className="h-10 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}
