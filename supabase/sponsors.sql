-- Sponsors tabel
create table sponsors (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  slug text not null unique,
  categorie text not null check (categorie in ('goud', 'zilver', 'brons')),
  logo_url text,
  website_url text,
  beschrijving text,
  volgorde integer not null default 0,
  actief boolean not null default true,
  created_at timestamptz default now()
);

-- RLS
alter table sponsors enable row level security;

create policy "Publiek lezen van actieve sponsors"
  on sponsors for select
  using (actief = true);

create policy "Beheerders mogen alles"
  on sponsors for all
  using (auth.role() = 'authenticated');
