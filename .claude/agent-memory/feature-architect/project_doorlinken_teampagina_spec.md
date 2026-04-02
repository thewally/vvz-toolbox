---
name: Doorlinken naar teampagina spec
description: Feature spec voor klikbare wedstrijd-cards in Programma/Uitslagen die navigeren naar teampagina
type: project
---

Feature spec opgeleverd in `.claude/specs/doorlinken-naar-teampagina.md` op 2026-04-02.

Key design decision: Sportlink wedstrijd-objecten bevatten geen `teamcode`, alleen `teamnaam` en `clubrelatiecode`. Oplossing: teams-lijst laden en een `teamnaam -> teamcode` lookup-map bouwen. Bij twee VVZ-teams tegen elkaar: thuisteam wint.

**Why:** De Sportlink API `/programma` en `/uitslagen` endpoints retourneren geen teamcode, dus een join met `/teams` data is nodig.

**How to apply:** Bij toekomstige features die wedstrijden willen koppelen aan teams, dezelfde lookup-strategie gebruiken.
