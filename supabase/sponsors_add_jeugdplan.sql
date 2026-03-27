-- Voeg 'jeugdplan' toe als geldige sponsorcategorie
alter table sponsors
  drop constraint if exists sponsors_categorie_check;

alter table sponsors
  add constraint sponsors_categorie_check
  check (categorie in ('goud', 'zilver', 'brons', 'jeugdplan'));
