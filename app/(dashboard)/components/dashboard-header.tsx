'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon'
import { NotificationBell } from '@/components/notification-bell'
import { ThemeToggle } from '@/components/theme-toggle'
import { createClient } from '@/lib/supabase/client'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { LucideIcon } from 'lucide-react'
import {
  Home,
  Clock,
  CalendarClock,
  FileText,
  Settings,
  Calendar,
  CalendarX2,
  AlertTriangle,
  Ticket,
  Tag,
  Users,
  BookUser,
  CalendarCheck,
  BarChart3,
  ScrollText,
  LogOut,
  Shield,
} from 'lucide-react'

type LinkItem = {
  title: string
  href: string
  icon: LucideIcon
  description?: string
  highlight?: boolean
}

interface DashboardHeaderProps {
  role: string
  userEmail?: string
}

export function DashboardHeader({ role, userEmail }: DashboardHeaderProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [navValue, setNavValue] = React.useState('')
  const pathname = usePathname()
  const router = useRouter()
  const scrolled = useScroll(10)

  const isManager = role === 'manager' || role === 'admin'
  const isAdmin = role === 'admin'

  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileOpen(false)
    setNavValue('')
  }, [pathname])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  // Close desktop dropdown on link click
  const closeNav = () => setNavValue('')

  return (
    <header
      className={cn('sticky top-0 z-50 w-full border-b', {
        'bg-background/95 supports-[backdrop-filter]:bg-background/50 border-border backdrop-blur-lg': scrolled,
        'bg-background border-border': !scrolled,
      })}
    >
      <nav className="mx-auto flex h-14 w-full max-w-screen-2xl items-center justify-between px-4 md:px-6 2xl:px-10">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="hover:opacity-80 transition-opacity shrink-0">
            <Image src="/logo.png" alt="FLIGHTHOUR" width={140} height={35} className="h-7 w-auto" priority />
          </Link>

          {/* Desktop Navigation */}
          <NavigationMenu value={navValue} onValueChange={setNavValue} className="hidden lg:flex">
            <NavigationMenuList>
              {/* Dashboard - direct link */}
              <NavigationMenuItem value="__dashboard_link">
                <Link
                  href="/dashboard"
                  className={cn(
                    'inline-flex h-9 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                    isActive('/dashboard') && 'bg-accent text-accent-foreground'
                  )}
                >
                  <Home className="mr-1.5 h-4 w-4" />
                  Dashboard
                </Link>
              </NavigationMenuItem>

              {/* Mein Bereich dropdown */}
              <NavigationMenuItem value="mein-bereich">
                <NavigationMenuTrigger className="bg-transparent">Mein Bereich</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-80 gap-1 p-2">
                    {employeeLinks.map((item) => (
                      <li key={item.href}>
                        <DesktopNavItem {...item} active={isActive(item.href)} onClick={closeNav} />
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Verwaltung dropdown (Manager/Admin) */}
              {isManager && (
                <NavigationMenuItem value="verwaltung">
                  <NavigationMenuTrigger className="bg-transparent">Verwaltung</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[36rem] grid-cols-2 gap-2 p-2">
                      <ul className="space-y-1">
                        {managementLinks.map((item) => (
                          <li key={item.href}>
                            <DesktopNavItem {...item} active={isActive(item.href)} onClick={closeNav} />
                          </li>
                        ))}
                      </ul>
                      <ul className="space-y-1">
                        {managementLinks2.map((item) => (
                          <li key={item.href}>
                            <DesktopNavItemCompact {...item} active={isActive(item.href)} onClick={closeNav} />
                          </li>
                        ))}
                        {isAdmin && (
                          <li>
                            <DesktopNavItemCompact
                              title="Administration"
                              href="/admin"
                              icon={Shield}
                              active={isActive('/admin')}
                              onClick={closeNav}
                            />
                          </li>
                        )}
                      </ul>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              )}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Right: Actions (Desktop) */}
        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <NotificationBell role={role} />
          <div className="h-6 w-px bg-border mx-1" />
          <span className="text-sm text-muted-foreground max-w-[160px] truncate">
            {userEmail}
          </span>
          <div className="w-8 h-8 rounded-full bg-[#fbb928] flex items-center justify-center text-zinc-900 font-semibold text-sm">
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

        {/* Mobile: actions + hamburger */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <NotificationBell role={role} />
          <Button
            size="icon"
            variant="outline"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label="Menü öffnen"
          >
            <MenuToggleIcon open={mobileOpen} className="size-5" duration={300} />
          </Button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <MobileMenu open={mobileOpen}>
        <div className="flex flex-col justify-between h-full">
          <div className="flex-1 overflow-y-auto space-y-1">
            {/* User info */}
            <div className="flex items-center gap-3 p-3 mb-3 rounded-lg bg-muted/50">
              <div className="w-10 h-10 rounded-full bg-[#fbb928] flex items-center justify-center text-zinc-900 font-bold shrink-0">
                {userEmail?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{userEmail}</p>
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
              </div>
            </div>

            <MobileNavItem title="Dashboard" href="/dashboard" icon={Home} active={isActive('/dashboard')} />

            <MobileSectionLabel>Mein Bereich</MobileSectionLabel>
            {employeeLinks.map((link) => (
              <MobileNavItem key={link.href} {...link} active={isActive(link.href)} />
            ))}

            {isManager && (
              <>
                <MobileSectionLabel>Verwaltung</MobileSectionLabel>
                {managementLinks.map((link) => (
                  <MobileNavItem key={link.href} {...link} active={isActive(link.href)} />
                ))}
                {managementLinks2.map((link) => (
                  <MobileNavItem key={link.href} {...link} active={isActive(link.href)} />
                ))}
              </>
            )}

            {isAdmin && (
              <>
                <MobileSectionLabel>Admin</MobileSectionLabel>
                <MobileNavItem title="Administration" href="/admin" icon={Shield} active={isActive('/admin')} />
              </>
            )}
          </div>

          <div className="border-t pt-4 mt-4 shrink-0">
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Abmelden
            </Button>
            <p className="text-[10px] text-muted-foreground text-center mt-2">Version 2.234</p>
          </div>
        </div>
      </MobileMenu>
    </header>
  )
}

// ─── Mobile Menu Portal ───

function MobileMenu({ open, children }: { open: boolean; children: React.ReactNode }) {
  if (!open || typeof window === 'undefined') return null

  return createPortal(
    <div className="bg-background fixed top-14 right-0 bottom-0 left-0 z-40 border-t lg:hidden">
      <div className="size-full p-4">{children}</div>
    </div>,
    document.body,
  )
}

// ─── Mobile Nav Components (plain links, no Radix) ───

function MobileSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground tracking-wider px-2 pt-4 pb-1">
      {children}
    </p>
  )
}

