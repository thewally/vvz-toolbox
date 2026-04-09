-- =============================================================================
-- Rolbeheer Migration: Granulaire toegangscontrole per beheer-onderdeel
-- =============================================================================

-- 1. user_roles tabel
CREATE TABLE user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_slug TEXT NOT NULL CHECK (role_slug IN (
    'activiteiten', 'trainingsschema', 'sponsoring',
    'ereleden', 'contact', 'content', 'gebruikers'
  )),
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role_slug)
);

-- 2. Database functions

-- Rolcheck met beheerder-bypass
CREATE OR REPLACE FUNCTION user_has_role(check_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
      false
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role_slug = check_slug
    );
$$;

-- Check of gebruiker enige rol heeft
CREATE OR REPLACE FUNCTION user_has_any_role()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
      false
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
    );
$$;

-- Rollen per gebruiker ophalen (voor beheer-UI)
CREATE OR REPLACE FUNCTION get_user_roles_for_management()
RETURNS TABLE (
  user_id UUID,
  role_slug TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT user_id, role_slug
  FROM user_roles
  ORDER BY user_id, role_slug;
$$;

-- 3. RLS Policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Ingelogde gebruikers mogen hun eigen rollen lezen
CREATE POLICY "Eigen rollen lezen"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Beheerders mogen alle rollen lezen
CREATE POLICY "Beheerders mogen alle rollen lezen"
  ON user_roles FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Beheerders mogen rollen toekennen
CREATE POLICY "Beheerders mogen rollen toekennen"
  ON user_roles FOR INSERT
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Beheerders mogen rollen verwijderen
CREATE POLICY "Beheerders mogen rollen verwijderen"
  ON user_roles FOR DELETE
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Gebruikers met 'gebruikers' rol mogen ook rollen beheren
CREATE POLICY "Gebruikersbeheerders mogen rollen lezen"
  ON user_roles FOR SELECT
  USING (user_has_role('gebruikers'));

CREATE POLICY "Gebruikersbeheerders mogen rollen toekennen"
  ON user_roles FOR INSERT
  WITH CHECK (user_has_role('gebruikers'));

CREATE POLICY "Gebruikersbeheerders mogen rollen verwijderen"
  ON user_roles FOR DELETE
  USING (user_has_role('gebruikers'));
