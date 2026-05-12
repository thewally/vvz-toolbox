---
name: Actuele user_roles slugs in DB
description: De live CHECK constraint op user_roles bevat 9 slugs; vergelijking met de spec voorkomt dat oudere/extra slugs onbedoeld worden gedropt bij een ALTER
type: project
---

De `user_roles_role_slug_check` constraint bevat in de live migrations precies deze 9 slugs (na de toernooien-migratie):
`'activiteiten', 'trainingsschema', 'sponsoring', 'ereleden', 'contact', 'content', 'gebruikers', 'vrijwilligers', 'toernooien'`.

**Why:** `migration_rolbeheer.sql` definieert er 7, `migration_vrijwilliger.sql` heeft die complete lijst opnieuw geschreven (+ vrijwilligers) en daarmee de oudere set vervangen. `migration_toernooien.sql` doet hetzelfde patroon (+ toernooien). De code gebruikt echter ook role slugs die NIET in de DB CHECK constraint staan, zoals `paginas`, `nieuws`, `verslagen`, `reglementen`, `lid-worden` (zie App.jsx en BeheerDashboardPage.jsx). Dit wijst erop dat òf de DB constraint achterloopt op de code, òf dat die routes feitelijk alleen via admin-bypass werken. Niet blind aannemen — bij nieuwe rol-slugs altijd eerst de meest recente `migration_*.sql` lezen en de complete lijst opnieuw zetten via DROP + ADD CONSTRAINT.

**How to apply:** Voor elke nieuwe rol-slug: voeg toe aan een nieuwe `migration_*.sql`, kopieer de huidige slug-lijst uit de meest recent toegevoegde migratie en breid uit. Niet rekenen op `'paginas'` of `'nieuws'` als ze nog niet in een migratie staan — eerst verifiëren of die rollen daadwerkelijk in productie zijn toegevoegd.
