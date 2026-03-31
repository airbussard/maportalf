'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationBell } from '@/components/notification-bell'
import { createClient } from '@/lib/supabase/client'
import { useSidebarContext } from './sidebar/sidebar-context'

interface DashboardTopHeaderProps {
  role: string
  userEmail?: string
}

export function DashboardTopHeader({ role, userEmail }: DashboardTopHeaderProps) {
  const router = useRouter()
  const { toggleSidebar, isMobile } = useSidebarContext()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {isMobile && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSidebar}
              className="shrink-0"
            >
              <Menu className="size-5" />
              <span className="sr-only">Menü öffnen</span>
            </Button>

            <Link href="/dashboard" className="shrink-0">
              <Image
                src="/logo.png"
                alt="FLIGHTHOUR"
                width={120}
                height={30}
                className="h-6 w-auto"
              />
            </Link>
          </>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationBell role={role} />

        <div className="hidden h-6 w-px bg-border mx-1 sm:block" />

        <span className="hidden text-sm text-muted-foreground max-w-[160px] truncate sm:inline">
          {userEmail}
        </span>

        <div className="w-8 h-8 rounded-full bg-[#fbb928] flex items-center justify-center text-zinc-900 font-semibold text-sm shrink-0">
          {userEmail?.charAt(0).toUpperCase()}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="text-muted-foreground hover:text-foreground"
          title="Abmelden"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
