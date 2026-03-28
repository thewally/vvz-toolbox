-- Voeg logo achtergrondkleur toe aan sponsors tabel
alter table sponsors add column if not exists logo_achtergrond text default null;
