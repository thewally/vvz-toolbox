---
name: Wedstrijden feature spec
description: Feature spec voor Wedstrijden-module (Sportlink API integratie) opgeslagen in .claude/specs/wedstrijden.md
type: project
---

Volledige feature-specificatie voor de Wedstrijden-module is opgesteld en opgeslagen in `.claude/specs/wedstrijden.md`. Spec bevat volledige API-analyse met response shapes van 6 Sportlink endpoints.

**Why:** VVZ'49 wil wedstrijdprogramma, uitslagen, standen en teampagina's tonen met data uit de Sportlink Club.Dataservice API. Geen Supabase opslag.

**How to apply:**
- Sportlink API heeft open CORS (`Access-Control-Allow-Origin: *`), directe browser-calls zijn mogelijk
- Het endpoint `stand` bestaat NIET; gebruik `poulestand` met `poulecode` parameter
- `eigenteam` velden in responses zijn strings ("true"/"false"), niet booleans
- Logo-URL's in Sportlink responses verlopen (bevatten `expires` en `sig` params)
- VVZ'49 client_id is nog niet beschikbaar; gebruik `VITE_SPORTLINK_CLIENT_ID` env var
- Afgelastingen response shape is onbevestigd (alleen lege array gezien)
- Hybride data-aanpak: teams/staf via GitHub Actions cache, programma/uitslagen/stand/afgelastingen direct van API
- Weeklogica: voetbalweek begint op zondag (niet ISO maandag)
