-- =============================================================================
-- Toernooi Generator Migration: Toernooien, velden, categorieën, teams, poules
-- en automatisch gegenereerde wedstrijden.
-- =============================================================================

-- 1. Nieuwe role slug 'toernooien' toevoegen aan de bestaande CHECK constraint
--    op user_roles. We behouden alle eerder toegevoegde slugs.
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_slug_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_slug_check
  CHECK (role_slug IN (
    'activiteiten', 'trainingsschema', 'sponsoring',
    'ereleden', 'contact', 'gebruikers',
    'vrijwilligers', 'lid-worden',
    'paginas', 'nieuws', 'verslagen', 'reglementen',
    'toernooien'
  ));

-- 2. Generieke updated_at trigger functie (idempotent: alleen aanmaken als nog niet bestaat).
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Hoofdtabel: tournaments
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  match_duration_minutes INT NOT NULL DEFAULT 15
    CHECK (match_duration_minutes >= 5 AND match_duration_minutes % 5 = 0),
  rest_slots INT NOT NULL DEFAULT 1
    CHECK (rest_slots >= 0),
  break_start_time TIME,
  break_duration_minutes INT NOT NULL DEFAULT 0
    CHECK (break_duration_minutes >= 0),
  is_published BOOLEAN NOT NULL DEFAULT false,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tournaments_date ON tournaments(date DESC);
CREATE INDEX idx_tournaments_published ON tournaments(is_published, date DESC);

CREATE TRIGGER trg_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Velden per toernooi
CREATE TABLE tournament_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, name)
);

CREATE INDEX idx_tournament_fields_tournament ON tournament_fields(tournament_id, sort_order);

-- 5. Categorieën per toernooi
CREATE TABLE tournament_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, name)
);

CREATE INDEX idx_tournament_categories_tournament ON tournament_categories(tournament_id, sort_order);

-- 6. Teams per toernooi (gekoppeld aan precies één categorie)
CREATE TABLE tournament_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES tournament_categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  contact_name TEXT,
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tournament_teams_tournament ON tournament_teams(tournament_id);
CREATE INDEX idx_tournament_teams_category ON tournament_teams(category_id);

-- 7. Poules per categorie
CREATE TABLE tournament_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES tournament_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, name)
);

CREATE INDEX idx_tournament_pools_tournament ON tournament_pools(tournament_id, sort_order);
CREATE INDEX idx_tournament_pools_category ON tournament_pools(category_id);

-- 8. Koppeltabel poule <-> teams. UNIQUE (team_id) zorgt dat een team in
--    hoogstens één poule kan zitten.
CREATE TABLE tournament_pool_teams (
  pool_id UUID NOT NULL REFERENCES tournament_pools(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (pool_id, team_id),
  UNIQUE (team_id)
);

-- 9. Gegenereerde wedstrijden
CREATE TABLE tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  pool_id UUID NOT NULL REFERENCES tournament_pools(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES tournament_fields(id) ON DELETE RESTRICT,
  home_team_id UUID NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  away_team_id UUID NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  result JSONB,
  notes TEXT,
  manual_override BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (home_team_id <> away_team_id),
  CHECK (end_time > start_time)
);

CREATE INDEX idx_tournament_matches_tournament ON tournament_matches(tournament_id, start_time);
CREATE INDEX idx_tournament_matches_field ON tournament_matches(field_id, start_time);
CREATE INDEX idx_tournament_matches_pool ON tournament_matches(pool_id);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_pool_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

-- ---- tournaments ----
CREATE POLICY "Publiek leest gepubliceerde toernooien"
  ON tournaments FOR SELECT
  USING (is_published = true OR user_has_role('toernooien'));

CREATE POLICY "Toernooi-beheerders maken toernooien aan"
  ON tournaments FOR INSERT
  WITH CHECK (user_has_role('toernooien'));

CREATE POLICY "Toernooi-beheerders bewerken toernooien"
  ON tournaments FOR UPDATE
  USING (user_has_role('toernooien'))
  WITH CHECK (user_has_role('toernooien'));

CREATE POLICY "Toernooi-beheerders verwijderen toernooien"
  ON tournaments FOR DELETE
  USING (user_has_role('toernooien'));

-- ---- tournament_fields ----
CREATE POLICY "Publiek leest velden van gepubliceerde toernooien"
  ON tournament_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_fields.tournament_id
        AND (t.is_published = true OR user_has_role('toernooien'))
    )
  );

CREATE POLICY "Toernooi-beheerders schrijven velden"
  ON tournament_fields FOR ALL
  USING (user_has_role('toernooien'))
  WITH CHECK (user_has_role('toernooien'));

-- ---- tournament_categories ----
CREATE POLICY "Publiek leest categorieën van gepubliceerde toernooien"
  ON tournament_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_categories.tournament_id
        AND (t.is_published = true OR user_has_role('toernooien'))
    )
  );

CREATE POLICY "Toernooi-beheerders schrijven categorieën"
  ON tournament_categories FOR ALL
  USING (user_has_role('toernooien'))
  WITH CHECK (user_has_role('toernooien'));

-- ---- tournament_teams ----
CREATE POLICY "Publiek leest teams van gepubliceerde toernooien"
  ON tournament_teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_teams.tournament_id
        AND (t.is_published = true OR user_has_role('toernooien'))
    )
  );

CREATE POLICY "Toernooi-beheerders schrijven teams"
  ON tournament_teams FOR ALL
  USING (user_has_role('toernooien'))
  WITH CHECK (user_has_role('toernooien'));

-- ---- tournament_pools ----
CREATE POLICY "Publiek leest poules van gepubliceerde toernooien"
  ON tournament_pools FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_pools.tournament_id
        AND (t.is_published = true OR user_has_role('toernooien'))
    )
  );

CREATE POLICY "Toernooi-beheerders schrijven poules"
  ON tournament_pools FOR ALL
  USING (user_has_role('toernooien'))
  WITH CHECK (user_has_role('toernooien'));

-- ---- tournament_pool_teams ----
CREATE POLICY "Publiek leest poule-teams van gepubliceerde toernooien"
  ON tournament_pool_teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM tournament_pools p
      JOIN tournaments t ON t.id = p.tournament_id
      WHERE p.id = tournament_pool_teams.pool_id
        AND (t.is_published = true OR user_has_role('toernooien'))
    )
  );

CREATE POLICY "Toernooi-beheerders schrijven poule-teams"
  ON tournament_pool_teams FOR ALL
  USING (user_has_role('toernooien'))
  WITH CHECK (user_has_role('toernooien'));

-- ---- tournament_matches ----
CREATE POLICY "Publiek leest wedstrijden van gepubliceerde toernooien"
  ON tournament_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_matches.tournament_id
        AND (t.is_published = true OR user_has_role('toernooien'))
    )
  );

CREATE POLICY "Toernooi-beheerders schrijven wedstrijden"
  ON tournament_matches FOR ALL
  USING (user_has_role('toernooien'))
  WITH CHECK (user_has_role('toernooien'));