function MobileNavItem({ title, href, icon: Icon, active, highlight }: LinkItem & { active?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        highlight && 'text-red-500',
        active && !highlight && 'bg-accent text-accent-foreground',
        active && highlight && 'bg-red-100 dark:bg-red-950/50 text-red-600',
        !active && !highlight && 'text-foreground hover:bg-accent',
        !active && highlight && 'hover:bg-red-50 dark:hover:bg-red-950/30',
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', highlight ? 'text-red-500' : '')} />
      {title}
    </Link>
  )
}

// ─── Desktop Nav Items ───

function DesktopNavItem({ title, description, icon: Icon, href, active, highlight, onClick }: LinkItem & { active?: boolean; onClick?: () => void }) {
  return (
    <NavigationMenuLink asChild>
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          'flex w-full items-center gap-3 rounded-md p-2.5 transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          highlight && 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30',
          active && !highlight && 'bg-accent text-accent-foreground',
          active && highlight && 'bg-red-100 dark:bg-red-950/50',
        )}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background shadow-sm">
          <Icon className={cn('size-4', highlight ? 'text-red-500' : 'text-foreground')} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium leading-tight">{title}</span>
          {description && <span className="text-xs text-muted-foreground">{description}</span>}
        </div>
      </Link>
    </NavigationMenuLink>
  )
}

function DesktopNavItemCompact({ title, icon: Icon, href, active, highlight, onClick }: LinkItem & { active?: boolean; onClick?: () => void }) {
  return (
    <NavigationMenuLink asChild>
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          'flex items-center gap-2.5 rounded-md p-2.5 text-sm font-medium transition-colors hover:bg-accent',
          highlight && 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30',
          active && !highlight && 'bg-accent',
          active && highlight && 'bg-red-100 dark:bg-red-950/50',
        )}
      >
        <Icon className={cn('size-4 shrink-0', highlight ? 'text-red-500' : 'text-foreground')} />
        {title}
      </Link>
    </NavigationMenuLink>
  )
}

// ─── Link Data ───

const employeeLinks: LinkItem[] = [
  { title: 'Zeiterfassung', href: '/zeiterfassung', icon: Clock, description: 'Arbeitszeiten erfassen & verwalten' },
  { title: 'Meine Requests', href: '/requests', icon: CalendarClock, description: 'Arbeitsanfragen & Schichtwünsche' },
  { title: 'Dokumente', href: '/dokumente', icon: FileText, description: 'Dateien & Unterlagen einsehen' },
  { title: 'Einstellungen', href: '/einstellungen', icon: Settings, description: 'Profil & Präferenzen' },
]

const managementLinks: LinkItem[] = [
  { title: 'Kalender', href: '/kalender', icon: Calendar, description: 'Termine & Buchungen verwalten' },
  { title: 'Absagen', href: '/cancellations', icon: CalendarX2, description: 'Stornierungen & Ausfälle' },
  { title: 'MAYDAY Center', href: '/mayday-center', icon: AlertTriangle, description: 'Notfall-Management', highlight: true },
  { title: 'Tickets', href: '/tickets', icon: Ticket, description: 'Support-Anfragen bearbeiten' },
  { title: 'Mitarbeiter', href: '/mitarbeiter', icon: Users, description: 'Team & Personal verwalten' },
]

const managementLinks2: LinkItem[] = [
  { title: 'Kontaktbuch', href: '/kontaktbuch', icon: BookUser },
  { title: 'Requests verwalten', href: '/requests/manage', icon: CalendarCheck },
  { title: 'Tags', href: '/tags', icon: Tag },
  { title: 'Statistiken', href: '/tickets/stats', icon: BarChart3 },
  { title: 'Vorlagen', href: '/templates', icon: ScrollText },
]

// ─── Scroll Hook ───

function useScroll(threshold: number) {
  const [scrolled, setScrolled] = React.useState(false)
  const onScroll = React.useCallback(() => setScrolled(window.scrollY > threshold), [threshold])

  React.useEffect(() => {
    window.addEventListener('scroll', onScroll)
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [onScroll])

  return scrolled
}
