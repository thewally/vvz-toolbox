---
name: Vrijwilliger Worden spec
description: Feature spec voor vrijwilligersvacatures module met groepen, contactpersoon-koppeling, drag-and-drop in .claude/specs/vrijwilliger-worden.md
type: project
---

Vrijwilliger Worden spec opgeleverd op 2026-04-09. Twee tabellen: `volunteer_groups` en `volunteer_vacancies`. Vacatures kunnen contactpersoon koppelen uit bestaande `committee_members` tabel of vrije invoer. Drag-and-drop via HTML5 native (zelfde patroon als WieDoetWatBeheerPage). Rolslug: `vrijwilligers`. Publieke route: `/vrijwilliger`, beheer: `/beheer/vrijwilligers`.

**Why:** Club wil vrijwilligers werven via de toolbox, gegroepeerd per werkgebied.
**How to apply:** Implementatie volgt WieDoetWatBeheerPage patroon voor groep+items CRUD met drag-and-drop.
