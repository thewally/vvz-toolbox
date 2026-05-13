-- Voeg voorkeursvelden toe aan categorieën (array van field-ids)
ALTER TABLE tournament_categories
  ADD COLUMN IF NOT EXISTS preferred_field_ids UUID[] NOT NULL DEFAULT '{}';
