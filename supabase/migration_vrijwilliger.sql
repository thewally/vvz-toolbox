-- =============================================================================
-- Vrijwilliger Worden Migration: Vacatures en groepen voor vrijwilligers
-- =============================================================================

-- 1. volunteer_groups tabel
CREATE TABLE volunteer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE volunteer_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Iedereen kan groepen lezen"
  ON volunteer_groups FOR SELECT
  USING (true);

CREATE POLICY "Auth kan groepen beheren"
  ON volunteer_groups FOR ALL
  USING (auth.uid() IS NOT NULL);

-- 2. volunteer_vacancies tabel
CREATE TABLE volunteer_vacancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES volunteer_groups(id) ON DELETE CASCADE,
  titel TEXT NOT NULL,
  beschrijving TEXT,  -- HTML from RichTextEditor
  contact_member_id UUID REFERENCES committee_members(id) ON DELETE SET NULL,
  contact_naam TEXT,
  contact_email TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  actief BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE volunteer_vacancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Iedereen kan vacatures lezen"
  ON volunteer_vacancies FOR SELECT
  USING (true);

CREATE POLICY "Auth kan vacatures beheren"
  ON volunteer_vacancies FOR ALL
  USING (auth.uid() IS NOT NULL);

-- 3. Rolslug 'vrijwilligers' toevoegen aan user_roles CHECK constraint
-- Er is GEEN aparte roles tabel; de slugs staan in de CHECK constraint van user_roles.
-- Voer het volgende uit om de constraint bij te werken:
ALTER TABLE user_roles DROP CONSTRAINT user_roles_role_slug_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_slug_check
  CHECK (role_slug IN (
    'activiteiten', 'trainingsschema', 'sponsoring',
    'ereleden', 'contact', 'content', 'gebruikers',
    'vrijwilligers'
  ));
