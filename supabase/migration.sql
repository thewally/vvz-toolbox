-- =============================================
-- VVZ'49 Toolbox - Database Migration
-- =============================================

-- TEAMS
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.teams enable row level security;

create policy "Teams are publicly readable"
  on public.teams for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can insert teams"
  on public.teams for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update teams"
  on public.teams for update
  to authenticated
  using (true);

create policy "Authenticated users can delete teams"
  on public.teams for delete
  to authenticated
  using (true);

-- FIELDS
create table if not exists public.fields (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.fields enable row level security;

create policy "Fields are publicly readable"
  on public.fields for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can manage fields"
  on public.fields for all
  to authenticated
  using (true)
  with check (true);

-- TRAINING SLOTS
create table if not exists public.training_slots (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  field_id uuid not null references public.fields(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 5),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_time_range check (end_time > start_time)
);

alter table public.training_slots enable row level security;

create policy "Training slots are publicly readable"
  on public.training_slots for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can insert training slots"
  on public.training_slots for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update training slots"
  on public.training_slots for update
  to authenticated
  using (true);

create policy "Authenticated users can delete training slots"
  on public.training_slots for delete
  to authenticated
  using (true);

-- INDEX
create index if not exists idx_training_slots_day on public.training_slots(day_of_week);

-- =============================================
-- SEED DATA
-- =============================================

-- Remove unused fields (safe to re-run)
delete from public.fields where name in ('Veld 2', 'Veld 3A', 'Veld 3B', 'Veld 4', 'Veld 5');

-- Fields
insert into public.fields (name, display_order) values
  ('Veld 1A', 1),
  ('Veld 1B', 2),
  ('Veld 1C', 3),
  ('Veld 1D', 4),
  ('Veld 6A', 5),
  ('Veld 6B', 6),
  ('Veld 6C', 7),
  ('Veld 6D', 8)
on conflict (name) do nothing;

-- Teams
insert into public.teams (name) values
  -- Jeugd
  ('JO9-1'),
  ('JO10-1'),
  ('JO10-2'),
  ('JO11-1'),
  ('JO11-2'),
  ('JO12-1'),
  ('JO12-2'),
  ('JO12-3'),
  ('JO13-1'),
  ('JO13-2'),
  ('JO14-1'),
  ('JO15-1'),
  ('JO15-2'),
  ('JO17-1'),
  ('JO17-2'),
  ('JO19-1'),
  -- Senioren
  ('Selectie'),
  ('Zesde'),
  ('Derde'),
  ('O16-1'),
  ('O16-2'),
  ('O17-1'),
  -- Veteranen
  ('Veteranen'),
  ('Derde & 35+'),
  ('30+ vrouwen'),
  ('35+ mannen'),
  ('45+ mannen')
on conflict (name) do nothing;

-- =============================================
-- MANY-TO-MANY: Training slot <-> Fields
-- =============================================

create table if not exists public.training_slot_fields (
  training_slot_id uuid not null references public.training_slots(id) on delete cascade,
  field_id uuid not null references public.fields(id) on delete cascade,
  primary key (training_slot_id, field_id)
);

alter table public.training_slot_fields enable row level security;

create policy "Training slot fields are publicly readable"
  on public.training_slot_fields for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can manage training slot fields"
  on public.training_slot_fields for all
  to authenticated
  using (true)
  with check (true);

-- Migrate existing field_id data to junction table
insert into public.training_slot_fields (training_slot_id, field_id)
select id, field_id from public.training_slots where field_id is not null
on conflict do nothing;

-- Remove old column
alter table public.training_slots drop column if exists field_id;

-- =============================================
-- MANY-TO-MANY: Training slot <-> Teams
-- =============================================

create table if not exists public.training_slot_teams (
  training_slot_id uuid not null references public.training_slots(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  primary key (training_slot_id, team_id)
);

alter table public.training_slot_teams enable row level security;

create policy "Training slot teams are publicly readable"
  on public.training_slot_teams for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can manage training slot teams"
  on public.training_slot_teams for all
  to authenticated
  using (true)
  with check (true);

-- Migrate existing team_id data to junction table
insert into public.training_slot_teams (training_slot_id, team_id)
select id, team_id from public.training_slots where team_id is not null
on conflict do nothing;

-- Remove old column
alter table public.training_slots drop column if exists team_id;

-- Optional description field for training slots
alter table public.training_slots add column if not exists description text;

-- Move color from teams to training_slots
alter table public.training_slots add column if not exists color text not null default '#2E7D32';

-- Migrate existing colors from teams to slots
update public.training_slots ts
set color = (
  select t.color from public.training_slot_teams tst
  join public.teams t on t.id = tst.team_id
  where tst.training_slot_id = ts.id
  limit 1
)
where exists (
  select 1 from public.training_slot_teams tst where tst.training_slot_id = ts.id
);

-- Remove color from teams
alter table public.teams drop column if exists color;

-- =============================================
-- CATEGORY FIELD FOR TEAMS
-- =============================================

alter table public.teams add column if not exists category text;

-- Seed categories for existing teams
update public.teams set category = 'Junioren' where name like 'JO%' or name like 'MO%' or name like 'O16%' or name like 'O17%';
update public.teams set category = 'Senioren' where name in ('Selectie', 'Zesde', 'Derde');
update public.teams set category = 'Veteranen' where name in ('Veteranen', 'Derde & 35+', '30+ vrouwen', '35+ mannen', '45+ mannen');
