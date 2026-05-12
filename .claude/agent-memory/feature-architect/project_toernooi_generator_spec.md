---
name: Toernooi Generator spec
description: Feature spec voor Toernooi Generator (toernooi-CRUD, velden, categorieën, poules, round-robin scheduler) in .claude/specs/toernooi-generator.md, branch feature-tournament-creator
type: project
---

Feature: Toernooi Generator. Spec ligt op `.claude/specs/toernooi-generator.md`. Branch: `feature-tournament-creator`.

**Why:** VVZ'49 organiseert regelmatig toernooien en handmatig schema-maken in Excel is foutgevoelig. De feature dekt: meerdere toernooien per beheerder, vrije veld-naamgeving los van trainingsschema-velden, categorieën om groepen gescheiden te houden, poule-indeling, capaciteit-simulator, en automatisch genereren van het wedstrijdschema (round-robin per poule + greedy scheduler over velden/tijdslots).

**How to apply:**
- Nieuwe role-slug `toernooien` toevoegen aan `user_roles_role_slug_check`
- Tabellen krijgen prefix `tournament_` (tournaments, tournament_fields, _categories, _teams, _pools, _pool_teams, _matches)
- Algoritme in `services/tournamentSchedule.js` als pure functions (round-robin via circle method + greedy slot/field-packing met `restSlots` constraint)
- Beheer-UI is wizard met 7 tabs: Algemeen / Velden / Categorieën / Teams / Poules / Simulatie / Schema
- Out of scope MVP: knock-outs, uitslagen, scheidsrechters, meerdaagse toernooien, PDF-export, e-mails
- Bij implementatie: live `user_roles_role_slug_check` lijst eerst lezen — niet blind aannemen welke slugs er al zijn
