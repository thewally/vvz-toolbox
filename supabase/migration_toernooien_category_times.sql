-- Voeg optionele tijdvensters toe per categorie.
-- Leeg (NULL) = gebruik het tijdvenster van het toernooi zelf.
ALTER TABLE tournament_categories
  ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS end_time   TIME DEFAULT NULL;
