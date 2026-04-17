-- =============================================================================
-- Migratie v2: heeft_sponsortekst veld + storage bucket voor sponsor logo's
-- =============================================================================

-- 1. Voeg heeft_sponsortekst toe aan sponsor_groepen
ALTER TABLE sponsor_groepen
  ADD COLUMN IF NOT EXISTS heeft_sponsortekst BOOLEAN NOT NULL DEFAULT false;

-- Zet standaard aan voor Goud (grote sponsors hebben vaak een tekst)
UPDATE sponsor_groepen SET heeft_sponsortekst = true WHERE slug = 'goud';

-- 2. Storage bucket voor sponsor logo's
INSERT INTO storage.buckets (id, name, public)
VALUES ('sponsor-logos', 'sponsor-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies
CREATE POLICY "Publiek lezen sponsor logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sponsor-logos');

CREATE POLICY "Beheerders uploaden sponsor logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'sponsor-logos');

CREATE POLICY "Beheerders verwijderen sponsor logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'sponsor-logos');
