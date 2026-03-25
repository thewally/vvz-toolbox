---
name: Rolbeheer feature spec opgeleverd
description: Complete feature spec voor rolgebaseerde toegangscontrole is opgeslagen in .claude/specs/rolbeheer.md
type: project
---

Volledige feature spec voor rolbeheer is opgeleverd en opgeslagen in `.claude/specs/rolbeheer.md`.

**Why:** VVZ Toolbox heeft nu alleen binaire auth (ingelogd/niet ingelogd). Rolbeheer maakt granulaire toegangscontrole per beheeromgeving mogelijk.

**How to apply:** Bij implementatie of wijzigingen aan auth/toegangscontrole, raadpleeg de spec. Key design decisions:
- Database-rollen (niet JWT custom claims) via `roles` + `user_roles` tabellen
- `rol_beheerder` is superadmin en passeert automatisch elke rolcheck via `OR r.slug = 'rol_beheerder'` in de `user_has_role()` DB function
- Client-side mirror in AuthContext via `hasRole()` helper
- ProtectedRoute uitgebreid met optionele `requiredRole` prop
