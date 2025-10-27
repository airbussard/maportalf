# Projektstand: Vergütungssystem für Mitarbeiter

**Datum**: 15. Oktober 2025
**Version**: 1.102
**Status**: Implementierung abgeschlossen, Migration ausstehend

---

## Übersicht

Implementierung eines flexiblen Vergütungssystems mit drei verschiedenen Abrechnungsmodellen für Mitarbeiter:

### Vergütungsmodelle

1. **Model A - Reiner Stundenlohn**
   - `compensation_type = 'hourly'`
   - Berechnung: `Gehalt = Stunden × Stundensatz + Bonus`
   - Export: Tatsächlich gearbeitete Stunden

2. **Model B - Reines Festgehalt**
   - `compensation_type = 'salary'`
   - Mitarbeiter erfasst keine Stunden
   - Berechnung: `Gehalt = Monatsgehalt + Bonus`
   - Export: `Stunden = Gehalt / Stundensatz`

3. **Model C - Festgehalt + Stundenlohn**
   - `compensation_type = 'salary'`
   - Mitarbeiter erfasst zusätzliche Stunden
   - Berechnung: `Gehalt = Monatsgehalt + (Stunden × Stundensatz) + Bonus`
   - Export: `Stunden = Gehalt / Stundensatz`

---

## Datenbankstruktur

### Tabellen

#### `employee_settings` (Haupttabelle)
```sql
- id (uuid, primary key)
- employee_id (uuid, foreign key → profiles.id)
- compensation_type ('hourly' | 'salary')
- hourly_rate (decimal)
- monthly_salary (decimal, nullable)
- currency (text, default 'EUR')
- updated_by (uuid)
- created_at (timestamp)
- updated_at (timestamp)
```

#### `employee_compensation_history` (Historisierung)
```sql
- id (uuid, primary key)
- employee_id (uuid, foreign key → profiles.id)
- compensation_type ('hourly' | 'salary')
- hourly_rate (decimal)
- monthly_salary (decimal, nullable)
- currency (text)
- valid_from (date)
- valid_to (date, nullable)
- created_by (uuid)
- created_at (timestamp)
- reason (text)
```

#### `time_reports` (Erweitert)
```sql
-- Hinzugefügt:
- bonus_amount (decimal, default 0)
  → Monatlicher Bonus ON TOP auf Grundgehalt
```

### Migrationen

1. ✅ `20251009_add_bonus_to_time_reports.sql`
   - Fügt `bonus_amount` Spalte zu `time_reports` hinzu

2. ⏳ `20251009_backfill_compensation_history.sql` **AUSSTEHEND**
   - Erstellt History-Einträge für alle bestehenden `employee_settings`
   - Notwendig für korrekten Export
   - **MUSS IN SUPABASE AUSGEFÜHRT WERDEN**

---

## Server Actions

### Neue Datei: `app/actions/employee-settings.ts`

#### `getAllEmployeeSettings()`
```typescript
// Zugriff: Admin, Manager
// Lädt alle Vergütungseinstellungen für Tabellenanzeige
// Verwendet Admin Client (bypasses RLS)
```

#### `getEmployeeSettings(employeeId: string)`
```typescript
// Zugriff: Admin
// Lädt Einstellungen für einen spezifischen Mitarbeiter
// Für Bearbeitungsdialog
```

#### `saveEmployeeSettings(data)`
```typescript
// Zugriff: Admin
// Speichert/Aktualisiert Vergütungseinstellungen
// Validierung je nach compensation_type
// Erstellt automatisch History-Eintrag
// Parameter:
// - employee_id: string
// - compensation_type: 'hourly' | 'salary'
// - hourly_rate: number (immer erforderlich)
// - monthly_salary: number (nur bei salary)
```

### Geänderte Datei: `app/actions/time-reports.ts`

#### `closeMonth()` - Erweitert
```typescript
// Neuer Parameter: bonusAmount?: number
// Wird in time_report gespeichert
```

#### `generateReportData()` - Korrigiert
```typescript
// Zeilen 461-475: Korrekte Berechnung
// Für 'hourly': salary = hours × rate + bonus
// Für 'salary': salary = monthly_salary + (hours × rate) + bonus
// Export-Stunden: total_salary / hourly_rate (nur bei salary)
```

---

## UI-Komponenten

### Neue Komponente: `CompensationConfigDialog`
**Pfad**: `app/(dashboard)/zeiterfassung/verwaltung/components/compensation-config-dialog.tsx`

**Features**:
- Radio buttons für Vergütungsart
  - "Stundenlohn"
  - "Festgehalt + Stundenlohn"
- Dynamische Eingabefelder je nach Auswahl
- Validierung
- Info-Box mit Erklärung

**Props**:
```typescript
interface CompensationConfigDialogProps {
  isOpen: boolean
  onClose: () => void
  employeeId: string
  employeeName: string
  onSave?: () => void
}
```

### Geänderte Komponenten

#### 1. `/mitarbeiter` Seite

