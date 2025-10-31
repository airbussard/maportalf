# FLIGHTHOUR - Session Quick Reference

**Datum**: 31. Oktober 2025
**Versionen**: 2.026 → 2.030
**Status**: ✅ Deployed auf CapRover

---

## 🎯 Quick Summary

Diese Session umfasste 5 Major Updates:

| Version | Feature | Status |
|---------|---------|--------|
| 2.026 | IMAP E-Mail Worker → Next.js | ✅ |
| 2.027 | Buchungsstatistik Pagination | ✅ |
| 2.028 | Ticket E-Mail Benachrichtigungen | ✅ |
| 2.029 | PDF Export mit Logo + E-Mail Queue | ✅ |
| 2.030 | Combined Compensation Type | ✅ |

---

## ⚠️ WICHTIG: Vor nächster Session ausführen!

### 1. Datenbank-Migration ausführen
**In Supabase SQL Editor**:

```sql
-- Datei: supabase/migrations/20251031000002_add_combined_compensation.sql

-- Drop alte Constraint
ALTER TABLE employee_compensation_history
DROP CONSTRAINT IF EXISTS valid_compensation;

-- Neue Constraint mit 'combined' Type
ALTER TABLE employee_compensation_history
ADD CONSTRAINT valid_compensation CHECK (
    (compensation_type = 'hourly' AND hourly_rate IS NOT NULL AND monthly_salary IS NULL) OR
    (compensation_type = 'salary' AND monthly_salary IS NOT NULL AND hourly_rate IS NULL) OR
    (compensation_type = 'combined' AND monthly_salary IS NOT NULL AND hourly_rate IS NOT NULL)
);

-- Update compensation_type CHECK constraints
ALTER TABLE employee_compensation_history
DROP CONSTRAINT IF EXISTS employee_compensation_history_compensation_type_check;

ALTER TABLE employee_compensation_history
ADD CONSTRAINT employee_compensation_history_compensation_type_check
CHECK (compensation_type IN ('hourly', 'salary', 'combined'));

ALTER TABLE employee_settings
DROP CONSTRAINT IF EXISTS employee_settings_compensation_type_check;

ALTER TABLE employee_settings
ADD CONSTRAINT employee_settings_compensation_type_check
CHECK (compensation_type IN ('hourly', 'salary', 'combined'));
```

### 2. Storage Bucket erstellen
1. Supabase Dashboard → Storage
2. Create new bucket: **`time-reports`**
3. Public: **NO** (private)
4. RLS: **YES**

### 3. Storage Policies anwenden
**In Supabase SQL Editor**:

```sql
-- Datei: supabase/storage-policies/time-reports-bucket.sql

-- Admins can upload
CREATE POLICY "Admins can upload time reports"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'time-reports' AND
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Admins can read
CREATE POLICY "Admins can read time reports"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'time-reports' AND
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Admins can update
CREATE POLICY "Admins can update time reports"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'time-reports' AND
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Admins can delete
CREATE POLICY "Admins can delete time reports"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'time-reports' AND
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Service role bypass (für Cron Jobs)
CREATE POLICY "Service role bypass time-reports"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'time-reports')
WITH CHECK (bucket_id = 'time-reports');
```

---

## 📝 Versions-Übersicht

### v2.026: IMAP Worker Migration
**Problem**: PHP IMAP Cron musste zu Next.js migriert werden

**Lösung**:
- Neue Route: `/api/cron/fetch-emails`
- Helpers: `lib/email/imap-helpers.ts`, `lib/email/attachment-processor.ts`
- **Kritisch**: Upload zu Supabase Storage (`ticket-attachments` bucket) statt lokalem Filesystem

**Dateien**:
- NEU: `lib/email/imap-helpers.ts` (170 Zeilen)
- NEU: `lib/email/attachment-processor.ts` (150 Zeilen)
- NEU: `app/api/cron/fetch-emails/route.ts` (280 Zeilen)

---

### v2.027: Pagination Fix
**Problem**: Supabase 1000-Zeilen Limit bei Buchungsstatistiken

**Lösung**: Sequential pagination mit `.range()`

**Code**:
```typescript
let allEvents = []
let page = 0
const pageSize = 1000

while (true) {
  const { data: pageEvents } = await supabase
    .from('calendar_events')
    .select('start_time, created_at')
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (!pageEvents || pageEvents.length === 0) break
  allEvents.push(...pageEvents)
  if (pageEvents.length < pageSize) break
  page++
}
```

