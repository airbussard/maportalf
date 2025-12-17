-- Migration: Create mayday_confirmation_tokens table
-- Version: 2.113
-- Date: 2024-12-17

-- MAYDAY Bestätigungs-Tokens
-- Ermöglicht Kunden, den Erhalt von Verschiebungs-/Absage-Benachrichtigungen zu bestätigen
CREATE TABLE mayday_confirmation_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('shift', 'cancel')),
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  reason TEXT NOT NULL,
  shift_minutes INTEGER,  -- NULL bei cancel
  old_start_time TIMESTAMPTZ NOT NULL,
  new_start_time TIMESTAMPTZ,  -- NULL bei cancel
  confirmed BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Token-Lookups
CREATE INDEX idx_mayday_tokens_token ON mayday_confirmation_tokens(token);

-- Index für Event-basierte Abfragen
CREATE INDEX idx_mayday_tokens_event ON mayday_confirmation_tokens(event_id);

-- Index für unbestätigte Tokens (für Reporting)
CREATE INDEX idx_mayday_tokens_unconfirmed ON mayday_confirmation_tokens(confirmed) WHERE confirmed = false;

-- Kommentar für Dokumentation
COMMENT ON TABLE mayday_confirmation_tokens IS 'Bestätigungs-Tokens für MAYDAY Center Benachrichtigungen (Verschiebung/Absage)';
