'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Home,
  Ticket,
  Clock,
  Settings,
  Users,
  Tag,
  Mail,
  X,
  CalendarClock,
  CalendarCheck,
  Calendar,
  BarChart3,
  LogOut,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  role: string
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

interface NavGroup {
  title: string
  items: NavItem[]
  roles: string[] // Which roles can see this group
}

export function Sidebar({ role, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navGroups: NavGroup[] = [
    {
      title: 'MITARBEITER',
      roles: ['employee', 'manager', 'admin'],
      items: [
        {
          href: '/dashboard',
          label: 'Dashboard',
          icon: <Home className="w-5 h-5" />,
        },
        {
          href: '/zeiterfassung',
          label: 'Zeiterfassung',
          icon: <Clock className="w-5 h-5" />,
        },
        {
          href: '/requests',
          label: 'Meine Requests',
          icon: <CalendarClock className="w-5 h-5" />,
        },
        {
          href: '/dokumente',
          label: 'Dokumente',
          icon: <FileText className="w-5 h-5" />,
        },
        {
          href: '/einstellungen',
          label: 'Einstellungen',
          icon: <Settings className="w-5 h-5" />,
        },
      ],
    },
    {
      title: 'MANAGER',
      roles: ['manager', 'admin'],
      items: [
        {
          href: '/kalender',
          label: 'Kalender',
          icon: <Calendar className="w-5 h-5" />,
        },
        {
          href: '/tickets',
          label: 'Tickets',
          icon: <Ticket className="w-5 h-5" />,
        },
        {
          href: '/tags',
          label: 'Tags',
          icon: <Tag className="w-5 h-5" />,
        },
        {
          href: '/mitarbeiter',
          label: 'Mitarbeiter',
          icon: <Users className="w-5 h-5" />,
        },
        {
          href: '/requests/manage',
          label: 'Requests verwalten',
          icon: <CalendarCheck className="w-5 h-5" />,
        },
        {
          href: '/tickets/stats',
          label: 'Statistiken',
          icon: <BarChart3 className="w-5 h-5" />,
        },
      ],
    },
    {
      title: 'ADMINISTRATOR',
      roles: ['admin'],
      items: [
        {
          href: '/zeiterfassung/verwaltung',
          label: 'Zeiterfassung Verwaltung',
          icon: <Clock className="w-5 h-5" />,
        },
        {
          href: '/admin/email-queue',
          label: 'E-Mail Warteschlange',
          icon: <Mail className="w-5 h-5" />,
        },
        {
          href: '/admin/cron-jobs',
          label: 'Cron Jobs',
          icon: <Settings className="w-5 h-5" />,
        },
      ],
    },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  // Filter groups based on user role
  const visibleGroups = navGroups.filter((group) => group.roles.includes(role))

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 bg-card border-r border-border transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={onClose}>
            <Image
              src="/logo.png"
              alt="FLIGHTHOUR"
              width={150}
              height={40}
              className="h-8 w-auto"
            />
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {visibleGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Group Title */}
              <div className="px-3 mb-2">
                <p className="text-xs font-semibold text-muted-foreground tracking-wider">
                  {group.title}
                </p>
              </div>

              {/* Group Items */}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive(item.href)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-3">
          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Abmelden</span>
          </Button>

          {/* Version */}
          <p className="text-xs text-center text-muted-foreground">
            Version 2.055
          </p>
        </div>
      </aside>
    </>
  )
}
