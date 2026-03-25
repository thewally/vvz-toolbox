-- =============================================================================
-- Migration: Meerdere schema-versies (schedules)
-- =============================================================================
-- Dit script voegt ondersteuning toe voor meerdere trainingsschema-versies.
--
-- STAPPEN:
-- 1. Voer dit hele script uit in de Supabase SQL Editor
-- 2. Noteer het UUID dat terugkomt uit de INSERT (stap 4)
-- 3. Voer handmatig stap 5 uit met dat UUID
-- =============================================================================

-- Stap 1: Nieuwe tabel voor schema-versies
create table schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  valid_from date,
  valid_until date,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

-- Stap 2: RLS inschakelen
alter table schedules enable row level security;

-- Iedereen mag lezen (publiek schema)
create policy "Publiek lezen" on schedules
  for select using (true);

-- Alleen ingelogde gebruikers (admins) mogen schrijven
create policy "Admins mogen invoegen" on schedules
  for insert with check (auth.uid() is not null);

create policy "Admins mogen bijwerken" on schedules
  for update using (auth.uid() is not null);

create policy "Admins mogen verwijderen" on schedules
  for delete using (auth.uid() is not null);

-- Stap 3: Voeg schedule_id kolom toe aan training_slots
alter table training_slots
  add column schedule_id uuid references schedules(id) on delete cascade;

-- Stap 4: Standaard schema aanmaken
-- Noteer het id dat terugkomt!
insert into schedules (name, active)
  values ('2025/2026', true);

-- Stap 5: HANDMATIG UITVOEREN
-- Vervang <SCHEDULE_ID> door het UUID uit stap 4:
--
--   update training_slots
--     set schedule_id = '<SCHEDULE_ID>'
--     where schedule_id is null;
--
-- Controleer daarna:
--   select count(*) from training_slots where schedule_id is null;
--   (moet 0 zijn)

-- Stap 6 (optioneel): Maak schedule_id NOT NULL nadat alle slots gekoppeld zijn
-- alter table training_slots alter column schedule_id set not null;
