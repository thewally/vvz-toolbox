-- TV-scherm instellingen (single-row config table)
CREATE TABLE IF NOT EXISTS tv_instellingen (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  interval_seconden INT NOT NULL DEFAULT 10,
  slides JSONB NOT NULL DEFAULT '{
    "nieuws": true,
    "activiteiten": true,
    "huidige_wedstrijden": true,
    "uitslagen_vandaag": true,
    "nog_te_spelen": true,
    "programma_week": true,
    "uitslagen_week": true
  }',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Zorg dat er altijd één rij bestaat
INSERT INTO tv_instellingen (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE tv_instellingen ENABLE ROW LEVEL SECURITY;

-- Iedereen mag lezen (TV-pagina is publiek)
CREATE POLICY "Publiek leesbaar" ON tv_instellingen
  FOR SELECT USING (true);

-- Alleen admins mogen schrijven
CREATE POLICY "Alleen admins mogen wijzigen" ON tv_instellingen
  FOR UPDATE USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
