-- Voeg rounds_per_pairing toe aan tournaments (hoeveel keer elk team-duo speelt)
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS rounds_per_pairing INT NOT NULL DEFAULT 1
    CHECK (rounds_per_pairing >= 1 AND rounds_per_pairing <= 4);
