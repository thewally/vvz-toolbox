-- =============================================================================
-- Migratie: Configureerbare sponsorgroepen
-- =============================================================================

-- 1. Maak sponsor_groepen tabel
CREATE TABLE sponsor_groepen (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  naam        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  kleur       TEXT        NOT NULL DEFAULT '#6b7280',
  volgorde    INTEGER     NOT NULL DEFAULT 0,
  slider_weergave TEXT    NOT NULL DEFAULT 'geen'
                          CHECK (slider_weergave IN ('geen', 'groot', 'klein')),
  pagina_weergave TEXT    NOT NULL DEFAULT 'klein'
                          CHECK (pagina_weergave IN ('geen', 'groot', 'klein')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sponsor_groepen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Publiek lezen van sponsor groepen"
  ON sponsor_groepen FOR SELECT USING (true);

CREATE POLICY "Beheerders mogen alles op sponsor_groepen"
  ON sponsor_groepen FOR ALL USING (auth.role() = 'authenticated');

-- 2. Standaard groepen invoegen (matcht bestaande hardcoded categorieën)
INSERT INTO sponsor_groepen (naam, slug, kleur, volgorde, slider_weergave, pagina_weergave) VALUES
  ('Goud',      'goud',      '#b45309', 0, 'groot', 'groot'),
  ('Zilver',    'zilver',    '#9ca3af', 1, 'klein', 'klein'),
  ('Brons',     'brons',     '#c2410c', 2, 'geen',  'geen'),
  ('Jeugdplan', 'jeugdplan', '#15803d', 3, 'geen',  'geen');

-- 3. Voeg groep_id toe aan sponsors
ALTER TABLE sponsors ADD COLUMN groep_id UUID REFERENCES sponsor_groepen(id);

-- 4. Koppel bestaande sponsors aan hun groep via categorie slug
UPDATE sponsors s
SET groep_id = (SELECT id FROM sponsor_groepen WHERE slug = s.categorie);

-- 5. Fallback: sponsors zonder match krijgen de eerste groep
UPDATE sponsors
SET groep_id = (SELECT id FROM sponsor_groepen ORDER BY volgorde LIMIT 1)
WHERE groep_id IS NULL;

-- 6. Verwijder de hardcoded CHECK constraint op categorie
ALTER TABLE sponsors DROP CONSTRAINT IF EXISTS sponsors_categorie_check;

-- 7. Maak categorie nullable (groep_id is de nieuwe vervanger)
ALTER TABLE sponsors ALTER COLUMN categorie DROP NOT NULL;