**Datei**: `app/actions/calendar-stats.ts`

---

### v2.028: Ticket E-Mail Benachrichtigungen
**Probleme**:
1. Antworten werden nicht per E-Mail versendet
2. Header zeigt immer "Beschreibung"

**Lösungen**:
1. E-Mail queueing in `addMessage()` wenn `!isInternal`
2. Intelligente Anzeige: `created_from_email` → "Von: email" / `creator` → "Erstellt von: Name"

**Dateien**:
- `app/actions/tickets.ts` (Zeile 140+)
- `app/(dashboard)/tickets/[id]/page.tsx` (Zeile 180+)

---

### v2.029: PDF Export Verbesserungen
**Anforderungen**:
1. Logo in PDFs
2. E-Mail über Queue statt direktem SMTP
3. ~~Mitarbeiter-Auswahl~~ (war bereits da)
4. ~~Gehaltslogik~~ (war bereits korrekt)

**Lösungen**:
1. **Shared PDF Generator**: `lib/pdf/time-report-generator.ts` (213 Zeilen)
   - Logo via `pdfDoc.embedPng(logoBytes)`
   - Header nach rechts verschoben
2. **Storage Upload**: PDF nach `time-reports` bucket
3. **Email Queue**: `attachment_storage_path` + `attachment_filename` in `email_queue`
4. **Queue Processor**: Erweitert für `time-reports` Download

**Dateien**:
- NEU: `lib/pdf/time-report-generator.ts`
- UPDATE: `app/api/zeiterfassung/email/route.ts` (-268 Zeilen)
- UPDATE: `app/api/zeiterfassung/pdf/route.ts` (-182 Zeilen)
- UPDATE: `app/api/cron/process-email-queue/route.ts` (+32 Zeilen)

**Code Reduktion**: -410 Zeilen (Duplikate entfernt)

---

### v2.030: Combined Compensation Type
**Problem**: Datenbank-Constraint verhinderte Festgehalt + Stundenlohn Kombination

**Lösung**: Neuer Type `'combined'` mit beiden Feldern

**Änderungen**:
1. **Migration**: `supabase/migrations/20251031000002_add_combined_compensation.sql`
   - Constraint erweitert: `hourly` / `salary` / `combined`
2. **TypeScript**: `CompensationType = 'hourly' | 'salary' | 'combined'`
3. **Berechnungslogik**: `app/actions/time-reports.ts` (Zeile 467-476)
   ```typescript
   if (compensationType === 'combined') {
     interimSalary = monthlySalary + (totalHours * hourlyRate) + bonusAmount
     calculatedHours = interimSalary / hourlyRate
   }
   ```
4. **UI**: Dialog mit 3 Radio-Buttons statt 2
5. **Display**: `3000€/Monat + 20.00€/Stunde`

**Dateien**:
- NEU: `supabase/migrations/20251031000002_add_combined_compensation.sql`
- NEU: `supabase/storage-policies/time-reports-bucket.sql`
- UPDATE: 6 TypeScript-Dateien

---

## 🧪 Testing-Checkliste

### Nach Migration ausführen:

**Datenbank**:
- [ ] Migration ausgeführt
- [ ] `time-reports` Bucket erstellt
- [ ] Storage Policies angewendet
- [ ] Test: `combined` Type funktioniert

**Combined Compensation**:
- [ ] Neuen Mitarbeiter mit 'combined' erstellen
- [ ] Beide Felder werden gespeichert
- [ ] UI zeigt korrekt: "X€/Monat + Y€/Stunde"
- [ ] Zeiterfassungs-Bericht korrekt berechnet

**PDF Export**:
- [ ] Logo ist sichtbar (oben links)
- [ ] Download funktioniert
- [ ] E-Mail mit PDF-Anhang funktioniert

**IMAP Worker**:
- [ ] Test über Admin-Panel → Cron Jobs
- [ ] E-Mail wird abgerufen
- [ ] Ticket wird erstellt
- [ ] Anhänge in Storage

**Ticket E-Mails**:
- [ ] Antwort auf E-Mail-Ticket sendet E-Mail
- [ ] Interne Notiz sendet KEINE E-Mail

---

