import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Clock, Mail, Phone, Settings, Shield } from 'lucide-react'

interface AdminTile {
  href: string
  title: string
  description: string
  icon: React.ReactNode
}

const adminTiles: AdminTile[] = [
  {
    href: '/zeiterfassung/verwaltung',
    title: 'Zeiterfassung Verwaltung',
    description: 'Kategorien verwalten, Berichte erstellen und Zeiten genehmigen',
    icon: <Clock className="w-8 h-8" />,
  },
  {
    href: '/admin/email-queue',
    title: 'E-Mail Warteschlange',
    description: 'E-Mail-Versand überwachen und fehlgeschlagene E-Mails verwalten',
    icon: <Mail className="w-8 h-8" />,
  },
  {
    href: '/admin/sms-queue',
    title: 'SMS Warteschlange',
    description: 'SMS-Versand überwachen und fehlgeschlagene SMS verwalten',
    icon: <Phone className="w-8 h-8" />,
  },
  {
    href: '/admin/cron-jobs',
    title: 'Cron Jobs',
    description: 'Hintergrund-Jobs manuell ausführen und überwachen',
    icon: <Settings className="w-8 h-8" />,
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
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Administration</h1>
        </div>
        <p className="text-muted-foreground mt-2">
          System-Verwaltung und Überwachung
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {adminTiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group block p-6 bg-card border border-border rounded-lg hover:border-primary hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {tile.icon}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
                  {tile.title}
                </h2>
                <p className="text-muted-foreground mt-1">
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
