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
  Shield,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react'

export type NavSubItem = {
  title: string
  url: string
}

export type NavItem = {
  title: string
  icon: LucideIcon
  url?: string
  items: NavSubItem[]
  highlight?: boolean
}

export type NavSection = {
  label: string
  items: NavItem[]
}

const employeeItems: NavItem[] = [
  { title: 'Dashboard', icon: Home, url: '/dashboard', items: [] },
  { title: 'Zeiterfassung', icon: Clock, url: '/zeiterfassung', items: [] },
  { title: 'Meine Requests', icon: CalendarClock, url: '/requests', items: [] },
  { title: 'Dokumente', icon: FileText, url: '/dokumente', items: [] },
  { title: 'Einstellungen', icon: Settings, url: '/einstellungen', items: [] },
]

const managementItems: NavItem[] = [
  { title: 'Kalender', icon: Calendar, url: '/kalender', items: [] },
  { title: 'Absagen', icon: CalendarX2, url: '/cancellations', items: [] },
  { title: 'MAYDAY Center', icon: AlertTriangle, url: '/mayday-center', items: [], highlight: true },
  {
    title: 'Tickets',
    icon: Ticket,
    items: [
      { title: 'Alle Tickets', url: '/tickets' },
      { title: 'Statistiken', url: '/tickets/stats' },
    ],
  },
  { title: 'Mitarbeiter', icon: Users, url: '/mitarbeiter', items: [] },
  { title: 'Kontaktbuch', icon: BookUser, url: '/kontaktbuch', items: [] },
  { title: 'Requests verwalten', icon: CalendarCheck, url: '/requests/manage', items: [] },
  { title: 'Tags', icon: Tag, url: '/tags', items: [] },
  { title: 'Vorlagen', icon: ScrollText, url: '/templates', items: [] },
]

const adminItems: NavItem[] = [
  { title: 'Administration', icon: Shield, url: '/admin', items: [] },
  { title: 'ZE Verwaltung', icon: ClipboardList, url: '/zeiterfassung/verwaltung', items: [] },
]

export function getNavData(role: string): NavSection[] {
  const isManager = role === 'manager' || role === 'admin'
  const isAdmin = role === 'admin'

  const sections: NavSection[] = [
    { label: 'Mein Bereich', items: employeeItems },
  ]

  if (isManager) {
    sections.push({ label: 'Verwaltung', items: managementItems })
  }

  if (isAdmin) {
    sections.push({ label: 'Admin', items: adminItems })
  }

  return sections
}
