-- Herkomst van teams: handmatig toegevoegd of automatisch uit SportLink
-- (kaart thewally/ontwikkelstraat#37). Additief en idempotent; de oude frontend blijft werken.
-- Uitvoeren in de Supabase SQL editor VOOR de frontend live gaat.

alter table public.teams
  add column if not exists bron text not null default 'handmatig'
  check (bron in ('handmatig', 'sportlink'));

alter table public.teams
  add column if not exists sportlink_teamcode text;

create unique index if not exists teams_sportlink_teamcode_key
  on public.teams (sportlink_teamcode)
  where sportlink_teamcode is not null;

-- Terugdraaien (verliest alleen de herkomstinformatie, geen teams):
-- alter table public.teams drop column bron, drop column sportlink_teamcode;
