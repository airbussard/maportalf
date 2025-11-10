-- Create two_factor_codes table for 2FA authentication
CREATE TABLE IF NOT EXISTS public.two_factor_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code varchar(6) NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  ip_address varchar(45), -- Supports IPv4 and IPv6
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT two_factor_codes_pkey PRIMARY KEY (id),
  CONSTRAINT two_factor_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_two_factor_codes_user_id ON public.two_factor_codes(user_id);
CREATE INDEX idx_two_factor_codes_expires_at ON public.two_factor_codes(expires_at);
CREATE INDEX idx_two_factor_codes_verified ON public.two_factor_codes(verified);

-- Enable RLS
ALTER TABLE public.two_factor_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own codes
CREATE POLICY "Users can view their own 2FA codes"
  ON public.two_factor_codes
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own codes
CREATE POLICY "Users can insert their own 2FA codes"
  ON public.two_factor_codes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own codes
CREATE POLICY "Users can update their own 2FA codes"
  ON public.two_factor_codes
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to automatically delete expired codes (run via cron)
CREATE OR REPLACE FUNCTION delete_expired_2fa_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.two_factor_codes
  WHERE expires_at < now();
END;
$$;

-- Comment on table
COMMENT ON TABLE public.two_factor_codes IS 'Stores 2FA verification codes sent via email. Codes expire after 10 minutes and are limited to 3 attempts.';
