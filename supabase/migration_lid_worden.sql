-- Migration: Lid worden feature
-- Settings table (single row, upsert pattern)
CREATE TABLE lid_worden_settings (
  id integer PRIMARY KEY DEFAULT 1,
  intro_tekst text,
  knvb_url text NOT NULL DEFAULT 'https://www.knvb.nl/ontdek-voetbal/inschrijven/BBCC89Q',
  notificatie_email text,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT lid_worden_settings_singleton CHECK (id = 1)
);

-- Seed default row
INSERT INTO lid_worden_settings (id, knvb_url)
VALUES (1, 'https://www.knvb.nl/ontdek-voetbal/inschrijven/BBCC89Q')
ON CONFLICT (id) DO NOTHING;

-- RLS for settings: public read, authenticated update
ALTER TABLE lid_worden_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Iedereen kan lid_worden_settings lezen"
  ON lid_worden_settings FOR SELECT
  USING (true);

CREATE POLICY "Beheerders kunnen lid_worden_settings bijwerken"
  ON lid_worden_settings FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Beheerders kunnen lid_worden_settings inserten"
  ON lid_worden_settings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Requests table
CREATE TABLE proeftraining_aanvragen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voornaam text NOT NULL,
  achternaam text NOT NULL,
  email text NOT NULL,
  telefoon text NOT NULL,
  geboortedatum date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS: public insert, admin read
ALTER TABLE proeftraining_aanvragen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Iedereen kan proeftraining aanvragen"
  ON proeftraining_aanvragen FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Beheerders kunnen aanvragen lezen"
  ON proeftraining_aanvragen FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Beheerders kunnen aanvragen verwijderen"
  ON proeftraining_aanvragen FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Add 'lid-worden' to user_roles CHECK constraint
-- First drop the existing constraint, then re-add with the new value
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_slug_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_slug_check
  CHECK (role_slug IN ('activiteiten', 'trainingsschema', 'sponsoring', 'ereleden', 'contact', 'content', 'gebruikers', 'vrijwilligers', 'lid-worden'));