## 📂 Wichtige Dateien

### Neue Dateien
```
lib/email/imap-helpers.ts
lib/email/attachment-processor.ts
lib/pdf/time-report-generator.ts
app/api/cron/fetch-emails/route.ts
supabase/migrations/20251031000002_add_combined_compensation.sql
supabase/storage-policies/time-reports-bucket.sql
SESSIONS_DOCUMENTATION.md
```

### Geänderte Dateien
```
app/actions/calendar-stats.ts
app/actions/tickets.ts
app/actions/time-reports.ts
app/actions/employee-settings.ts
app/api/zeiterfassung/email/route.ts
app/api/zeiterfassung/pdf/route.ts
app/api/cron/process-email-queue/route.ts
app/(dashboard)/tickets/[id]/page.tsx
app/(dashboard)/zeiterfassung/verwaltung/components/compensation-config-dialog.tsx
app/(dashboard)/mitarbeiter/components/employee-detail-modal.tsx
lib/types/time-tracking.ts
```

---

## 💡 Compensation Types

| Type | Festgehalt | Stundenlohn | Berechnung |
|------|------------|-------------|------------|
| `hourly` | ❌ | ✅ | `Stunden × Rate + Bonus` |
| `salary` | ✅ | ❌ | `Festgehalt + Bonus` (Legacy) |
| `combined` | ✅ | ✅ | `Festgehalt + (Stunden × Rate) + Bonus` |

**Export-Stunden**:
- `hourly`: Tatsächliche Stunden
- `salary`: `Gehalt / 20` (Fallback Rate)
- `combined`: `Gesamtgehalt / Stundenlohn`

---

## 🔧 API Endpoints

### Neue Endpoints
- `GET /api/cron/fetch-emails` - IMAP Worker (v2.026)

### Geänderte Endpoints
- `POST /api/zeiterfassung/email` - Verwendet jetzt Queue + Storage (v2.029)
- `GET /api/zeiterfassung/pdf` - Verwendet shared Generator mit Logo (v2.029)
- `GET /api/cron/process-email-queue` - Unterstützt `time-reports` (v2.029)

---

## 📦 Storage Buckets

| Bucket | Zweck | RLS | Status |
|--------|-------|-----|--------|
| `ticket-attachments` | E-Mail Anhänge | ✅ | ✅ Aktiv |
| `time-reports` | PDF Zeitberichte | ✅ | ⚠️ Manuell erstellen! |

---

## 🗄️ Datenbank-Änderungen

### Tabellen geändert

**`email_queue`** (v2.029):
- `attachment_storage_path TEXT` (NEU)
- `attachment_filename TEXT` (NEU)

**`employee_compensation_history`** (v2.030):
- `compensation_type` jetzt: `'hourly' | 'salary' | 'combined'`
- Neue Constraint erlaubt beide Felder bei `'combined'`

**`employee_settings`** (v2.030):
- `compensation_type` jetzt: `'hourly' | 'salary' | 'combined'`

---

## 🚀 Deployment

**Status**: ✅ Version 2.030 deployed

**Git Commits**:
```
c6134fd - v2.030: Combined Compensation Type
20fb1cb - v2.029: PDF Export Verbesserungen
e857320 - v2.028: Ticket E-Mail Benachrichtigungen
05a10aa - v2.027: Buchungsstatistik Pagination
6e5d78d - v2.026: IMAP Worker Migration
```

**CapRover**: https://captain.immogear.de

---

## 📚 Vollständige Dokumentation

Siehe **SESSIONS_DOCUMENTATION.md** für:
- Detaillierte Code-Beispiele
- Vollständige Dateiänderungen
- Technische Details
- Known Issues
- Zukünftige Features

---

## 🔍 Bekannte Probleme

1. **Time Reports Bucket**: Muss manuell erstellt werden + Policies
2. **Compensation History Backfill**: Migration `20251009_backfill_compensation_history.sql` sollte ausgeführt werden
3. **PHP System**: Läuft parallel (beabsichtigt für Strato)

---

## 📞 Support

- **Developer**: Oscar Knabe (ok@flighthour.de)
- **AI**: Claude Code (claude.com/claude-code)
- **Repo**: GitHub airbussard/maportalf

---

**Nächste Session**: Pending Tasks abarbeiten, dann Testing-Checkliste durchgehen!
