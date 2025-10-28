# E-Mail Queue Cron Job Setup

## Übersicht
Der E-Mail Queue Processor läuft als Background-Job und versendet E-Mails aus der Warteschlange.

## Cron-Job Konfiguration

### URL
```
https://flighthour.getemergence.com/api/cron/process-email-queue?key=<CRON_SECRET>
```

### Intervall
**Alle 5 Minuten** (12x pro Stunde)

### cron-job.org Einstellungen
1. **Job Name:** "Email Queue Processor - FLIGHTHOUR"
2. **URL:** `https://flighthour.getemergence.com/api/cron/process-email-queue?key=<SECRET>`
3. **Schedule:** `*/5 * * * *` (alle 5 Minuten)
4. **Method:** GET
5. **Timeout:** 300 Sekunden (5 Minuten)

## Environment Variable

Füge in CapRover hinzu:

```
CRON_SECRET=<generiere-ein-sicheres-secret>
```

**Secret generieren:**
```bash
openssl rand -base64 32
```

## Funktionsweise

1. **Ticket wird erstellt** → E-Mail landet in Queue (Status: `pending`)
2. **Cron-Job läuft alle 5 Min** → Verarbeitet bis zu 10 pending E-Mails
3. **E-Mail wird versendet** → Status: `sent`
4. **Bei Fehler** → Retry (max 3x), dann Status: `failed`

## Admin-Übersicht

Admins können Queue-Status überwachen unter:
```
https://flighthour.getemergence.com/admin/email-queue
```

**Features:**
- Übersicht aller E-Mails (pending, sent, failed)
- Statistiken (Gesamt, Wartend, Gesendet, Fehlgeschlagen)
- Filter nach Status
- Fehler-Meldungen einsehen
- Anzahl Versuche pro E-Mail

## Monitoring

### Logs prüfen
```bash
# CapRover Logs
captain logs flighthourma

# Nach "Email Queue" filtern
captain logs flighthourma | grep "Email Queue"
```

### Erfolgreicher Cron-Run
```json
{
  "success": true,
  "processed": 5,
  "succeeded": 5,
  "failed": 0,
  "errors": []
}
```

### Keine pending E-Mails
```json
{
  "success": true,
  "message": "No pending emails",
  "processed": 0
}
```

## Troubleshooting

### E-Mails bleiben in "pending"
- Prüfen: Läuft der Cron-Job?
- Prüfen: Ist CRON_SECRET korrekt gesetzt?
- Prüfen: Logs nach Fehlern durchsuchen

### E-Mails gehen auf "failed"
- In Admin-Übersicht Fehler-Meldung prüfen
- Häufige Fehler:
  - SMTP Authentifizierung fehlgeschlagen
  - SMTP Timeout
  - Ungültige E-Mail-Adresse
  - Anhang zu groß

### SMTP-Settings prüfen
```typescript
// lib/email/ticket-mailer.ts
const SMTP_CONFIG = {
  host: 'ionos.de',
  port: 465,
  secure: true,
  auth: {
    user: 'm0716be75',
    pass: 'centr0@LL33'
  }
}
```

## Performance

- **Batch Size:** 10 E-Mails pro Run
- **Max Duration:** 5 Minuten pro Run
- **Retry Limit:** 3 Versuche
- **Processing Time:** ~5-10s pro E-Mail (mit Anhängen)

Bei hohem Aufkommen kann Cron-Intervall auf 2-3 Minuten reduziert werden.
