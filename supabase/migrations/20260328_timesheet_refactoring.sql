-- =============================================
-- Timesheet Refactoring: Kalenderbasierte Abrechnung
-- =============================================

-- Neue Tabelle: timesheet_entries
-- Speichert pro Tag die kalenderbasierte Arbeitszeitberechnung
CREATE TABLE IF NOT EXISTS timesheet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  date DATE NOT NULL,

  -- Automatisch aus Kalender berechnet
  calendar_minutes INTEGER NOT NULL DEFAULT 0,
  calendar_booking_count INTEGER NOT NULL DEFAULT 0,
  fi_shift_minutes INTEGER DEFAULT 0,

  -- User-Anpassungen
  adjusted_minutes INTEGER,
  adjustment_reason TEXT,
  adjusted_at TIMESTAMPTZ,
  adjusted_by UUID REFERENCES profiles(id),

  -- Manuelle Zusatzeinträge
  manual_minutes INTEGER DEFAULT 0,
  manual_description TEXT,

  -- Metadaten
  booking_details JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT timesheet_entries_unique_day UNIQUE(employee_id, date)
);

-- Indices
CREATE INDEX idx_timesheet_entries_employee_month ON timesheet_entries(employee_id, year, month);
CREATE INDEX idx_timesheet_entries_date ON timesheet_entries(date);

-- Updated-at Trigger
CREATE OR REPLACE FUNCTION update_timesheet_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER timesheet_entries_updated_at
  BEFORE UPDATE ON timesheet_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_timesheet_entries_updated_at();

-- RLS
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;

-- Employees: eigene Einträge lesen
CREATE POLICY "employees_read_own_timesheet" ON timesheet_entries
  FOR SELECT USING (auth.uid() = employee_id);

-- Employees: eigene Einträge anpassen (adjusted_minutes, manual)
CREATE POLICY "employees_update_own_timesheet" ON timesheet_entries
  FOR UPDATE USING (auth.uid() = employee_id);

-- Admins: alles lesen
CREATE POLICY "admins_read_all_timesheets" ON timesheet_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins: alles bearbeiten
CREATE POLICY "admins_manage_timesheets" ON timesheet_entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Service Role: vollen Zugriff (für Cron/Server Actions)
CREATE POLICY "service_role_full_access_timesheets" ON timesheet_entries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================
-- time_reports Erweiterungen
-- =============================================

ALTER TABLE time_reports
  ADD COLUMN IF NOT EXISTS confirmed_by_employee BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS calendar_total_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manual_total_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adjusted_total_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idle_minutes INTEGER DEFAULT 0;
