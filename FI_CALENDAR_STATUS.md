# FI Calendar System - Implementation Status

## ✅ VOLLSTÄNDIG IMPLEMENTIERT:

### 1. Datenbank (LIVE in Supabase):
- ✅ `profiles.employee_number` (FH001, FH002, etc.)
- ✅ Auto-Generierung mit Trigger
- ✅ `calendar_events.event_type` ('booking' | 'fi_assignment')
- ✅ `calendar_events.assigned_instructor_id` (FK zu profiles)
- ✅ `calendar_events.assigned_instructor_number` (FH001, etc.)
- ✅ `calendar_events.assigned_instructor_name` (Name)
- ✅ `calendar_events.is_all_day` (boolean)
- ✅ `calendar_events.request_id` (für zukünftige Integration)

### 2. TypeScript Types:
- ✅ `CalendarEventData` erweitert mit FI-Feldern
- ✅ Form State im Event-Dialog erweitert

### 3. Backend Actions:
- ✅ `getEmployees()` - Holt alle Mitarbeiter mit Personalnummern

### 4. UI Components Imports:
- ✅ RadioGroup, Select, Checkbox importiert

## ⏳ NOCH ZU IMPLEMENTIEREN:

### 1. Event-Dialog UI (KRITISCH):
**Benötigt:**
- [ ] Radio-Buttons für Typ-Auswahl (Buchung / FI-Mitarbeiter)
- [ ] Conditional Rendering basierend auf event_type
- [ ] Mitarbeiter-Select mit Autocomplete
- [ ] Freitext-Eingabe Alternative
- [ ] Ganztägig-Checkbox
- [ ] Bedingte Validierung

**Beispiel-Code:**
```tsx
<RadioGroup value={formData.event_type} onValueChange={(value) => setFormData({...formData, event_type: value})}>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="booking" id="booking" />
    <Label htmlFor="booking">Buchung</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="fi_assignment" id="fi" />
    <Label htmlFor="fi">FI-Mitarbeiter</Label>
  </div>
</RadioGroup>

{formData.event_type === 'fi_assignment' && (
  // FI-spezifische Felder...
)}
```

### 2. Event-Card Styling:
**Benötigt:**
- [ ] Conditional className basierend auf event.event_type
- [ ] Gelber Hintergrund #FCD34D für FI-Events
- [ ] Format: "FI: [Name] (FH001)"
- [ ] Badge "Geplanter Mitarbeiter" in Gelb
- [ ] Zeitanzeige nur wenn !is_all_day

### 3. Google Calendar Sync:
**In `lib/google-calendar/service.ts`:**
- [ ] FI-Events immer als 08:00-09:00 exportieren
- [ ] Titel-Format: "FI: [Name] (FH001)"
- [ ] Beschreibung: Tatsächliche Zeiten wenn spezifisch
- [ ] In `createGoogleCalendarEvent()` und `updateGoogleCalendarEvent()`

### 4. Calendar-View Visuals:
- [ ] Gelbe Punkte im Kalender-Grid für FI-Events
- [ ] Separate Badge-Farbe in Event-Liste
- [ ] Optional: Zählung "X Buchungen, Y FI"

## DATEIEN ZUM BEARBEITEN:

1. `app/(dashboard)/kalender/components/event-dialog.tsx` - FI-Felder hinzufügen
2. `app/(dashboard)/kalender/components/event-card.tsx` - Styling + Format
3. `lib/google-calendar/service.ts` - 08:00-09:00 für FI-Events
4. `app/(dashboard)/kalender/components/calendar-view.tsx` - Visuelle Unterscheidung

## NÄCHSTER SCHRITT:

**Option A**: Event-Dialog schrittweise erweitern (empfohlen)
- Kleiner, testbarer Commit
- Radio-Buttons + conditional rendering
- Dann Mitarbeiter-Select

**Option B**: Alle UI-Änderungen auf einmal
- Größerer Commit
- Mehr Testing erforderlich

**Option C**: Minimale funktionierende Version
- Nur Freitext-Eingabe (kein Select)
- Schneller zum Testen

## TESTING CHECKLIST:

Nach Implementierung:
- [ ] Neues FI-Event erstellen (Freitext)
- [ ] Neues FI-Event erstellen (DB-Mitarbeiter)
- [ ] Ganztägiges FI-Event erstellen
- [ ] FI-Event mit Zeitraum erstellen
- [ ] Google Calendar: Event ist 08:00-09:00
- [ ] Gelbes Styling sichtbar
- [ ] FI-Event bearbeiten
- [ ] FI-Event löschen