**`page.tsx`**:
- Lädt `employeeSettings` parallel zu `employees`
- Übergibt beide an `EmployeesTable`

**`employees-table.tsx`**:
- Neue Spalte "Vergütung" (nur für Admin/Manager)
- Zeigt Vergütung in Tabellenübersicht
- Format: "3.000€/Monat" oder "25€/Std."

**`employee-detail-modal.tsx`**:
- Vergütungsbereich im Admin-Bereich
- Zeigt aktuelle Konfiguration
- Button zum Öffnen des CompensationConfigDialog

#### 2. `/zeiterfassung/verwaltung` Seite

**`page.tsx`**:
- Lädt `employeeSettings` via `getAllEmployeeSettings()`
- Übergibt an `AdminTimeTrackingView`

**`admin-time-tracking-view.tsx`**:
- Neue Props: `employeeSettings: EmployeeSettings[]`
- `settingsMap` für O(1) Lookups
- Neue Funktion: `getCompensationDisplay(employeeId)`
- Tabellenspalte "Vergütung" zeigt:
  - Vergütungswert (z.B. "3.000€/Monat")
  - Settings-Icon zum Bearbeiten

---

## Berechnungslogik

### Export-Berechnung (generateReportData)

```typescript
// 1. Hole compensation_data via RPC
const { data: compensation } = await adminSupabase
  .rpc('get_employee_compensation', {
    p_employee_id: employee.id,
    p_date: startDate
  })

// 2. Berechne je nach Typ
if (compensation_type === 'hourly') {
  hourlyRate = compensation.hourly_rate || 0
  interimSalary = (totalHours * hourlyRate) + bonusAmount
  calculatedHours = totalHours // Echte Stunden
} else {
  // salary type
  const monthlySalary = compensation.monthly_salary || 0
  hourlyRate = compensation.hourly_rate || 20
  interimSalary = monthlySalary + (totalHours * hourlyRate) + bonusAmount
  calculatedHours = Math.round((interimSalary / hourlyRate) * 100) / 100
}

// 3. Provision
const provision = evaluationCount * 50

// 4. Gesamtgehalt
const totalSalary = interimSalary + provision
```

### Wichtige Felder im Export

```typescript
interface EmployeeReportData {
  employee_id: string
  employee_name: string
  employee_email: string
  work_days: number
  total_hours: number         // Bei salary: berechnete Stunden!
  hourly_rate: number
  interim_salary: number      // Grundgehalt ohne Provision
  bonus_amount: number        // Monatlicher Bonus
  evaluation_count: number
  provision: number           // 50€ × Anzahl Evaluierungen
  total_salary: number        // interim_salary + provision
}
```

---

## Zugriffskontrolle

### Admin
- ✅ Voller Zugriff auf alle Vergütungsfunktionen
- ✅ Kann Vergütung konfigurieren
- ✅ Sieht Vergütung in allen Übersichten

### Manager
- ✅ Sieht Vergütung in `/mitarbeiter`
- ❌ Kann Vergütung NICHT konfigurieren (nur Admin)

### Employee (Mitarbeiter)
- ❌ Sieht eigene Vergütung nicht
- ✅ Erfasst nur Arbeitszeiten

---

## RPC-Funktionen

### `get_employee_compensation(p_employee_id, p_date)`

**Zweck**: Holt Vergütungsdaten für ein bestimmtes Datum

**Abfrage**:
- Sucht in `employee_compensation_history`
- Filter: `valid_from <= p_date AND (valid_to IS NULL OR valid_to > p_date)`
- Fallback zu `employee_settings` wenn keine History

**Wichtig**:
- Braucht History-Einträge für korrekten Export
- Daher Migration `20251009_backfill_compensation_history.sql` notwendig

---

## Offene Punkte / TODO

### 🔴 KRITISCH - Migration ausführen

```sql
-- In Supabase SQL Editor ausführen:
-- Datei: supabase/migrations/20251009_backfill_compensation_history.sql

INSERT INTO employee_compensation_history (...)
SELECT ... FROM employee_settings es
WHERE NOT EXISTS (
  SELECT 1 FROM employee_compensation_history ech
  WHERE ech.employee_id = es.employee_id
);
```

**Warum notwendig**:
- Bestehende Vergütungseinstellungen haben keine History-Einträge
- Export zeigt 0€ ohne History
- Migration erstellt Einträge mit `valid_from = gestern`

### 🟡 Empfohlene Tests

1. **Stundenlohn-Mitarbeiter**:
   - Vergütung konfigurieren (nur Stundensatz)
   - Stunden erfassen
   - Monat abschließen
   - Export prüfen: Gehalt = Stunden × Satz

2. **Festgehalt-Mitarbeiter ohne Stunden**:
   - Vergütung konfigurieren (Festgehalt + Stundensatz)
   - Keine Stunden erfassen
   - Monat abschließen
   - Export prüfen: Gehalt = Festgehalt, Stunden = Festgehalt/Satz

