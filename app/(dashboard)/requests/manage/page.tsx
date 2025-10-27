/**
 * Work Requests Management Page (Manager/Admin View)
 *
 * Page for managers and admins to manage all work requests
 */

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAllWorkRequests, getWorkRequestStats } from '@/app/actions/work-requests'
import { ManageContent } from './manage-content'

export const metadata = {
  title: 'Requests verwalten | Flighthour',
  description: 'Work Requests genehmigen und verwalten'
}

async function ManagePageContent() {
  // Check authentication
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

  const isManager = profile?.role === 'manager'
  const isAdmin = profile?.role === 'admin'

  if (!isManager && !isAdmin) {
    redirect('/requests')
  }

  // Load all requests and stats
  const [requests, stats] = await Promise.all([
    getAllWorkRequests(),
    getWorkRequestStats()
  ])

  // Load all employees for name display (using admin client)
  const adminSupabase = createAdminClient()
  const { data: employees } = await adminSupabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .eq('is_active', true)
    .order('first_name', { ascending: true })

  return (
    <ManageContent
      requests={requests}
      stats={stats}
      employees={employees || []}
      isAdmin={isAdmin}
      userId={user.id}
    />
  )
}

export default function ManagePage() {
  return (
    <Suspense fallback={<ManagePageSkeleton />}>
      <ManagePageContent />
    </Suspense>
  )
}

function ManagePageSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-10 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"
          />
        ))}
      </div>
      <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
    </div>
  )
}
