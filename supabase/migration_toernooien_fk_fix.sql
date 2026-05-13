-- Verander field_id FK van RESTRICT naar CASCADE zodat het verwijderen van
-- een veld ook de bijbehorende wedstrijden verwijdert.
ALTER TABLE tournament_matches
  DROP CONSTRAINT tournament_matches_field_id_fkey;

ALTER TABLE tournament_matches
  ADD CONSTRAINT tournament_matches_field_id_fkey
    FOREIGN KEY (field_id)
    REFERENCES tournament_fields(id)
    ON DELETE CASCADE;
