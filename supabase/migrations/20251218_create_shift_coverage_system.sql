-- Shift Coverage Request System
-- Ermöglicht Managern/Admins, Mitarbeiter für unbesetzte Tage anzufragen

-- Haupttabelle für Schichtanfragen
CREATE TABLE IF NOT EXISTS shift_coverage_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_date DATE NOT NULL,
  is_full_day BOOLEAN DEFAULT true,
  start_time TIME,
  end_time TIME,
  reason TEXT,

  -- Status: open, accepted, cancelled, expired
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'cancelled', 'expired')),

  -- Wer hat erstellt (Manager/Admin)
  created_by UUID REFERENCES profiles(id),

  -- Wer hat angenommen (Mitarbeiter)
  accepted_by UUID REFERENCES profiles(id),
  accepted_at TIMESTAMPTZ,

  -- Verknüpfung zum erstellten Work Request
  work_request_id UUID REFERENCES work_requests(id),

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days')
);

-- Benachrichtigungen pro Mitarbeiter
CREATE TABLE IF NOT EXISTS shift_coverage_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coverage_request_id UUID REFERENCES shift_coverage_requests(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES profiles(id),

  -- Benachrichtigungsstatus
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  sms_sent BOOLEAN DEFAULT false,
  sms_sent_at TIMESTAMPTZ,

  -- Token für Annahme (einmalig verwendbar)
  accept_token UUID UNIQUE DEFAULT gen_random_uuid(),
  token_used BOOLEAN DEFAULT false,
  token_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_shift_coverage_requests_status ON shift_coverage_requests(status);
CREATE INDEX IF NOT EXISTS idx_shift_coverage_requests_date ON shift_coverage_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_shift_coverage_requests_created_by ON shift_coverage_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_shift_coverage_notifications_token ON shift_coverage_notifications(accept_token);
CREATE INDEX IF NOT EXISTS idx_shift_coverage_notifications_request ON shift_coverage_notifications(coverage_request_id);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_shift_coverage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shift_coverage_requests_updated_at
  BEFORE UPDATE ON shift_coverage_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_shift_coverage_updated_at();

-- RLS Policies
ALTER TABLE shift_coverage_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_coverage_notifications ENABLE ROW LEVEL SECURITY;

-- Manager/Admin können alle Anfragen sehen und erstellen
CREATE POLICY "Managers can view all shift coverage requests"
  ON shift_coverage_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers can create shift coverage requests"
  ON shift_coverage_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers can update shift coverage requests"
  ON shift_coverage_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

-- Service Role kann alles (für Token-basierte Annahme)
CREATE POLICY "Service role has full access to shift coverage requests"
  ON shift_coverage_requests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Notifications: Manager können sehen, Service Role kann alles
CREATE POLICY "Managers can view shift coverage notifications"
  ON shift_coverage_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers can create shift coverage notifications"
  ON shift_coverage_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Service role has full access to shift coverage notifications"
  ON shift_coverage_notifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Email Queue Type erweitern (falls CHECK constraint existiert)
DO $$
BEGIN
  -- Versuche den bestehenden CHECK constraint zu löschen und neu zu erstellen
  ALTER TABLE email_queue DROP CONSTRAINT IF EXISTS email_queue_type_check;
  ALTER TABLE email_queue ADD CONSTRAINT email_queue_type_check
    CHECK (type IN (
      'ticket',
      'ticket_assignment',
      'ticket_reply',
      'work_request',
      'booking_confirmation',
      'two_factor_code',
      'cancellation_notification',
      'mayday_notification',
      'shift_coverage_request'  -- NEU
    ));
EXCEPTION
  WHEN others THEN
    -- Ignoriere Fehler falls constraint nicht existiert
    NULL;
END $$;
