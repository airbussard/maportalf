'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Menu } from 'lucide-react'
import { Sidebar } from './components/sidebar'
import Image from 'next/image'
import { NotificationBell } from '@/components/notification-bell'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>('employee')
  const [sidebarOpen, setSidebarOpen] = useState(false)
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

      // Get user role and check if active (both is_active and exit_date)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active, exit_date')
        .eq('id', user.id)
        .single()

      // Check if user is inactive (is_active = false OR exit_date in past/today)
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar role={userRole} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar (Mobile + User Info) */}
        <header className="sticky top-0 z-30 h-16 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="flex h-full items-center justify-between px-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Logo for Mobile */}
            <div className="lg:hidden">
              <Image
                src="/logo.png"
                alt="FLIGHTHOUR"
                width={150}
                height={40}
                className="h-8 w-auto"
              />
            </div>

            {/* User Info */}
            <div className="ml-auto flex items-center gap-2">
              {/* Notification Bell (Manager/Admin only) */}
              <NotificationBell role={userRole} />

              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user?.email}
              </span>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="container px-4 py-8">{children}</main>

        {/* Footer */}
        <footer className="border-t py-4 mt-auto">
          <div className="container px-4 text-center text-sm text-muted-foreground">
            FLIGHTHOUR Employee Portal | v2.145
          </div>
        </footer>
      </div>
    </div>
  )
}
