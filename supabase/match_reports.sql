-- =========================================================================
-- Wedstrijdverslagen (match_reports)
-- =========================================================================
-- Tabel voor verslagen van wedstrijden. Koppeling aan Sportlink via team_id
-- (= teamcode) en snapshot van team_name. Content is TipTap HTML.
-- =========================================================================

CREATE TABLE IF NOT EXISTS match_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       TEXT NOT NULL,
  team_name     TEXT NOT NULL,
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  content       TEXT,
  published_at  TIMESTAMPTZ DEFAULT now(),
  author_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexen voor veelgebruikte queries
CREATE INDEX IF NOT EXISTS idx_match_reports_slug         ON match_reports (slug);
CREATE INDEX IF NOT EXISTS idx_match_reports_team_id      ON match_reports (team_id);
CREATE INDEX IF NOT EXISTS idx_match_reports_published_at ON match_reports (published_at DESC);

-- =========================================================================
-- Row Level Security
-- =========================================================================
ALTER TABLE match_reports ENABLE ROW LEVEL SECURITY;

-- Publiek: alleen gepubliceerde verslagen zichtbaar
DROP POLICY IF EXISTS "Publiek lezen gepubliceerd" ON match_reports;
CREATE POLICY "Publiek lezen gepubliceerd" ON match_reports
  FOR SELECT
  USING (published_at IS NOT NULL AND published_at <= now());

-- Beheerders (rol 'content' of admin): alle verslagen lezen
DROP POLICY IF EXISTS "Beheerders lezen alles" ON match_reports;
CREATE POLICY "Beheerders lezen alles" ON match_reports
  FOR SELECT
  TO authenticated
  USING (user_has_role('content'));

-- Beheerders schrijven/updaten/verwijderen alleen met rol 'content' of admin
DROP POLICY IF EXISTS "Beheerders schrijven" ON match_reports;
CREATE POLICY "Beheerders schrijven" ON match_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_role('content'));

DROP POLICY IF EXISTS "Beheerders wijzigen" ON match_reports;
CREATE POLICY "Beheerders wijzigen" ON match_reports
  FOR UPDATE
  TO authenticated
  USING (user_has_role('content'))
  WITH CHECK (user_has_role('content'));

DROP POLICY IF EXISTS "Beheerders verwijderen" ON match_reports;
CREATE POLICY "Beheerders verwijderen" ON match_reports
  FOR DELETE
  TO authenticated
  USING (user_has_role('content'));

-- =========================================================================
-- Trigger: updated_at automatisch bijwerken
-- =========================================================================
CREATE OR REPLACE FUNCTION set_match_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_match_reports_updated_at ON match_reports;
CREATE TRIGGER trg_match_reports_updated_at
  BEFORE UPDATE ON match_reports
  FOR EACH ROW
  EXECUTE FUNCTION set_match_reports_updated_at();
