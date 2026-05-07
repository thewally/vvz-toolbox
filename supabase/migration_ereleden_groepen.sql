-- ereleden_groepen: configureerbare groepen voor ereleden
create table if not exists ereleden_groepen (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  slug text not null unique,
  volgorde integer not null default 0,
  kolom integer not null default 1 check (kolom in (1, 2)),
  created_at timestamptz not null default now()
);

alter table ereleden_groepen enable row level security;

create policy "Iedereen kan ereleden_groepen lezen" on ereleden_groepen
  for select using (true);

create policy "Beheerders kunnen ereleden_groepen beheren" on ereleden_groepen
  for all using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or user_has_role('ereleden')
  );

-- Seed de drie bestaande groepen
insert into ereleden_groepen (naam, slug, volgorde, kolom) values
  ('Erevoorzitters', 'erevoorzitter', 0, 1),
  ('Ereleden', 'erelid', 1, 1),
  ('Leden van verdienste', 'lid_van_verdienste', 2, 2)
on conflict (slug) do nothing;

-- groep_id kolom toevoegen aan ereleden tabel
alter table ereleden add column if not exists groep_id uuid references ereleden_groepen(id);

-- Backfill groep_id op basis van bestaande categorie-waarden
update ereleden e
set groep_id = g.id
from ereleden_groepen g
where g.slug = e.categorie
  and e.groep_id is null;
