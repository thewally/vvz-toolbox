-- =============================================================================
-- Reglementen & Documenten Migration
-- =============================================================================
-- Tabel voor door beheerders geüploade documenten (reglementen, formulieren, etc.).
-- Bestanden worden opgeslagen in de Supabase Storage bucket `documents` (public).
-- Rollen: 'content' of admin mogen beheren; publiek mag lezen.

-- 1. Documents tabel
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_sort_order ON documents (sort_order, created_at);

-- 2. RLS op documents tabel
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Iedereen (inclusief anon) mag documenten lezen
CREATE POLICY "Publiek lezen documenten"
  ON documents FOR SELECT
  USING (true);

-- Content-beheerders en admins mogen invoegen
CREATE POLICY "Content-beheerders mogen documenten toevoegen"
  ON documents FOR INSERT
  WITH CHECK (user_has_role('content'));

-- Content-beheerders en admins mogen bijwerken
CREATE POLICY "Content-beheerders mogen documenten bijwerken"
  ON documents FOR UPDATE
  USING (user_has_role('content'))
  WITH CHECK (user_has_role('content'));

-- Content-beheerders en admins mogen verwijderen
CREATE POLICY "Content-beheerders mogen documenten verwijderen"
  ON documents FOR DELETE
  USING (user_has_role('content'));

-- 3. Storage bucket
-- Maak de bucket aan via de Supabase Dashboard (Storage → New bucket):
--   naam: documents
--   Public bucket: AAN
-- Voer daarna deze storage policies uit:

-- Iedereen mag documenten lezen uit de `documents` bucket
CREATE POLICY "Publiek lezen documenten storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

-- Content-beheerders mogen uploaden
CREATE POLICY "Content-beheerders mogen documenten uploaden"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND user_has_role('content'));

-- Content-beheerders mogen updaten
CREATE POLICY "Content-beheerders mogen documenten updaten storage"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'documents' AND user_has_role('content'));

-- Content-beheerders mogen verwijderen
CREATE POLICY "Content-beheerders mogen documenten verwijderen storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND user_has_role('content'));
