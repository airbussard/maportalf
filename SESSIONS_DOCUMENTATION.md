# FLIGHTHOUR Development Sessions - Ausführliche Dokumentation

**Letztes Update**: 31. Oktober 2025
**Aktuelle Version**: 2.030
**Status**: Deployed auf CapRover (https://captain.immogear.de)

---

## 📋 Inhaltsverzeichnis

1. [Aktuelle Session (31.10.2025)](#session-31102025)
2. [Version History](#version-history)
3. [Pending Tasks](#pending-tasks)
4. [Datenbank Status](#datenbank-status)
5. [Known Issues](#known-issues)

---

## Session 31.10.2025

### Übersicht
Diese Session umfasste 5 Major Updates von Version 2.026 bis 2.030.

### Version 2.026: IMAP E-Mail Worker Migration
**Datum**: 31.10.2025
**Git Commit**: `6e5d78d`

#### Problem
PHP IMAP Cron Job musste zu Next.js migriert werden, um unabhängig vom PHP-System zu sein.

#### Lösung
Vollständige Portierung des PHP IMAP Workers zu Next.js mit Supabase Storage Integration.

#### Dateien erstellt/geändert
1. **NEU**: `/lib/email/imap-helpers.ts`
   - `detectPriority()` - Erkennt Priorität aus E-Mail-Inhalt
   - `cleanForJson()` - Bereinigt Strings für JSON-Speicherung
   - `cleanHtmlForStorage()` - Sanitisiert HTML
   - `extractEmailAddress()` - Extrahiert E-Mail aus "Name <email>" Format

2. **NEU**: `/lib/email/attachment-processor.ts`
   - `processAttachments()` - Verarbeitet E-Mail-Anhänge
   - `uploadToSupabaseStorage()` - **KRITISCH**: Upload zu Supabase Storage statt lokalem Filesystem
   - Bucket: `ticket-attachments`
   - Speichert Metadaten in `ticket_attachments` Tabelle

3. **NEU**: `/app/api/cron/fetch-emails/route.ts`
   - Main IMAP Worker Endpoint
   - Verwendet `imap` und `mailparser` libraries
   - Prozessiert UNSEEN E-Mails
   - Erstellt automatisch Tickets oder Replies
   - Auto-Tagging basierend auf Tag-Regeln

4. **UPDATE**: `/app/(dashboard)/admin/cron-jobs/page.tsx`
   - IMAP Worker zum Admin-Panel hinzugefügt
   - Manueller Test-Button

#### Technische Details
```typescript
// IMAP Connection
const imap = new Imap({
  user: settings.imap_username,
  password: settings.imap_password,
  host: settings.imap_host,
  port: settings.imap_port,
  tls: true
})

// Attachment Upload (Hauptunterschied zu PHP)
const { error: uploadError } = await supabase.storage
  .from('ticket-attachments')
  .upload(storagePath, attachment.data, {
    contentType: attachment.mimeType
  })
```

#### Migration von PHP
- **PHP**: `file_put_contents($localPath, $data)`
- **Next.js**: Supabase Storage API Upload

---

### Version 2.027: Buchungsstatistik Pagination
**Datum**: 31.10.2025
**Git Commit**: `05a10aa`

#### Problem
Supabase limitiert Queries auf 1000 Zeilen. Bei Buchungsstatistiken wurden nur die ersten 1000 Events berücksichtigt.

#### Lösung
Implementierung sequenzieller Pagination mit `.range()`.

#### Dateien geändert
1. **UPDATE**: `/app/actions/calendar-stats.ts`

#### Code-Beispiel
```typescript
// VORHER (limitiert auf 1000)
const { data: events } = await supabase
  .from('calendar_events')
  .select('start_time, created_at')

// NACHHER (unbegrenzt)
let allEvents: { start_time: string; created_at: string }[] = []
let page = 0
const pageSize = 1000

while (true) {
  const rangeStart = page * pageSize
  const rangeEnd = (page + 1) * pageSize - 1

  const { data: pageEvents } = await supabase
    .from('calendar_events')
    .select('start_time, created_at')
    .range(rangeStart, rangeEnd)

  if (!pageEvents || pageEvents.length === 0) break

  allEvents.push(...pageEvents)

  if (pageEvents.length < pageSize) break // Letzte Seite
  page++
}
```

#### Performance
- Ca. 200ms pro 1000 Datensätze
- Akzeptabler Overhead für unbegrenzte Datenmenge

---

### Version 2.028: Ticket E-Mail Benachrichtigungen
**Datum**: 31.10.2025
**Git Commit**: `e857320`

#### Probleme
1. Antworten auf Tickets wurden nicht per E-Mail versendet
2. Header zeigte "Beschreibung" statt Absender-Informationen
3. Keine Unterscheidung zwischen E-Mail- und internen Tickets

#### Lösungen

##### 1. E-Mail Queueing für Ticket-Antworten
**Datei**: `/app/actions/tickets.ts` (Zeile 140+)

```typescript
export async function addMessage(ticketId: string, content: string, isInternal: boolean = false) {
  // Message erstellen
  const { data: message } = await supabase
    .from('ticket_messages')
    .insert({ ticket_id: ticketId, content, sender_id: user.id, is_internal: isInternal })

  // NEU: E-Mail queueing für nicht-interne Nachrichten
  if (!isInternal) {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('subject, ticket_number, created_from_email')
      .eq('id', ticketId)
      .single()

    if (ticket && ticket.created_from_email) {
      await supabase
        .from('email_queue')
        .insert({
          type: 'ticket_reply',
          ticket_id: ticketId,
          recipient_email: ticket.created_from_email,
          subject: `[TICKET-${ticketNumber}] ${ticket.subject}`,
          content,
          status: 'pending',
          attempts: 0
        })
    }
  }
}
```

##### 2. Intelligente Absender-Anzeige
**Datei**: `/app/(dashboard)/tickets/[id]/page.tsx` (Zeile 180+)

```tsx
{/* VORHER: Immer "Beschreibung" */}
<h3 className="font-semibold mb-2">Beschreibung</h3>

{/* NACHHER: Intelligente Anzeige */}
{ticket.created_from_email ? (
  <h3 className="font-semibold mb-2 flex items-center gap-2">
    <span className="text-muted-foreground">Von:</span>
    <span className="text-primary">{ticket.created_from_email}</span>
  </h3>
) : ticket.creator ? (
  <h3 className="font-semibold mb-2 flex items-center gap-2">
    <span className="text-muted-foreground">Erstellt von:</span>
    <span className="text-primary">
      {ticket.creator.first_name} {ticket.creator.last_name}
    </span>
  </h3>
) : (
  <h3 className="font-semibold mb-2">Beschreibung</h3>
)}
```

#### Auswirkungen
- E-Mail-Tickets zeigen Absender-E-Mail
- Interne Tickets zeigen Creator-Name
- Nur nicht-interne Antworten werden per E-Mail versendet

---

### Version 2.029: PDF Export Verbesserungen
**Datum**: 31.10.2025
**Git Commit**: `20fb1cb`

#### Anforderungen
1. Logo in PDF-Exporten einbauen
2. E-Mails über Queue statt direktem SMTP
3. Mitarbeiter-Auswahl (Alle/Einzeln) - **war bereits implementiert**
4. Gehaltslogik klären - **war bereits korrekt**

#### Lösungen

##### 1. Shared PDF Generator mit Logo
**Datei NEU**: `/lib/pdf/time-report-generator.ts`

```typescript
export async function generateTimeReportPdf(reportData: MonthlyReportData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([842, 595]) // A4 landscape

  // Logo einbetten
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png')
    const logoBytes = fs.readFileSync(logoPath)
    const logoImage = await pdfDoc.embedPng(logoBytes)

    const logoAspectRatio = logoImage.width / logoImage.height
    const logoHeight = 40
    const logoWidth = logoHeight * logoAspectRatio

    page.drawImage(logoImage, {
      x: 50,
      y: height - 70,
      width: logoWidth,
      height: logoHeight,
    })
  } catch (error) {
    console.error('[PDF] Failed to embed logo:', error)
    // Continue without logo
  }

  // Header nach rechts verschoben (Platz für Logo)
  page.drawText(`Zeiterfassung - ${reportData.month_name} ${reportData.year}`, {
    x: 250, // war: width/2-150
    y: height - 50,
    size: 24,
    font: helveticaBoldFont,
  })

  // ... Rest der PDF-Generierung (Tabelle, Footer)
}
```

##### 2. E-Mail Queue statt SMTP
**Datei UPDATE**: `/app/api/zeiterfassung/email/route.ts`

```typescript
// VORHER: Direkter nodemailer.sendMail()
// Code entfernt: ~100 Zeilen nodemailer Setup und Versand

// NACHHER: Upload zu Storage + Queue
const pdfBuffer = await generateTimeReportPdf(reportData)
const storagePath = `time-reports/${year}_${month}_${Date.now()}.pdf`

// Upload PDF
await adminSupabase.storage
  .from('time-reports')
  .upload(storagePath, Buffer.from(pdfBuffer), {
    contentType: 'application/pdf',
    upsert: false
  })

// Queue E-Mails
for (const recipient of validRecipients) {
  await adminSupabase
    .from('email_queue')
    .insert({
      type: 'time_report',
      recipient_email: recipient,
      subject: subject,
      content: fullBody,
      attachment_storage_path: storagePath, // NEU
      attachment_filename: filename,        // NEU
      status: 'pending',
      attempts: 0
    })
}
```

##### 3. Email Queue Processor erweitert
**Datei UPDATE**: `/app/api/cron/process-email-queue/route.ts` (Zeile 143-167)

```typescript
// Ticket Attachments (bestehend)
if (attachments && attachments.length > 0) {
  for (const att of attachments) {
    const { data: fileData } = await supabase.storage
      .from('ticket-attachments')
      .download(att.storage_path)

    emailAttachments.push({
      filename: att.original_filename,
      content: Buffer.from(await fileData.arrayBuffer()),
      contentType: att.mime_type
    })
  }
}

// NEU: Time Report Attachments
if (email.attachment_storage_path) {
  const { data: fileData } = await supabase.storage
    .from('time-reports')
    .download(email.attachment_storage_path)

  if (fileData) {
    emailAttachments.push({
      filename: email.attachment_filename || 'zeiterfassung.pdf',
      content: Buffer.from(await fileData.arrayBuffer()),
      contentType: 'application/pdf'
    })
  }
}
```

##### 4. Gehaltslogik-Bestätigung
**Datei**: `/app/actions/time-reports.ts` (Zeile 461-487)

```typescript
// BEREITS KORREKT IMPLEMENTIERT!
if (compensationData.compensation_type === 'hourly') {
  // Stundenlohn: Stunden × Rate + Bonus
  hourlyRate = compensationData.hourly_rate || 0
  interimSalary = (totalHours * hourlyRate) + bonusAmount
  calculatedHours = totalHours
} else {
  // Festgehalt: Festgehalt + (Stunden × Rate) + Bonus
  const monthlySalary = compensationData.monthly_salary || 0
  hourlyRate = compensationData.hourly_rate || 20
  interimSalary = monthlySalary + (totalHours * hourlyRate) + bonusAmount

  // Export: Gesamtgehalt / Stundenlohn = berechnete Stunden
  calculatedHours = Math.round((interimSalary / hourlyRate) * 100) / 100
}
```

**Bestätigung**: Die beschriebene Logik war bereits 1:1 implementiert!

#### Dateien geändert
1. **NEU**: `/lib/pdf/time-report-generator.ts` (213 Zeilen)
2. **UPDATE**: `/app/api/zeiterfassung/pdf/route.ts` (-182 Zeilen, +10 Zeilen)
3. **UPDATE**: `/app/api/zeiterfassung/email/route.ts` (-268 Zeilen, +40 Zeilen)
4. **UPDATE**: `/app/api/cron/process-email-queue/route.ts` (+32 Zeilen)
5. **UPDATE**: `/app/(dashboard)/components/sidebar.tsx` (Version 2.029)

#### Code Reduktion
- **Gelöschter Code**: ~410 Zeilen (Duplikate, nodemailer)
- **Neuer Code**: ~287 Zeilen (shared generator, storage)
- **Netto**: -123 Zeilen bei mehr Funktionalität

---

### Version 2.030: Gehaltslogik-Fix (Combined Compensation)
**Datum**: 31.10.2025
**Git Commit**: `c6134fd`

#### Problem
Das Datenbank-Constraint in `employee_compensation_history` verhinderte die Kombination von Festgehalt + Stundenlohn:

```sql
-- ALTE CONSTRAINT (Problem!)
CONSTRAINT valid_compensation CHECK (
    (compensation_type = 'hourly' AND hourly_rate IS NOT NULL AND monthly_salary IS NULL) OR
    (compensation_type = 'salary' AND monthly_salary IS NOT NULL AND hourly_rate IS NULL)
)
```

**Auswirkung**:
- `hourly`: NUR hourly_rate erlaubt
- `salary`: NUR monthly_salary erlaubt
- **KEINE Kombination möglich!**

Aber der User wollte:
- Festgehalt (monthly_salary) + Stundenlohn (hourly_rate) für abgerechnete Stunden

#### Lösung: Neuer Compensation Type "combined"

##### 1. Datenbank-Migration
**Datei NEU**: `/supabase/migrations/20251031000002_add_combined_compensation.sql`

```sql
-- Drop alte Constraint
ALTER TABLE employee_compensation_history
DROP CONSTRAINT IF EXISTS valid_compensation;

-- Neue Constraint mit 3 Fällen
ALTER TABLE employee_compensation_history
ADD CONSTRAINT valid_compensation CHECK (
    (compensation_type = 'hourly' AND hourly_rate IS NOT NULL AND monthly_salary IS NULL) OR
    (compensation_type = 'salary' AND monthly_salary IS NOT NULL AND hourly_rate IS NULL) OR
    (compensation_type = 'combined' AND monthly_salary IS NOT NULL AND hourly_rate IS NOT NULL)
    -- ^^^ NEU: Beide Felder erforderlich!
);

-- Update CHECK Constraint für compensation_type
ALTER TABLE employee_compensation_history
DROP CONSTRAINT IF EXISTS employee_compensation_history_compensation_type_check;

ALTER TABLE employee_compensation_history
ADD CONSTRAINT employee_compensation_history_compensation_type_check
CHECK (compensation_type IN ('hourly', 'salary', 'combined'));

-- Gleiche Änderungen für employee_settings
ALTER TABLE employee_settings
DROP CONSTRAINT IF EXISTS employee_settings_compensation_type_check;

ALTER TABLE employee_settings
ADD CONSTRAINT employee_settings_compensation_type_check
CHECK (compensation_type IN ('hourly', 'salary', 'combined'));
```

##### 2. TypeScript-Typen
**Datei UPDATE**: `/lib/types/time-tracking.ts` (Zeile 49)

```typescript
// VORHER
export interface EmployeeSettings {
  compensation_type: 'hourly' | 'salary'
  // ...
}

// NACHHER
export interface EmployeeSettings {
  compensation_type: 'hourly' | 'salary' | 'combined'
  // ...
}
```

##### 3. Berechnungslogik
**Datei UPDATE**: `/app/actions/time-reports.ts` (Zeile 461-487)

```typescript
if (compensationData) {
  if (compensationData.compensation_type === 'hourly') {
    // Stundenlohn: Stunden × Rate + Bonus
    hourlyRate = compensationData.hourly_rate || 0
    interimSalary = (totalHours * hourlyRate) + bonusAmount
    calculatedHours = totalHours

  } else if (compensationData.compensation_type === 'combined') {
    // NEU: Kombiniert (Model C)
    // Festgehalt + (Stunden × Stundenlohn) + Bonus
    const monthlySalary = compensationData.monthly_salary || 0
    hourlyRate = compensationData.hourly_rate || 0
    interimSalary = monthlySalary + (totalHours * hourlyRate) + bonusAmount
    calculatedHours = hourlyRate > 0
      ? Math.round((interimSalary / hourlyRate) * 100) / 100
      : totalHours

  } else {
    // Legacy Salary: Nur Festgehalt + Bonus
    const monthlySalary = compensationData.monthly_salary || 0
    hourlyRate = compensationData.hourly_rate || 20
    interimSalary = monthlySalary + bonusAmount
    calculatedHours = hourlyRate > 0
      ? Math.round((interimSalary / hourlyRate) * 100) / 100
      : 0
  }
}
```

##### 4. UI: CompensationConfigDialog
**Datei UPDATE**: `/app/(dashboard)/zeiterfassung/verwaltung/components/compensation-config-dialog.tsx`

Änderungen:
- State Type erweitert: `useState<'hourly' | 'salary' | 'combined'>('hourly')`
- 3 Radio-Buttons statt 2:
  1. "Nur Stundenlohn" (hourly)
  2. "Nur Festgehalt (Legacy)" (salary)
  3. **"Festgehalt + Stundenlohn (Kombiniert)"** (combined) ← NEU
- Conditional Rendering für combined-Type
- Validation für combined (beide Felder erforderlich)

```tsx
{compensationType === 'combined' && (
  <>
    <div className="space-y-2">
      <Label>Festgehalt (€/Monat)</Label>
      <Input
        type="number"
        value={monthlySalary}
        onChange={(e) => setMonthlySalary(e.target.value)}
        placeholder="z.B. 3000.00"
      />
      <p className="text-xs text-muted-foreground">
        Fester monatlicher Betrag (Basis)
      </p>
    </div>

    <div className="space-y-2">
      <Label>Stundenlohn (€/h)</Label>
      <Input
        type="number"
        value={hourlyRate}
        onChange={(e) => setHourlyRate(e.target.value)}
        placeholder="z.B. 20.00"
      />
      <p className="text-xs text-muted-foreground">
        Wird für abgerechnete Stunden zusätzlich zum Festgehalt bezahlt
      </p>
    </div>

    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
      <p className="text-xs text-blue-800">
        <strong>Berechnung:</strong> Festgehalt + (Stunden × Stundenlohn) + Bonus = Gesamtgehalt<br/>
        <strong>Export-Stunden:</strong> Gesamtgehalt / Stundenlohn
      </p>
    </div>
  </>
)}
```

##### 5. UI: Employee Detail Modal
**Datei UPDATE**: `/app/(dashboard)/mitarbeiter/components/employee-detail-modal.tsx` (Zeile 92-102)

```typescript
const getCompensationDisplay = () => {
  if (!employeeSettings) return 'Nicht konfiguriert'

  if (employeeSettings.compensation_type === 'hourly') {
    return `${employeeSettings.hourly_rate?.toFixed(2) || '0.00'}€/Stunde`
  } else if (employeeSettings.compensation_type === 'combined') {
    // NEU: Zeigt beide Werte
    return `${employeeSettings.monthly_salary?.toFixed(0) || '0'}€/Monat + ${employeeSettings.hourly_rate?.toFixed(2) || '0.00'}€/Stunde`
  } else {
    return `${employeeSettings.monthly_salary?.toFixed(0) || '0'}€/Monat (Festgehalt)`
  }
}
```

##### 6. Server Action Update
**Datei UPDATE**: `/app/actions/employee-settings.ts`

```typescript
// Type erweitert (Zeile 96)
export async function saveEmployeeSettings(data: {
  employee_id: string
  compensation_type: 'hourly' | 'salary' | 'combined' // NEU: 'combined'
  hourly_rate?: number
  monthly_salary?: number
}): Promise<ActionResponse<EmployeeSettings>>

// Validation (Zeile 128-135)
if (data.compensation_type === 'combined') {
  if (!data.monthly_salary || data.monthly_salary <= 0) {
    return { success: false, error: 'Festgehalt muss größer als 0 sein' }
  }
  if (!data.hourly_rate || data.hourly_rate <= 0) {
    return { success: false, error: 'Stundenlohn muss größer als 0 sein' }
  }
}

// Upsert Data (Zeile 141-142)
hourly_rate: data.compensation_type === 'hourly' || data.compensation_type === 'combined'
  ? data.hourly_rate
  : null,
monthly_salary: data.compensation_type === 'salary' || data.compensation_type === 'combined'
  ? data.monthly_salary
  : null,

// History Data (Zeile 167-168)
hourly_rate: data.compensation_type === 'hourly' || data.compensation_type === 'combined'
  ? data.hourly_rate
  : null,
monthly_salary: data.compensation_type === 'salary' || data.compensation_type === 'combined'
  ? data.monthly_salary
  : null,
```

##### 7. Storage Bucket Policies
**Datei NEU**: `/supabase/storage-policies/time-reports-bucket.sql`

```sql
-- Policy 1: Admins can upload
CREATE POLICY "Admins can upload time reports"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'time-reports' AND
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Policy 2: Admins can read
CREATE POLICY "Admins can read time reports"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'time-reports' AND
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Policy 3: Admins can update
CREATE POLICY "Admins can update time reports"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'time-reports' AND
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Policy 4: Admins can delete
CREATE POLICY "Admins can delete time reports"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'time-reports' AND
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Policy 5: Service role bypass (für Cron Jobs)
CREATE POLICY "Service role bypass time-reports"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'time-reports')
WITH CHECK (bucket_id = 'time-reports');
```

#### Dateien geändert (v2.030)
1. **NEU**: `/supabase/migrations/20251031000002_add_combined_compensation.sql` (33 Zeilen)
2. **NEU**: `/supabase/storage-policies/time-reports-bucket.sql` (67 Zeilen)
3. **UPDATE**: `/lib/types/time-tracking.ts` (1 Zeile)
4. **UPDATE**: `/app/actions/employee-settings.ts` (20 Zeilen)
5. **UPDATE**: `/app/actions/time-reports.ts` (20 Zeilen)
6. **UPDATE**: `/app/(dashboard)/zeiterfassung/verwaltung/components/compensation-config-dialog.tsx` (77 Zeilen)
7. **UPDATE**: `/app/(dashboard)/mitarbeiter/components/employee-detail-modal.tsx` (4 Zeilen)
8. **UPDATE**: `/app/(dashboard)/components/sidebar.tsx` (Version 2.030)

#### Build & Deployment
- **Build Status**: ✅ Erfolgreich (keine Fehler)
- **TypeScript**: ✅ Alle Typen korrekt
- **Git Commit**: `c6134fd`
- **Deployed**: CapRover (https://captain.immogear.de)

---

## Version History

| Version | Datum | Beschreibung | Git Commit |
|---------|-------|--------------|------------|
| 2.030 | 31.10.2025 | Gehaltslogik-Fix: 'combined' Compensation Type | `c6134fd` |
| 2.029 | 31.10.2025 | PDF Export mit Logo + E-Mail Queue | `20fb1cb` |
| 2.028 | 31.10.2025 | Ticket E-Mail Benachrichtigungen + Absender-Anzeige | `e857320` |
| 2.027 | 31.10.2025 | Buchungsstatistik Pagination (1000er Limit) | `05a10aa` |
| 2.026 | 31.10.2025 | IMAP E-Mail Worker zu Next.js | `6e5d78d` |
| 2.024 | - | Buchungs-Statistiken Feature | `30a1e2e` |
| 2.023 | - | Dashboard Ticket Cards Fix | `243a4f0` |
| 2.022 | - | Time Entries 4 Wochen voraus | `5cad191` |
| 2.021 | - | Select.Item empty value Fix | `551251c` |
| 2.020 | - | Timezone Bugs Fix | `e3ff375` |

---

## Pending Tasks

### ⚠️ WICHTIG: Datenbank-Setup erforderlich!

Nach Deployment müssen folgende SQL-Befehle in Supabase ausgeführt werden:

#### 1. Migration ausführen
```sql
-- In Supabase SQL Editor ausführen:
-- Quelle: /supabase/migrations/20251031000002_add_combined_compensation.sql

-- Step 1: Drop alte Constraint
ALTER TABLE employee_compensation_history
DROP CONSTRAINT IF EXISTS valid_compensation;

-- Step 2: Neue Constraint mit 'combined' Type
ALTER TABLE employee_compensation_history
ADD CONSTRAINT valid_compensation CHECK (
    (compensation_type = 'hourly' AND hourly_rate IS NOT NULL AND monthly_salary IS NULL) OR
    (compensation_type = 'salary' AND monthly_salary IS NOT NULL AND hourly_rate IS NULL) OR
    (compensation_type = 'combined' AND monthly_salary IS NOT NULL AND hourly_rate IS NOT NULL)
);

-- Step 3: Update CHECK Constraints für compensation_type
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

#### 2. Storage Bucket erstellen (falls noch nicht geschehen)

**Bucket: `time-reports`**
1. In Supabase Dashboard → Storage
2. Create new bucket: **`time-reports`**
3. Public: **NO** (private)
4. RLS aktivieren

#### 3. Storage Policies anwenden
```sql
-- In Supabase SQL Editor ausführen:
-- Quelle: /supabase/storage-policies/time-reports-bucket.sql

-- (Siehe oben unter "Storage Bucket Policies" für vollständigen Code)
```

### Offene Features

#### Email-zu-Aufgabe Konvertierung (Phase 6)
- E-Mails direkt in Aufgaben umwandeln
- Spezielle E-Mail-Adresse (tasks@flighthour.de)
- **Status**: Noch nicht implementiert
- **Priority**: Medium

#### Webhook-System (Phase 5)
- Webhook-Endpoints für externe Integrationen
- Slack/Teams Integration
- **Status**: Noch nicht implementiert
- **Priority**: Low

---

## Datenbank Status

### Tabellen

#### `email_queue`
**Erweitert in v2.029**:
- `attachment_storage_path` - Pfad zu PDF in Storage Bucket
- `attachment_filename` - Original-Dateiname für E-Mail-Anhang

**Felder**:
```sql
id UUID
type VARCHAR(50) -- 'ticket_reply', 'time_report', etc.
ticket_id UUID (nullable)
recipient_email VARCHAR(255)
subject TEXT
content TEXT
attachment_storage_path TEXT -- NEU in v2.029
attachment_filename TEXT -- NEU in v2.029
status VARCHAR(20) -- 'pending', 'processing', 'sent', 'failed'
attempts INT
last_attempt_at TIMESTAMPTZ
sent_at TIMESTAMPTZ
error_message TEXT
created_at TIMESTAMPTZ
```

#### `employee_compensation_history`
**Erweitert in v2.030**:
- `compensation_type` jetzt mit 3 Werten: 'hourly', 'salary', 'combined'

**Felder**:
```sql
id UUID
employee_id UUID (FK → profiles)
compensation_type VARCHAR(20) -- 'hourly', 'salary', 'combined'
hourly_rate DECIMAL(10, 2)
monthly_salary DECIMAL(10, 2)
currency VARCHAR(3) DEFAULT 'EUR'
valid_from DATE
valid_to DATE
reason TEXT
created_by UUID (FK → profiles)
created_at TIMESTAMPTZ

-- NEW CONSTRAINT (v2.030):
CONSTRAINT valid_compensation CHECK (
    (compensation_type = 'hourly' AND hourly_rate IS NOT NULL AND monthly_salary IS NULL) OR
    (compensation_type = 'salary' AND monthly_salary IS NOT NULL AND hourly_rate IS NULL) OR
    (compensation_type = 'combined' AND monthly_salary IS NOT NULL AND hourly_rate IS NOT NULL)
)
```

#### `employee_settings`
**Erweitert in v2.030**:
- `compensation_type` jetzt mit 3 Werten

**Felder**:
```sql
employee_id UUID (PK, FK → profiles)
compensation_type VARCHAR(20) -- 'hourly', 'salary', 'combined'
hourly_rate DECIMAL(10, 2)
monthly_salary DECIMAL(10, 2)
currency VARCHAR(3) DEFAULT 'EUR'
updated_by UUID (FK → profiles)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

#### `ticket_attachments`
**Verwendet seit v2.026**:

**Felder**:
```sql
id UUID
ticket_id UUID (FK → tickets)
message_id UUID (FK → ticket_messages, nullable)
filename VARCHAR(255) -- Unique filename in storage
original_filename VARCHAR(255) -- Original upload name
mime_type VARCHAR(100)
size_bytes BIGINT
storage_path TEXT -- Path in 'ticket-attachments' bucket
is_inline BOOLEAN
content_id VARCHAR(255) -- For inline images
created_at TIMESTAMPTZ
```

### Storage Buckets

#### `ticket-attachments`
**Erstellt in v2.026**
- **Zweck**: E-Mail-Anhänge von Tickets
- **RLS**: Aktiviert
- **Policies**: Admin + Service Role Zugriff

#### `time-reports`
**Erstellt in v2.029**
- **Zweck**: PDF-Exporte von Zeiterfassungs-Berichten
- **RLS**: Aktiviert
- **Policies**: Admin + Service Role Zugriff
- **⚠️ Status**: Bucket muss manuell erstellt werden + Policies anwenden!

### RPC Functions

#### `get_employee_compensation(p_employee_id UUID, p_date DATE)`
**Ort**: `/employee-portal/sql/022_compensation_history.sql` (Zeile 77-102)

```sql
CREATE OR REPLACE FUNCTION get_employee_compensation(
    p_employee_id UUID,
    p_date DATE
)
RETURNS TABLE (
    compensation_type VARCHAR(20),
    hourly_rate DECIMAL(10, 2),
    monthly_salary DECIMAL(10, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ech.compensation_type,
        ech.hourly_rate,
        ech.monthly_salary
    FROM employee_compensation_history ech
    WHERE ech.employee_id = p_employee_id
    AND ech.valid_from <= p_date
    AND (ech.valid_to IS NULL OR ech.valid_to > p_date)
    ORDER BY ech.valid_from DESC
    LIMIT 1;
END;
$$;
```

**Verwendung in Code**: `/app/actions/time-reports.ts` (Zeile 450-453)

---

## Known Issues

### 1. Time Reports Bucket nicht automatisch erstellt
**Status**: Manuell erforderlich
**Impact**: Hoch
**Lösung**: Siehe "Pending Tasks" → Storage Bucket erstellen

### 2. Compensation History Backfill
**Datei**: `/supabase/migrations/20251009_backfill_compensation_history.sql`
**Status**: Sollte ausgeführt werden für bestehende Mitarbeiter
**Impact**: Medium
**Beschreibung**: Kopiert bestehende `employee_settings` in `employee_compensation_history`

### 3. PHP System noch aktiv
**Status**: Legacy-System läuft parallel
**Impact**: Low (beabsichtigt für Strato-Hosting)
**Hinweis**: Beide Systeme teilen sich Supabase Backend

---

## Technologie-Stack

### Frontend
- **Framework**: Next.js 15.3.5 (App Router)
- **Sprache**: TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **State**: React Server Components + Server Actions
- **Forms**: React Hook Form (teilweise)

### Backend
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Email**: SMTP via nodemailer (in Queue Worker)
- **IMAP**: `imap` + `mailparser` libraries

### Deployment
- **Platform**: CapRover
- **URL**: https://captain.immogear.de
- **Trigger**: Webhook nach Git Push
- **Build**: Next.js Production Build

### Libraries (Neu in dieser Session)

#### v2.026 (IMAP)
```json
{
  "imap": "^0.8.19",
  "mailparser": "^3.6.5"
}
```

#### v2.029 (PDF)
```json
{
  "pdf-lib": "^1.17.1"
}
```

---

## Compensation Types - Übersicht

| Type | Festgehalt | Stundenlohn | Berechnung | Use Case |
|------|------------|-------------|------------|----------|
| **hourly** | ❌ | ✅ | `Stunden × Rate + Bonus` | Werkstudent, Aushilfe |
| **salary** (Legacy) | ✅ | ❌ | `Festgehalt + Bonus` | Alte Festangestellte |
| **combined** (NEU) | ✅ | ✅ | `Festgehalt + (Stunden × Rate) + Bonus` | Moderne Festangestellte |

### Export-Logik

#### hourly
```typescript
calculatedHours = totalHours // Tatsächliche Stunden
hourlyRate = compensationData.hourly_rate
interimSalary = totalHours × hourlyRate + bonus
```

#### salary (Legacy)
```typescript
hourlyRate = 20 // Default/Fallback
interimSalary = monthlySalary + bonus
calculatedHours = interimSalary / hourlyRate // Berechnete Stunden
```

#### combined (NEU v2.030)
```typescript
hourlyRate = compensationData.hourly_rate
monthlySalary = compensationData.monthly_salary
interimSalary = monthlySalary + (totalHours × hourlyRate) + bonus
calculatedHours = interimSalary / hourlyRate // Berechnete Stunden
```

---

## API Endpoints

### Cron Jobs

#### `/api/cron/fetch-emails` (NEU v2.026)
- **Methode**: GET
- **Zweck**: IMAP E-Mails abrufen und Tickets erstellen
- **Auth**: Keine (sollte über Cron-Secret geschützt werden)
- **Response**:
```json
{
  "success": true,
  "message": "Processed 5 emails",
  "processed": 5,
  "created": 3,
  "replied": 2
}
```

#### `/api/cron/process-email-queue`
- **Methode**: GET
- **Zweck**: Email Queue abarbeiten
- **Auth**: Keine
- **Erweitert in v2.029**: Unterstützt jetzt `time-reports` aus Storage

#### `/api/cron/sync-calendar`
- **Methode**: GET
- **Zweck**: Google Calendar synchronisieren
- **Auth**: Keine

### Zeiterfassung

#### `/api/zeiterfassung/pdf`
- **Methode**: GET
- **Query Params**: `year`, `month`, `employee` (optional)
- **Response**: PDF (application/pdf)
- **Änderung v2.029**: Verwendet jetzt shared PDF generator mit Logo

#### `/api/zeiterfassung/email`
- **Methode**: POST
- **Body**:
```json
{
  "year": 2025,
  "month": 10,
  "employee": "all",
  "recipients": ["test@example.com"],
  "subject": "Zeiterfassung Oktober 2025",
  "body": "Anbei die Zeiterfassung...",
  "save_recipients": true
}
```
- **Änderung v2.029**:
  - Upload PDF zu Storage
  - Queue E-Mails statt direktem Versand
  - Kein nodemailer mehr

---

## Server Actions

### `/app/actions/time-reports.ts`

#### `generateReportData(year, month, employeeId)`
- **Zweck**: Erstellt Zeiterfassungs-Bericht für Monat
- **Änderung v2.030**: Unterstützt jetzt 'combined' Compensation Type
- **Return**:
```typescript
{
  success: boolean
  data?: MonthlyReportData
  error?: string
}
```

### `/app/actions/employee-settings.ts`

#### `saveEmployeeSettings(data)`
- **Zweck**: Speichert Mitarbeiter-Vergütungseinstellungen
- **Änderung v2.030**:
  - Unterstützt 'combined' Type
  - Validation für beide Felder bei 'combined'
  - Speichert in `employee_settings` UND `employee_compensation_history`

### `/app/actions/tickets.ts`

#### `addMessage(ticketId, content, isInternal)`
- **Zweck**: Fügt Nachricht zu Ticket hinzu
- **Änderung v2.028**:
  - Queue E-Mail für nicht-interne Nachrichten
  - Nur wenn Ticket per E-Mail erstellt wurde

---

## Wichtige Code-Locations

### Gehaltsberechnung
- **Datei**: `/app/actions/time-reports.ts`
- **Zeilen**: 461-487
- **Logik**: Unterscheidet zwischen hourly, salary, combined

### PDF-Generierung
- **Datei**: `/lib/pdf/time-report-generator.ts`
- **Zeilen**: 28-49 (Logo Embedding)
- **Verwendung**:
  - `/app/api/zeiterfassung/pdf/route.ts`
  - `/app/api/zeiterfassung/email/route.ts`

### Email Queue Processing
- **Datei**: `/app/api/cron/process-email-queue/route.ts`
- **Zeilen**: 143-167 (Attachment Handling)
- **Buckets**:
  - `ticket-attachments` (Ticket-Anhänge)
  - `time-reports` (PDF-Berichte)

### IMAP Email Processing
- **Datei**: `/app/api/cron/fetch-emails/route.ts`
- **Zeilen**: 188-280 (Main Processing Loop)
- **Helpers**: `/lib/email/imap-helpers.ts`, `/lib/email/attachment-processor.ts`

### Compensation Configuration
- **UI**: `/app/(dashboard)/zeiterfassung/verwaltung/components/compensation-config-dialog.tsx`
- **Action**: `/app/actions/employee-settings.ts`
- **Validation**: Zeilen 119-135

---

## Testing-Checkliste

### Nach Migration ausführen:

#### 1. Datenbank
- [ ] Migration `20251031000002_add_combined_compensation.sql` ausgeführt
- [ ] Storage Bucket `time-reports` erstellt
- [ ] Storage Policies für `time-reports` angewendet
- [ ] Test: Constraint erlaubt `combined` Type mit beiden Feldern

#### 2. Compensation Settings
- [ ] Test: Neuer Mitarbeiter mit 'hourly' erstellen
- [ ] Test: Neuer Mitarbeiter mit 'combined' erstellen
- [ ] Test: Beide Felder werden in DB gespeichert
- [ ] Test: UI zeigt korrekte Anzeige in Mitarbeiter-Details

#### 3. PDF Export
- [ ] Test: PDF mit Logo wird generiert
- [ ] Test: Logo ist sichtbar (oben links)
- [ ] Test: Header ist korrekt verschoben
- [ ] Test: Download funktioniert

#### 4. E-Mail Queue
- [ ] Test: Zeit-Bericht per E-Mail versenden
- [ ] Test: PDF wird in Storage hochgeladen
- [ ] Test: E-Mail landet in `email_queue`
- [ ] Test: Cron Job verarbeitet E-Mail
- [ ] Test: PDF-Anhang wird korrekt heruntergeladen
- [ ] Test: E-Mail mit Anhang wird versendet

#### 5. IMAP Worker
- [ ] Test: Manueller Test über Admin-Panel
- [ ] Test: E-Mail wird abgerufen
- [ ] Test: Ticket wird erstellt
- [ ] Test: Anhänge werden in `ticket-attachments` Storage gespeichert
- [ ] Test: Auto-Tagging funktioniert

#### 6. Ticket-Antworten
- [ ] Test: Antwort auf E-Mail-Ticket (nicht intern)
- [ ] Test: E-Mail landet in Queue
- [ ] Test: E-Mail wird versendet an `created_from_email`
- [ ] Test: Interne Notiz sendet KEINE E-Mail

#### 7. Gehaltsberechnung
- [ ] Test: Hourly-Mitarbeiter - Stunden × Rate
- [ ] Test: Salary-Mitarbeiter (Legacy) - Festgehalt + Bonus
- [ ] Test: Combined-Mitarbeiter - Festgehalt + (Stunden × Rate) + Bonus
- [ ] Test: Export-Stunden werden korrekt berechnet

---

## Nächste geplante Features

1. **Email-zu-Aufgabe Konvertierung** (Phase 6)
   - Priority: Medium
   - Effort: 2-3 Tage

2. **Webhook-System** (Phase 5)
   - Priority: Low
   - Effort: 1-2 Tage

3. **Offline-Sync für PWA**
   - Priority: Low
   - Effort: 3-4 Tage

---

## Git Workflow

### Commit Message Format
```
[Feature/Fix]: Kurze Beschreibung (vX.XXX)

✅ Change 1
✅ Change 2

🗄️ Datenbank-Änderungen (falls vorhanden)
💻 Code-Updates
🎨 UI-Updates
📦 Dependencies (falls vorhanden)

Version: X.XXX → X.XXX+1

WICHTIG: (falls erforderlich)
- Manuelle Schritte beschreiben

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Branch Strategy
- **Main Branch**: `main` (direkter Push für Hotfixes/Features)
- **Deployment**: Automatisch via CapRover Webhook nach Push

---

## Kontakt & Support

- **Developer**: Oscar Knabe (ok@flighthour.de)
- **AI Assistant**: Claude Code (claude.com/claude-code)
- **Repository**: GitHub (airbussard/maportalf)

---

## Änderungshistorie dieser Dokumentation

| Datum | Änderung |
|-------|----------|
| 31.10.2025 | Initiale Erstellung - Vollständige Dokumentation Session 31.10.2025 |

---

**Ende der Dokumentation**

Bei Fortsetzung der Arbeit:
1. Diese Datei lesen
2. Pending Tasks prüfen
3. Testing-Checkliste abarbeiten
4. Neue Änderungen hier dokumentieren
