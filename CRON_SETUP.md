# Google Calendar Background Sync - Cron Setup

Die Google Calendar Synchronisierung läuft automatisch über einen externen Cron-Service, der alle 5 Minuten den Sync-Endpoint aufruft.

## 1. Voraussetzungen

### Environment Variables setzen

Stelle sicher, dass folgende Environment Variables in CapRover gesetzt sind:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Calendar
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=flighthour.de@gmail.com

# Cron Security
CRON_SECRET=<generate with: openssl rand -base64 32>
```

### CRON_SECRET generieren

```bash
openssl rand -base64 32
```

Beispiel-Output: `xK7mN9pQ2wR5tY8vC3bF6gH1jL4mP7sA0dE9fG2hJ5k=`

## 2. Cron-Service einrichten

### Option A: cron-job.org (Empfohlen - Kostenlos)

1. Gehe zu https://cron-job.org/
2. Registriere einen kostenlosen Account
3. Klicke auf "Create Cronjob"

**Konfiguration:**
- **Title:** `FLIGHTHOUR Calendar Sync`
- **URL:** `https://flighthour.getemergence.com/api/cron/sync-calendar?key=YOUR_CRON_SECRET_HERE`
- **Schedule:** Every 5 minutes (`*/5 * * * *`)
- **Request Method:** `POST`
- **Request Headers:** (keine benötigt)
- **Timeout:** 30 seconds
- **Notifications:** Bei Fehler (optional)

4. Speichern und aktivieren

### Option B: EasyCron

1. Gehe zu https://www.easycron.com/
2. Registriere einen Account (Free Plan: 1 Cron Job)
3. Erstelle neuen Cron Job

**Konfiguration:**
- **URL:** `https://flighthour.getemergence.com/api/cron/sync-calendar?key=YOUR_CRON_SECRET_HERE`
- **Cron Expression:** `*/5 * * * *` (alle 5 Minuten)
- **HTTP Method:** `POST`
- **HTTP Headers:** (keine benötigt)

### Option C: Supabase Edge Functions (Alternative)

Falls gewünscht, kann ein Supabase Edge Function als Cron-Trigger verwendet werden:

```typescript
// supabase/functions/calendar-sync/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET')
  const response = await fetch(`https://flighthour.getemergence.com/api/cron/sync-calendar?key=${cronSecret}`, {
    method: 'POST'
  })

  const data = await response.json()
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Dann in Supabase Dashboard → Edge Functions → Cron Schedule einrichten.

## 3. Testen

### Manueller Test

```bash
curl -X POST "https://flighthour.getemergence.com/api/cron/sync-calendar?key=YOUR_CRON_SECRET_HERE"
```

**Erwartete Antwort (Success):**
```json
{
  "success": true,
  "timestamp": "2025-01-27T10:30:00.000Z",
  "duration": 1234,
  "stats": {
    "imported": 5,
    "exported": 2,
    "updated": 3,
    "errors": 0
  },
  "syncToken": "..."
}
```

**Erwartete Antwort (Error):**
```json
{
  "success": false,
  "error": "Error message here",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "duration": 567
}
```

### Info-Endpoint testen

```bash
curl https://flighthourma.immogear.de/api/cron/sync-calendar
```

Zeigt Informationen über den Cron-Job an.

## 4. Monitoring

### Supabase Logs

Alle Sync-Operationen werden in der `calendar_sync_logs` Tabelle gespeichert:

```sql
SELECT
  sync_type,
  status,
  events_imported,
  events_exported,
  events_updated,
  error_message,
  started_at,
  completed_at
FROM calendar_sync_logs
ORDER BY started_at DESC
LIMIT 10;
```

### CapRover Logs

```bash
# In CapRover Dashboard:
# Apps → flighthourma → Logs
# Filter nach "[Cron]"
```

### Cron-Service Monitoring

- **cron-job.org:** Dashboard zeigt Execution History, Success Rate, Response Times
- **EasyCron:** Execution logs verfügbar
- **Supabase Edge Functions:** Logs im Supabase Dashboard

## 5. Fehlerbehandlung

### Häufige Fehler

**401 Unauthorized:**
- CRON_SECRET fehlt oder ist falsch
- Lösung: CRON_SECRET in CapRover Environment Variables überprüfen

**500 Server Error:**
- Google Calendar API Fehler
- Supabase Connection Error
- Lösung: Logs in CapRover prüfen, Credentials überprüfen

**Timeout:**
- Sync dauert > 30 Sekunden
- Lösung: Timeout im Cron-Service auf 60 Sekunden erhöhen

### Retry-Strategie

Bei Fehlern:
1. Cron-Service versucht automatisch retry (nach 1 Min)
2. Error wird in `calendar_sync_logs` gespeichert
3. Nächster regulärer Sync in 5 Minuten

## 6. Sicherheit

- ✅ **CRON_SECRET:** Verhindert unbefugte Aufrufe
- ✅ **HTTPS:** Alle Requests verschlüsselt
- ✅ **Service Role Key:** Nur server-side, nie im Frontend
- ✅ **Rate Limiting:** Google Calendar API hat Limits (1 Mio. Requests/Tag)

## 7. Kosten

- **cron-job.org:** Kostenlos (50 Cron Jobs, 1 Ausführung/Min)
- **EasyCron:** Kostenlos (1 Cron Job)
- **Supabase Edge Functions:** Erste 500.000 Requests/Monat kostenlos
- **Google Calendar API:** Kostenlos (1 Mio. Requests/Tag)

## 8. Troubleshooting

### Sync läuft nicht

1. Prüfe Cron-Service Dashboard (ist der Job aktiv?)
2. Teste manuell mit curl (siehe oben)
3. Prüfe CapRover Logs
4. Prüfe `calendar_sync_logs` Tabelle

### Events werden nicht synchronisiert

1. Prüfe Google Calendar Permissions (Service Account hat Zugriff?)
2. Prüfe `calendar_events` Tabelle (werden Events angelegt?)
3. Prüfe `sync_status` Spalte (pending/synced/error)
4. Teste manuellen Sync über UI (Manager → "Sync" Button)

### Duplikate entstehen

- Sollte NICHT passieren (UPSERT auf `google_event_id`)
- Falls doch: Prüfe unique constraint in Supabase
- Kontaktiere Support mit Logs

## 9. Support

Bei Problemen:
- CapRover Logs: `/apps/flighthourma/logs`
- Supabase Logs: Dashboard → Logs & Insights
- GitHub Issues: https://github.com/anthropics/claude-code/issues