3. **Festgehalt-Mitarbeiter mit Stunden**:
   - Vergütung konfigurieren (Festgehalt + Stundensatz)
   - Stunden erfassen
   - Monat abschließen
   - Export prüfen: Gehalt = Festgehalt + (Stunden × Satz)

4. **Mit Bonus**:
   - Beim Monatsabschluss Bonus eingeben
   - Export prüfen: Bonus wird addiert, Stunden angepasst

---

## Technische Details

### TypeScript Interfaces

```typescript
// lib/types/time-tracking.ts
export interface EmployeeSettings {
  id: string
  employee_id: string
  compensation_type: 'hourly' | 'salary'
  hourly_rate: number | null
  monthly_salary: number | null
  currency: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface TimeReport {
  // ... bestehende Felder
  bonus_amount: number  // NEU
}
```

### Wichtige Dateien

```
app/
├── actions/
│   ├── employee-settings.ts          [NEU]
│   └── time-reports.ts               [GEÄNDERT]
│
├── (dashboard)/
│   ├── mitarbeiter/
│   │   ├── page.tsx                  [GEÄNDERT]
│   │   └── components/
│   │       ├── employees-table.tsx   [GEÄNDERT]
│   │       └── employee-detail-modal.tsx [GEÄNDERT]
│   │
│   └── zeiterfassung/
│       └── verwaltung/
│           ├── page.tsx              [GEÄNDERT]
│           └── components/
│               ├── admin-time-tracking-view.tsx [GEÄNDERT]
│               └── compensation-config-dialog.tsx [NEU]
│
lib/
└── types/
    └── time-tracking.ts              [GEÄNDERT]

supabase/
└── migrations/
    ├── 20251009_add_bonus_to_time_reports.sql [AUSGEFÜHRT]
    └── 20251009_backfill_compensation_history.sql [AUSSTEHEND]
```

---

## UI/UX Details

### Vergütungskonfiguration Dialog

**Validierung**:
- Stundenlohn: `hourlyRate > 0` erforderlich
- Festgehalt: `monthlySalary > 0` UND `hourlyRate > 0` erforderlich

**Labels**:
- Radio 1: "Stundenlohn"
- Radio 2: "Festgehalt + Stundenlohn"
  - Klarstellung: Stunden werden ON TOP zum Festgehalt addiert

**Info-Box**:
> "Bei Festgehalt wird die Stundenanzahl im Export automatisch berechnet als: (Monatsgehalt + Bonus) / Stundensatz. Der Bonus kann pro Monat beim Abschließen des Berichts angegeben werden."

### Tabellenanzeige

**Mitarbeiter-Übersicht** (`/mitarbeiter`):
- Spalte nur für Admin/Manager sichtbar
- Format kompakt: "3.000€/Monat" oder "25€/Std."
- Klick auf Zeile → Detail-Modal mit Bearbeitungsoption

**Zeit-Verwaltung** (`/zeiterfassung/verwaltung`):
- Spalte "Vergütung" mit Wert + Settings-Icon
- Icon öffnet CompensationConfigDialog
- Nach Speichern: Automatischer Reload

---

## Performance-Optimierungen

1. **Parallele Datenladung**:
   ```typescript
   const [employeesResult, settingsResult] = await Promise.all([
     getEmployees(),
     getAllEmployeeSettings()
   ])
   ```

2. **Map für schnelle Lookups**:
   ```typescript
   const settingsMap = new Map(
     employeeSettings.map(s => [s.employee_id, s])
   )
   ```

3. **Admin Client für RLS-Bypass**:
   - `getAllEmployeeSettings()` verwendet Admin Client
   - Verhindert Performance-Probleme bei vielen Mitarbeitern

---

## Bekannte Einschränkungen

1. **Keine historische Änderung von Vergütung innerhalb laufendem Monat**:
   - Änderungen gelten ab Speicherung
   - Bereits geschlossene Monate bleiben unverändert

2. **Bonus kann nur beim Monatsabschluss eingetragen werden**:
   - Nicht nachträglich änderbar
   - Monat muss wieder geöffnet werden

3. **Stundensatz bei Festgehalt ist Pflicht**:
   - Wird für Export-Berechnung benötigt
   - Auch wenn keine Stunden erfasst werden

---

## Nächste Schritte

### Sofort
1. ✅ Migration `20251009_backfill_compensation_history.sql` in Supabase ausführen
2. ✅ Testen der drei Vergütungsmodelle
3. ✅ Export mit realen Daten validieren

### Optional / Zukünftig
1. Vergütungshistorie in UI anzeigen
2. Batch-Import von Vergütungseinstellungen
3. Reporting: Vergütungskosten pro Monat
4. Excel-Export mit Vergütungsdetails

---

## Kontakt & Support

Bei Fragen oder Problemen:
- Claude Code Session fortsetzen mit dieser Datei
- Supabase Logs prüfen bei Fehlern
- Browser Console bei UI-Problemen

**Wichtig**: Diese Datei vor nächster Session lesen!
