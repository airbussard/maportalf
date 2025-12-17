-- Migration: Create rebook_tokens table for MAYDAY rebooking portal
-- Phase 5 of MAYDAY Center implementation
-- Allows customers to rebook cancelled appointments via secure token link

CREATE TABLE rebook_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  original_event_id TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_first_name TEXT,
  customer_last_name TEXT,
  customer_phone TEXT,
  original_duration INTEGER NOT NULL,  -- in minutes
  original_attendee_count INTEGER DEFAULT 1,
  original_location TEXT,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  new_event_id TEXT,  -- Reference to new event after rebooking
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast token lookups
CREATE INDEX idx_rebook_tokens_token ON rebook_tokens(token);

-- Index for finding unused tokens by email (for admin/support queries)
CREATE INDEX idx_rebook_tokens_email_unused ON rebook_tokens(customer_email) WHERE used = false;

-- Comment for documentation
COMMENT ON TABLE rebook_tokens IS 'Stores tokens for MAYDAY rebooking portal - allows customers to rebook cancelled appointments';
COMMENT ON COLUMN rebook_tokens.original_duration IS 'Duration of original appointment in minutes';
COMMENT ON COLUMN rebook_tokens.new_event_id IS 'References the newly created event after successful rebooking';
