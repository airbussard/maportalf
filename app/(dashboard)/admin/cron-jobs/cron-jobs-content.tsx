'use client'

import { Settings, Mail, Calendar, RefreshCw, Database } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CronJobCard } from './components/cron-job-card'

export function CronJobsContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-8 w-8 text-primary" />
          Cron Jobs Verwaltung
        </h1>
        <p className="text-muted-foreground mt-2">
          Manuelle Ausführung und Überwachung von automatisierten Hintergrund-Jobs
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <RefreshCw className="h-4 w-4" />
        <AlertDescription>
          Diese Jobs laufen normalerweise automatisch alle 5 Minuten. Hier können Sie sie manuell ausführen,
          um sofortige Ergebnisse zu erhalten oder Probleme zu debuggen.
        </AlertDescription>
      </Alert>

      {/* Cron Jobs Grid */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        {/* Email Queue Processor */}
        <CronJobCard
          title="E-Mail Warteschlange"
          description="Verarbeitet ausstehende E-Mails aus der Warteschlange und versendet Ticket-Benachrichtigungen"
          icon={<Mail className="w-5 h-5 text-primary" />}
          endpoint="/api/cron/process-email-queue"
        />

        {/* Calendar Sync */}
        <CronJobCard
          title="Kalender Synchronisation"
          description="Synchronisiert Events mit Google Calendar (Import & Export)"
          icon={<Calendar className="w-5 h-5 text-primary" />}
          endpoint="/api/cron/sync-calendar"
        />

        {/* Fetch Incoming Emails */}
        <CronJobCard
          title="Eingehende E-Mails abrufen"
          description="Ruft neue E-Mails vom IMAP Server ab und erstellt automatisch Tickets mit Anhängen im Storage"
          icon={<Mail className="w-5 h-5 text-primary" />}
          endpoint="/api/cron/fetch-emails"
        />

        {/* Calendar Backfill */}
        <CronJobCard
          title="Kalender Backfill (7 Tage)"
          description="Parst Customer-Name und Telefonnummer aus bestehenden Event-Beschreibungen und aktualisiert die Datenbank"
          icon={<Database className="w-5 h-5 text-primary" />}
          endpoint="/api/admin/backfill-calendar?days=7"
        />
      </div>

      {/* Info Text */}
      <div className="mt-8 p-4 rounded-lg border bg-muted/50">
        <h3 className="font-semibold mb-2">Hinweise:</h3>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Die Cron Jobs werden automatisch alle 5 Minuten von einem externen Service ausgeführt</li>
          <li>Manuelle Ausführung hier ist sicher und beeinträchtigt nicht den automatischen Zeitplan</li>
          <li>Bei Fehlern werden Details in den Server-Logs gespeichert</li>
          <li>E-Mail Queue: Versucht maximal 3x pro E-Mail, dann wird sie als fehlgeschlagen markiert</li>
          <li>Kalender Sync: Bidirektional - importiert von Google und exportiert lokale Änderungen</li>
        </ul>
      </div>
    </div>
  )
}
