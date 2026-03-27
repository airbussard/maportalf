'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DashboardHeader } from './components/dashboard-header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>('employee')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active, exit_date')
        .eq('id', user.id)
        .single()

      if (profile) {
        const isInactive = profile.is_active === false ||
          (profile.exit_date && new Date(profile.exit_date) <= new Date())

        if (isInactive) {
          await supabase.auth.signOut()
          router.push('/login?error=account_deactivated')
          return
        }
      }

      setUser(user)
      setUserRole(profile?.role || 'employee')
      setLoading(false)
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fbb928]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader role={userRole} userEmail={user?.email} />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>

      <footer className="border-t py-4 mt-auto">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
          Made with <span className="text-red-500">&#10084;</span> by getemergence.com / Oscar Knabe
        </div>
      </footer>
    </div>
  )
}
