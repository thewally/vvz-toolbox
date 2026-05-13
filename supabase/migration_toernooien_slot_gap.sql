-- Voeg slot_gap_minutes toe aan tournaments (wisselminuten tussen elke speelronde)
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS slot_gap_minutes INT NOT NULL DEFAULT 0
    CHECK (slot_gap_minutes >= 0);
