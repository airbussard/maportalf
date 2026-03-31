import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Clock, Mail, Phone, Settings } from 'lucide-react'
import { Breadcrumb } from '@/components/nextadmin'

interface AdminTile {
  href: string
  title: string
  description: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
}

const adminTiles: AdminTile[] = [
  {
    href: '/zeiterfassung/verwaltung',
    title: 'Zeiterfassung Verwaltung',
    description: 'Kategorien verwalten, Berichte erstellen und Zeiten genehmigen',
    icon: <Clock className="size-7" />,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
  },
  {
    href: '/admin/email-queue',
    title: 'E-Mail Warteschlange',
    description: 'E-Mail-Versand überwachen und fehlgeschlagene E-Mails verwalten',
    icon: <Mail className="size-7" />,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
  },
  {
    href: '/admin/sms-queue',
    title: 'SMS Warteschlange',
    description: 'SMS-Versand überwachen und fehlgeschlagene SMS verwalten',
    icon: <Phone className="size-7" />,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
  },
  {
    href: '/admin/cron-jobs',
    title: 'Cron Jobs',
    description: 'Hintergrund-Jobs manuell ausführen und überwachen',
    icon: <Settings className="size-7" />,
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
  },
]

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Breadcrumb pageName="Administration" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:gap-7.5">
        {adminTiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group rounded-[10px] bg-card p-6 shadow-1 transition-all duration-200 hover:shadow-card-2 dark:shadow-card"
          >
            <div className="flex items-start gap-4">
              <div className={`flex size-14 shrink-0 items-center justify-center rounded-full ${tile.iconBg} ${tile.iconColor}`}>
                {tile.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                  {tile.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tile.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
