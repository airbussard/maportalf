# Supabase Migrationen manuell ausführen

## ⚠️ WICHTIG: Migrationen werden NICHT automatisch ausgeführt

Die SQL-Dateien in `/supabase/migrations/` werden **nicht automatisch** auf die produktive Datenbank angewendet. Sie müssen **manuell in der Supabase Console** ausgeführt werden.

## Aktuelle ausstehende Migrationen (Stand: 31.10.2025)

### 1. Employee Number Race Condition Fix
**Datei**: `supabase/migrations/20251031000000_fix_employee_number_race_condition.sql`

**Was macht sie**:
- Fügt Advisory Lock zur `generate_employee_number()` Funktion hinzu
- Verhindert Race Conditions bei gleichzeitiger Mitarbeiter-Erstellung
- Stellt sicher, dass FH-Nummern eindeutig vergeben werden

**Ausführen**:
```sql
-- Kopiere den gesamten Inhalt der Datei und führe ihn im Supabase SQL Editor aus
```

### 2. Profile Creation Trigger
**Datei**: `supabase/migrations/20251031000001_ensure_profile_creation_trigger.sql`

**Was macht sie**:
- Erstellt einen Trigger auf `auth.users`
- Legt automatisch ein Profile in `public.profiles` an, wenn ein User erstellt wird
- Behebt "Database error creating new user" Fehler

**Ausführen**:
```sql
-- Kopiere den gesamten Inhalt der Datei und führe ihn im Supabase SQL Editor aus
```

## Schritt-für-Schritt Anleitung

### 1. Supabase Dashboard öffnen
- Gehe zu https://supabase.com/dashboard
- Wähle dein Projekt aus

### 2. SQL Editor öffnen
- Klicke auf "SQL Editor" im linken Menü
- Klicke auf "New query"

### 3. Migration 1 ausführen
1. Öffne die Datei: `supabase/migrations/20251031000000_fix_employee_number_race_condition.sql`
2. Kopiere den **gesamten Inhalt**
3. Füge ihn in den SQL Editor ein
4. Klicke auf "Run" oder drücke `Cmd/Ctrl + Enter`
5. Prüfe, dass keine Fehler aufgetreten sind

### 4. Migration 2 ausführen
1. Klicke auf "New query" für eine neue SQL-Abfrage
2. Öffne die Datei: `supabase/migrations/20251031000001_ensure_profile_creation_trigger.sql`
3. Kopiere den **gesamten Inhalt**
4. Füge ihn in den SQL Editor ein
5. Klicke auf "Run" oder drücke `Cmd/Ctrl + Enter`
6. Prüfe, dass keine Fehler aufgetreten sind

### 5. Testen
Nach erfolgreicher Ausführung:
- Versuche einen neuen Mitarbeiter anzulegen
- Die FH-Nummer sollte automatisch vergeben werden
- Es sollten keine "Database error" Fehler mehr auftreten

## Häufige Probleme

### "permission denied for schema auth"
**Lösung**: Stelle sicher, dass du als **Postgres Admin** eingeloggt bist (nicht als Service Role)

### "function already exists"
**Lösung**: Das ist normal - die Migrationen verwenden `CREATE OR REPLACE`, sodass sie mehrfach ausgeführt werden können

### "relation auth.users does not exist"
**Lösung**: Du bist im falschen Schema. Stelle sicher, dass die Supabase Auth Extension aktiviert ist.

## Zukünftige Migrationen

**Wichtig**: Jedes Mal, wenn neue SQL-Dateien im `/supabase/migrations/` Ordner hinzugefügt werden, müssen diese **manuell** wie oben beschrieben ausgeführt werden.

Alternativ kann ein automatisches Migrations-System mit Supabase CLI eingerichtet werden - dies ist derzeit aber nicht konfiguriert.
