---
name: Rolbeheer feature spec (v2)
description: Granulaire rollen per beheer-sectie, bovenop bestaand app_metadata.role admin systeem
type: project
---

Feature spec voor rolbeheer is bijgewerkt in `.claude/specs/rolbeheer.md` (v2, 2026-04-05).

**Why:** Het bestaande systeem kent beheerder/gebruiker/anoniem. Granulaire rollen maken het mogelijk dat niet-beheerders specifieke secties beheren.

**How to apply:** Key design decisions in v2:
- Bestaand `app_metadata.role === 'admin'` systeem blijft intact als superadmin bypass
- Enkele `user_roles` tabel met `role_slug` TEXT + CHECK constraint (geen aparte `roles` tabel)
- 7 vaste rollen: activiteiten, trainingsschema, sponsoring, ereleden, contact, content, gebruikers
- `user_has_role()` DB function checkt eerst admin via JWT, dan user_roles tabel
- Roltoekenning geintegreerd in bestaande `/beheer/gebruikers` pagina (geen aparte /beheer/rollen)
- Frontend-only bescherming in fase 1; RLS op bestaande tabellen is fase 2
