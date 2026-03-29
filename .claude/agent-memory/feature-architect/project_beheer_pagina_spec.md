---
name: Beheer-pagina spec
description: Feature spec voor centrale /beheer landingspagina die alle admin-onderdelen bundelt
type: project
---

Centrale beheer-pagina spec opgeleverd in `.claude/specs/beheer-pagina.md`.

**Why:** Beheer was verspreid over drie onafhankelijke routes (/agenda/beheer, /trainingsschema/beheer, /sponsoring/beheer) zonder centrale ingang of gedeelde navigatie.

**How to apply:** Alle toekomstige beheer-onderdelen moeten als child-route onder /beheer worden toegevoegd en een tegel krijgen op het BeheerDashboardPage. Oude feature-specifieke beheer-routes worden redirects.
