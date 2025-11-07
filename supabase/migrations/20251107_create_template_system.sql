-- Migration: Create Template System with Attachments
-- Version: 2.066
-- Date: 2025-11-07
-- Description: Creates response templates system for tickets with file attachment support

-- =====================================================
-- 1. CREATE TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ticket_response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('greeting', 'closing', 'technical', 'booking', 'flight', 'general')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE TEMPLATE ATTACHMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.template_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.ticket_response_templates(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_templates_category
ON public.ticket_response_templates(category);

CREATE INDEX IF NOT EXISTS idx_templates_created_by
ON public.ticket_response_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_template_attachments_template_id
ON public.template_attachments(template_id);

-- =====================================================
-- 4. CREATE UPDATE TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ticket_response_templates_updated_at
  BEFORE UPDATE ON public.ticket_response_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_template_updated_at();

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.ticket_response_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_attachments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. RLS POLICIES FOR TEMPLATES
-- =====================================================

-- Policy: Managers and Admins can view templates
CREATE POLICY "Managers and Admins can view templates"
  ON public.ticket_response_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

-- Policy: Managers and Admins can create templates
CREATE POLICY "Managers and Admins can create templates"
  ON public.ticket_response_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

-- Policy: Managers and Admins can update templates
CREATE POLICY "Managers and Admins can update templates"
  ON public.ticket_response_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

-- Policy: Managers and Admins can delete templates
CREATE POLICY "Managers and Admins can delete templates"
  ON public.ticket_response_templates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

-- =====================================================
-- 7. RLS POLICIES FOR TEMPLATE ATTACHMENTS
-- =====================================================

-- Policy: Managers and Admins can view template attachments
CREATE POLICY "Managers and Admins can view template attachments"
  ON public.template_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

-- Policy: Managers and Admins can create template attachments
CREATE POLICY "Managers and Admins can create template attachments"
  ON public.template_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

-- Policy: Managers and Admins can update template attachments
CREATE POLICY "Managers and Admins can update template attachments"
  ON public.template_attachments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

-- Policy: Managers and Admins can delete template attachments
CREATE POLICY "Managers and Admins can delete template attachments"
  ON public.template_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

-- =====================================================
-- 8. INSERT SAMPLE TEMPLATES
-- =====================================================

INSERT INTO public.ticket_response_templates (name, content, category) VALUES
-- Greetings
('Begrüßung Standard', 'Guten Tag,

vielen Dank für Ihre Anfrage.', 'greeting'),

('Begrüßung Freundlich', 'Hallo,

schön, von Ihnen zu hören!', 'greeting'),

-- Closings
('Abschluss Standard', 'Mit freundlichen Grüßen
Ihr FLIGHTHOUR Team', 'closing'),

('Abschluss Support', 'Bei weiteren Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
Ihr FLIGHTHOUR Support-Team', 'closing'),

-- Technical
('Fehleranalyse', 'Wir haben Ihr Anliegen geprüft und konnten das Problem identifizieren. Wir arbeiten an einer Lösung und melden uns in Kürze wieder.', 'technical'),

('Fertigstellung', 'Das Problem wurde behoben. Bitte prüfen Sie, ob alles wie gewünscht funktioniert.', 'technical'),

-- Booking
('Buchungsbestätigung', 'Ihre Buchung wurde erfolgreich bestätigt. Sie erhalten in Kürze eine E-Mail mit allen Details.', 'booking'),

('Stornierung', 'Ihre Stornierungsanfrage wurde bearbeitet. Die Rückerstattung erfolgt innerhalb von 5-7 Werktagen.', 'booking');

-- =====================================================
-- 9. VERIFICATION
-- =====================================================

DO $$
DECLARE
  template_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count FROM public.ticket_response_templates;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Template System Migration abgeschlossen!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tabellen erstellt:';
  RAISE NOTICE '  - ticket_response_templates';
  RAISE NOTICE '  - template_attachments';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Policies erstellt: ✓';
  RAISE NOTICE 'Indizes erstellt: ✓';
  RAISE NOTICE 'Update Trigger erstellt: ✓';
  RAISE NOTICE '';
  RAISE NOTICE 'Beispiel-Vorlagen eingefügt: % Stück', template_count;
  RAISE NOTICE '';
  RAISE NOTICE 'WICHTIG: Supabase Storage Bucket erstellen:';
  RAISE NOTICE '  Bucket Name: template-attachments';
  RAISE NOTICE '  Public: false (private)';
  RAISE NOTICE '========================================';
END $$;
