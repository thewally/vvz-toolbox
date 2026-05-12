# Feature Spec: Toernooi Generator

> Beheerders kunnen toernooien definiëren (teams, velden, categorieën, poules, wedstrijdduur), capaciteit simuleren en automatisch een volledig wedstrijdschema genereren.

Branch: `feature-tournament-creator`

---

## 1. Feature Understanding

### Context

VVZ'49 organiseert regelmatig toernooien (jeugd, senioren, mix). Op dit moment worden schema's handmatig in Excel of op papier gemaakt — foutgevoelig en tijdrovend, vooral wanneer er meerdere velden, categorieën en poules zijn.

De Toernooi Generator stelt beheerders in staat om per toernooi de configuratie in te voeren en het schema in één klik te laten genereren. De velden binnen een toernooi staan **los van** de vaste trainingsschema-velden (Veld 1A, 1B, 6A, 6B, etc.) — een toernooi kan bijvoorbeeld werken met "Hoofdveld", "Veld B", "Pannakooi 1", etc.

### Primaire gebruikers

- **Beheerder met rol `toernooien`** (nieuwe granular role) — maakt en beheert toernooien
- **Superbeheerder** (`app_metadata.role === 'admin'`) — passeert elke rolcheck
- **Publieke bezoeker** — bekijkt het gepubliceerde toernooischema (alleen-lezen)

### Aannames

- Een toernooi gebeurt **op één dag** (één datum). Een meerdaags toernooi valt buiten MVP.
- Tijden tijdens een toernooi liggen tussen **08:00 en 22:00**, in stappen van **5 minuten**. Een wedstrijdduur is dus deelbaar door 5.
- **Round-robin (iedereen tegen iedereen)** binnen een poule is het standaard- en enige format in MVP. Knock-outs / kruisfinales komen later.
- Tussen twee opeenvolgende wedstrijden van een team is er **minimaal 1 wedstrijdduur rust** (configureerbaar per toernooi, default 1 slot).
- Een poule heeft minimaal 2 teams en hoort altijd bij precies één categorie.
- Wedstrijden van verschillende categorieën **mogen** wel parallel op verschillende velden plaatsvinden — categorieën dienen alleen om poule-indeling te scheiden.
- Genereren is **idempotent destructief**: een hergeneratie overschrijft het bestaande schema na bevestiging.
- Het concept (simulatie) en de daadwerkelijke generatie gebruiken dezelfde algoritme-kern, zodat schattingen accuraat zijn.
- Alle UI-tekst is in het Nederlands. Codenamen (tabellen, kolommen, functies) zijn Engels.

### Open vragen / pragmatische beslissingen

- **Pauzes**: één globale lunchpauze per toernooi (start + duur). Geen meerdere pauzes in MVP.
- **Scheidsrechters**: niet ingeroosterd in MVP (kan optioneel handmatig per wedstrijd worden ingevuld als opmerking).
- **Stand bijhouden / uitslagen invoeren**: buiten MVP — eerst alleen schema-generator. Wel een `result` JSONB-kolom op `tournament_matches` om hier later op door te bouwen.
- **Publicatie**: een toernooi heeft een `is_published` flag. Onzichtbaar tot publicatie.
- **PDF-export**: nice-to-have (zelfde patroon als bestaande Plattegrond/Trainingsschema-PDF).

---

## 2. Functionele Requirements

### Must-have (MVP)

#### Beheer

1. **Toernooi-CRUD**
   - Beheerder kan meerdere toernooien aanmaken, bewerken, dupliceren en verwijderen
   - Velden per toernooi: naam, datum, korte beschrijving (multiline), starttijd, eindtijd, wedstrijdduur (minuten), pauze tussen wedstrijden van zelfde team (in slots), optionele lunchpauze (start + minuten), `is_published`
2. **Velden definiëren per toernooi**
   - Beheerder voegt zelf-gekozen veldnamen toe (bv. "Hoofdveld", "Veld B", "Veld C")
   - Volgorde via drag-and-drop of sort-index
   - Minimum 1 veld
3. **Categorieën**
   - Beheerder maakt categorieën binnen een toernooi (bv. "Jeugd", "Senioren", "Dames")
   - Categorieën dienen om poules te scheiden — wedstrijden binnen een poule zijn altijd dezelfde categorie
4. **Teams**
   - Beheerder voert teamnamen in (vrije tekst)
   - Elk team hoort bij één categorie
   - Optioneel: contactpersoon en/of korte notitie per team
5. **Poules**
   - Beheerder maakt poules per categorie en kent teams toe via drag-and-drop
   - Een team kan in maximaal één poule (binnen een toernooi)
   - Een poule heeft minimaal 2 teams (validatie bij genereren)
6. **Capaciteit-simulator**
   - Op basis van velden, beschikbaar tijdsvenster, wedstrijdduur en categorieën rekent de generator uit:
     - Totaal aantal beschikbare wedstrijd-slots
     - Per categorie: aantal mogelijke wedstrijden
     - Voor elke poule-grootte (2..N): aantal benodigde wedstrijden volgens round-robin (`n*(n-1)/2`)
     - **Indicatie**: "Er passen circa **24** wedstrijden in dit tijdsvenster. Op basis van je huidige poule-indeling zijn er **22** wedstrijden nodig — past."
   - Live update bij elke wijziging in configuratie
7. **Schema genereren**
   - Knop "Genereer toernooischema"
   - Vooraf: validaties (alle poules ≥2 teams, ≥1 veld, capaciteit voldoende)
   - Bij hergeneratie: bevestigingsdialoog ("Bestaand schema wordt overschreven")
   - Resultaat: lijst van wedstrijden met `start_time`, `end_time`, `field_id`, `home_team_id`, `away_team_id`, `pool_id`
8. **Schema bekijken & bewerken**
   - Tabel-view: rijen = tijdslots, kolommen = velden, cellen = wedstrijden
   - Lijst-view: chronologisch, gefilterd op categorie/poule/team
   - Per wedstrijd: handmatig veld of starttijd verplaatsen (drag-and-drop of dropdown)
   - Conflictdetectie: een team kan niet twee wedstrijden tegelijk spelen (rode markering)
9. **Publicatie**
   - Toggle `is_published`
   - Gepubliceerde toernooien zijn op publieke URL `/toernooien/:slug` zichtbaar

#### Publiek

10. **Toernooi-overzichtspagina** `/toernooien` — lijst van gepubliceerde toernooien (komende eerst, daarna verleden)
11. **Toernooi-detail** `/toernooien/:slug` — beschrijving, datum, schema (tabel + per team), poule-stand-placeholder

### Nice-to-have

- PDF-export per toernooi (heel schema, of per team)
- Iframe-embed voor externe websites
- Uitslagen invoeren + automatische poule-stand
- Knock-out fase na poulefase
- Scheidsrechter-toewijzing
- E-mail notificatie naar contactpersonen bij publicatie
- Meerdaagse toernooien

### Edge cases

- **Geen velden / geen poules**: knop "Genereer" is disabled met tooltip
- **Capaciteit te krap**: rode waarschuwing in simulator + blokkeren generatie tot opgelost
- **Oneven aantal teams in poule** (geen issue voor round-robin, wel tip in UI: "tip: voeg een rust-bye toe of een extra team")
- **Wedstrijdduur > beschikbare tijd**: validatiefout
- **Lunchpauze valt buiten venster**: validatiefout
- **Twee teams met dezelfde naam binnen één toernooi**: toegestaan (gebruiker zelf verantwoordelijk), maar UI toont waarschuwing
- **Verwijderen van een team na generatie**: cascade verwijdert de wedstrijden van dit team — UI toont bevestiging
- **Empty states**: nieuw toernooi laat onboarding-cards zien ("Voeg eerst velden toe", "Voeg dan teams toe", etc.)
- **Loading / error states**: skeletons en duidelijke foutmeldingen

---

## 3. Data Model

Alle nieuwe tabellen krijgen prefix `tournament_` om naamgevingsbotsingen te voorkomen.

### 3.1 SQL DDL

```sql
-- =============================================================================
-- Migration: Toernooi Generator
-- =============================================================================

-- 1. Hoofdtabel: tournaments
CREATE TABLE tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,                         -- bv. 'jeugdtoernooi-2026'
  name TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  match_duration_minutes INT NOT NULL DEFAULT 15
    CHECK (match_duration_minutes >= 5 AND match_duration_minutes % 5 = 0),
  rest_slots INT NOT NULL DEFAULT 1                  -- aantal slots rust tussen wedstrijden zelfde team
    CHECK (rest_slots >= 0),
  break_start_time TIME,                             -- optionele lunchpauze
  break_duration_minutes INT DEFAULT 0
    CHECK (break_duration_minutes >= 0),
  is_published BOOLEAN NOT NULL DEFAULT false,
  generated_at TIMESTAMPTZ,                          -- laatste keer dat schema is gegenereerd
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tournaments_date ON tournaments(date DESC);
CREATE INDEX idx_tournaments_published ON tournaments(is_published, date DESC);

-- 2. Velden
CREATE TABLE tournament_fields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tournament_id, name)
);

CREATE INDEX idx_tournament_fields_tournament ON tournament_fields(tournament_id, sort_order);

-- 3. Categorieën
CREATE TABLE tournament_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tournament_id, name)
);

-- 4. Teams
CREATE TABLE tournament_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES tournament_categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tournament_teams_tournament ON tournament_teams(tournament_id);
CREATE INDEX idx_tournament_teams_category ON tournament_teams(category_id);

-- 5. Poules
CREATE TABLE tournament_pools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES tournament_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                                -- bv. "Poule A"
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tournament_id, name)
);

-- 6. Team-naar-poule koppeling
CREATE TABLE tournament_pool_teams (
  pool_id UUID NOT NULL REFERENCES tournament_pools(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (pool_id, team_id),
  UNIQUE (team_id)                                   -- team kan maar in één poule (binnen toernooi gegarandeerd via team-FK)
);

-- 7. Gegenereerde wedstrijden
CREATE TABLE tournament_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  pool_id UUID NOT NULL REFERENCES tournament_pools(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES tournament_fields(id) ON DELETE RESTRICT,
  home_team_id UUID NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  away_team_id UUID NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  result JSONB,                                      -- bv. { "home": 3, "away": 1 } — voor latere fase
  notes TEXT,
  manual_override BOOLEAN DEFAULT false,             -- true als handmatig verschoven (overleeft hergeneratie)
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (home_team_id <> away_team_id),
  CHECK (end_time > start_time)
);

CREATE INDEX idx_tournament_matches_tournament ON tournament_matches(tournament_id, start_time);
CREATE INDEX idx_tournament_matches_field ON tournament_matches(field_id, start_time);
CREATE INDEX idx_tournament_matches_pool ON tournament_matches(pool_id);

-- 8. updated_at trigger op tournaments
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 3.2 RLS Policies

Alle 7 tabellen krijgen RLS aan. Het patroon: **publiek lezen** voor gepubliceerde toernooien, **rolgebonden schrijven** via nieuwe `toernooien` rol.

Eerst de nieuwe rol-slug toevoegen aan de bestaande CHECK constraint van `user_roles`:

```sql
-- 9. Nieuwe role slug 'toernooien' toevoegen
ALTER TABLE user_roles
  DROP CONSTRAINT IF EXISTS user_roles_role_slug_check;

ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_role_slug_check CHECK (role_slug IN (
    'activiteiten', 'trainingsschema', 'sponsoring', 'ereleden', 'contact',
    'content', 'gebruikers', 'paginas', 'nieuws', 'verslagen', 'reglementen',
    'vrijwilligers', 'wedstrijden', 'toernooien'
  ));
-- Let op: pas de bestaande lijst aan op basis van wat al in de DB staat — dit is een illustratie.
```

> **Opmerking**: de exacte lijst aan slugs in de huidige `user_roles_role_slug_check` moet bij implementatie worden gelezen uit de live migrations en aangevuld met `'toernooien'`. Wijk daar niet vanaf.

```sql
-- 10. RLS Policies

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_pool_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

-- Helper: kan deze user dit toernooi beheren?
-- Iedere geauthenticeerde gebruiker met de 'toernooien' rol (of admin) mag schrijven op alle toernooien.
-- (Geen per-toernooi eigenaarschap in MVP.)

-- ---- tournaments ----
CREATE POLICY "Publiek mag gepubliceerde toernooien lezen"
  ON tournaments FOR SELECT
  USING (is_published = true OR user_has_role('toernooien'));

CREATE POLICY "Toernooi-beheerders mogen toernooien aanmaken"
  ON tournaments FOR INSERT
  WITH CHECK (user_has_role('toernooien'));

CREATE POLICY "Toernooi-beheerders mogen toernooien aanpassen"
  ON tournaments FOR UPDATE
  USING (user_has_role('toernooien'))
  WITH CHECK (user_has_role('toernooien'));

CREATE POLICY "Toernooi-beheerders mogen toernooien verwijderen"
  ON tournaments FOR DELETE
  USING (user_has_role('toernooien'));

-- ---- tournament_fields, _categories, _teams, _pools, _pool_teams, _matches ----
-- Patroon: lezen mag publiek voor gepubliceerde toernooien, schrijven alleen met rol.
-- Voorbeeld voor één tabel — herhaal voor de rest:

CREATE POLICY "Publiek leest velden van gepubliceerde toernooien"
  ON tournament_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_fields.tournament_id
        AND (t.is_published = true OR user_has_role('toernooien'))
    )
  );

CREATE POLICY "Toernooi-beheerders schrijven velden"
  ON tournament_fields FOR ALL
  USING (user_has_role('toernooien'))
  WITH CHECK (user_has_role('toernooien'));

-- … en hetzelfde patroon voor:
--   tournament_categories
--   tournament_teams
--   tournament_pools
--   tournament_pool_teams (join via pool_id → tournaments)
--   tournament_matches
```

### 3.3 Storage / extra resources

Geen storage buckets nodig. Alle data zit in PostgreSQL.

---

## 4. Service Layer

Nieuwe files in `src/services/`. Volgen het bestaande `{ data, error }` patroon.

### 4.1 `src/services/tournaments.js`

```js
// Toernooi-CRUD
export async function fetchTournaments({ onlyPublished = false } = {})
export async function fetchTournamentBySlug(slug)
export async function fetchTournamentById(id)
export async function createTournament(payload)
export async function updateTournament(id, updates)
export async function deleteTournament(id)
export async function duplicateTournament(id, { newName, newDate })
export async function publishTournament(id, isPublished)

// Slug-helpers
export function generateSlug(name, date)            // 'Jeugdtoernooi 2026' + date → 'jeugdtoernooi-2026-05-30'
```

### 4.2 `src/services/tournamentFields.js`

```js
export async function fetchFields(tournamentId)
export async function createField(tournamentId, name)
export async function updateField(id, updates)
export async function deleteField(id)
export async function reorderFields(tournamentId, orderedIds)
```

### 4.3 `src/services/tournamentCategories.js`

```js
export async function fetchCategories(tournamentId)
export async function createCategory(tournamentId, name)
export async function updateCategory(id, updates)
export async function deleteCategory(id)            // RESTRICT als er teams aan hangen
```

### 4.4 `src/services/tournamentTeams.js`

```js
export async function fetchTeams(tournamentId)
export async function createTeam(tournamentId, payload)
export async function updateTeam(id, updates)
export async function deleteTeam(id)
export async function bulkCreateTeams(tournamentId, teams)   // CSV-import in nice-to-have
```

### 4.5 `src/services/tournamentPools.js`

```js
export async function fetchPools(tournamentId)              // join met pool_teams + teams
export async function createPool(tournamentId, categoryId, name)
export async function updatePool(id, updates)
export async function deletePool(id)
export async function setPoolTeams(poolId, teamIds)         // overschrijft koppelingen
export async function moveTeamToPool(teamId, poolId)
```

### 4.6 `src/services/tournamentMatches.js`

```js
export async function fetchMatches(tournamentId)            // chronologisch
export async function fetchMatchesGrouped(tournamentId)     // door velden en tijdslots
export async function updateMatch(id, updates)              // zet manual_override = true
export async function deleteAllMatches(tournamentId)        // pre-generatie cleanup
export async function bulkInsertMatches(rows)               // post-generatie save
```

### 4.7 `src/services/tournamentSchedule.js` — algoritmekern

```js
// Pure functions — geen Supabase calls. Worden zowel in simulator als generator gebruikt.

/**
 * Bereken hoeveel matchslots er zijn op basis van toernooi-config.
 * @returns { totalSlots, slotsPerField, perCategoryCapacity }
 */
export function calculateCapacity({
  startTime, endTime, matchDurationMinutes,
  breakStartTime, breakDurationMinutes,
  fields,                  // [{ id, name }]
  categories,              // [{ id, name }] — voor MVP geen categorie-specifieke velden
})

/**
 * Genereer round-robin parings binnen een poule.
 * Implementeert de circle method (zie §6).
 * @returns Array<{ round, homeTeamId, awayTeamId }>
 */
export function generateRoundRobinPairings(teamIds)

/**
 * Plan alle wedstrijden in over velden en tijdslots.
 * @returns { matches, warnings, isFeasible }
 */
export function generateSchedule({
  tournament,              // { startTime, endTime, matchDurationMinutes, restSlots, breakStartTime, breakDurationMinutes }
  fields,                  // [{ id, name, sort_order }]
  pools,                   // [{ id, categoryId, teamIds }]
})
```

---

## 5. UI/UX Design

### 5.1 Routing

Nieuwe routes (te registreren in `App.jsx`):

| Route | Component | Toegang |
|---|---|---|
| `/toernooien` | `ToernooienPage` | publiek |
| `/toernooien/:slug` | `ToernooiDetailPage` | publiek (alleen `is_published=true`) |
| `/beheer/toernooien` | `ToernooienBeheerPage` | rol `toernooien` |
| `/beheer/toernooien/nieuw` | `ToernooiBewerkenPage` | rol `toernooien` |
| `/beheer/toernooien/:id` | `ToernooiBewerkenPage` (tabs) | rol `toernooien` |

`ToernooiBewerkenPage` werkt met **tabs**, vergelijkbaar met de wizard-stijl van `TrainingschemaBeheerPage`:

1. **Algemeen** — naam, datum, beschrijving, tijden, wedstrijdduur, pauzes
2. **Velden** — lijst + add/remove/reorder
3. **Categorieën** — lijst + CRUD
4. **Teams** — tabel, filter op categorie, toevoegen/bewerken
5. **Poules** — kanban-stijl: per categorie kolommen met poules, teams sleepbaar
6. **Simulatie** — capaciteit-overzicht, validaties, knop "Genereer schema"
7. **Schema** — tabel-view (velden × tijdslots) + lijst-view, handmatige aanpassingen, publiceren

### 5.2 Componenten

Nieuw, in `src/components/`:

- `ToernooiWizardTabs.jsx` — tabbar met badge voor onvolledige stappen
- `ToernooiVeldenEditor.jsx` — inline edit + drag-handle (gebruik `@dnd-kit` als al beschikbaar, anders simpele up/down knoppen)
- `ToernooiCategorieenEditor.jsx`
- `ToernooiTeamsEditor.jsx` — tabel met inline toevoegen
- `ToernooiPoulesEditor.jsx` — drag-and-drop teams tussen poules (`@dnd-kit/core` + `@dnd-kit/sortable`)
- `ToernooiSimulator.jsx` — toont capaciteit, kleurgecodeerde validaties (groen/oranje/rood)
- `ToernooiSchemaTabel.jsx` — gridweergave: rows = tijdslots, columns = velden
- `ToernooiSchemaLijst.jsx` — chronologische tabel met filters
- `ToernooiPubliekHeader.jsx` — voor publieke detailpagina

In `src/components/BeheerLayout`-tegels (`BeheerDashboardPage`): nieuwe tile **"Toernooien"** met `role: 'toernooien'`.

### 5.3 Navigatie

- **Top-level**: in TopNav bij `Wedstrijden` of als losse entry "Toernooien" — aanwezig als er minstens één gepubliceerd toernooi is. Anders verbergen.
- **Beheer**: nieuwe tegel op `/beheer` dashboard.
- **Asset paths**: alle iconen via `import.meta.env.BASE_URL` indien afbeeldingen worden gebruikt.

### 5.4 Visueel ontwerp

- Tailwind only, conform bestaande huistijl (groen `vvz-green`, witte cards, rounded-lg, shadow-sm)
- Tabel-view voor schema gebruikt sticky header (tijdslots) en sticky first column (velden)
- Mobile-first: op klein scherm wordt schema-tabel gestapeld per veld
- Empty states tonen onboarding-cards met groene call-to-action
- Touch targets ≥ 44px

### 5.5 Loading / error states

- Skeleton loaders bij eerste fetch
- Toast notificaties voor save/delete (gebruik bestaande pattern)
- "Genereer schema": loading-overlay met spinner ("Schema wordt berekend…")

---

## 6. Algoritme-ontwerp

### 6.1 Round-robin pairings (circle method)

Standaard round-robin voor `n` teams:
- Als `n` oneven is: voeg een dummy "BYE" team toe → `n+1` teams
- Aantal rondes = `n - 1` (bij even n)
- Aantal wedstrijden per ronde = `n / 2`

**Circle method (Berger-tabel)**:
```
Fix team 0 op positie 0. Roteer de overige teams met de klok mee na elke ronde.
Per ronde: paar positie i tegen positie n-1-i (i = 0..n/2-1).
Wedstrijden waarbij een team tegen "BYE" speelt worden weggelaten.
```

Pseudo-code:

```js
function generateRoundRobinPairings(teamIds) {
  const teams = [...teamIds]
  const hasBye = teams.length % 2 === 1
  if (hasBye) teams.push('BYE')

  const n = teams.length
  const rounds = []

  for (let round = 0; round < n - 1; round++) {
    const pairings = []
    for (let i = 0; i < n / 2; i++) {
      const home = teams[i]
      const away = teams[n - 1 - i]
      if (home !== 'BYE' && away !== 'BYE') {
        // Wissel home/away om de beurt voor balans
        pairings.push(round % 2 === 0
          ? { round, homeTeamId: home, awayTeamId: away }
          : { round, homeTeamId: away, awayTeamId: home })
      }
    }
    rounds.push(pairings)
    // Roteer: behoud teams[0], roteer rest met de klok mee
    teams.splice(1, 0, teams.pop())
  }

  return rounds.flat()
}
```

### 6.2 Schedule packing over velden en tijdslots

Doel: alle wedstrijden over alle poules inplannen op de minst-mogelijke tijdslots, zonder dat een team conflicten heeft (eigen wedstrijden niet overlappend, en `restSlots` rust ertussen).

**Inputs**:
- `slots`: [t0, t1, …] — alle starttijden (begin → eind, stap = `matchDurationMinutes`, met lunchpauze eruit gefilterd)
- `fields`: [F1, F2, …]
- `matchesToSchedule`: alle parings uit alle poules (round-robin output, gemerged)

**Algoritme** (greedy scheduler met round-robin spreiding):

```
1. Sorteer matchesToSchedule per ronde (alle ronde-1 wedstrijden eerst, dan ronde-2, ...).
   Optioneel: shuffle binnen ronde voor betere veld-spreiding.

2. Initialiseer:
   - assignment: Map<slotIndex, Map<fieldId, match>>
   - teamLastSlot: Map<teamId, slotIndex>     // laatst gespeelde slot

3. Voor elke match m in matchesToSchedule:
   slotsLoop:
   for slotIndex = 0..slots.length-1:
     for field in fields:
       if assignment[slotIndex][field] !== undefined: continue   // bezet

       const homeLast = teamLastSlot.get(m.homeTeamId)
       const awayLast = teamLastSlot.get(m.awayTeamId)
       const restOk = (last) => last === undefined || (slotIndex - last) > restSlots

       if (!restOk(homeLast) || !restOk(awayLast)) continue

       // Geen conflict in dit slot: teams niet al in andere wedstrijd op zelfde slot
       const teamsInSlot = collectTeamsInSlot(assignment, slotIndex)
       if (teamsInSlot.has(m.homeTeamId) || teamsInSlot.has(m.awayTeamId)) continue

       // Plaats
       assignment[slotIndex][field] = m
       teamLastSlot.set(m.homeTeamId, slotIndex)
       teamLastSlot.set(m.awayTeamId, slotIndex)
       break slotsLoop

   if (niet geplaatst): voeg toe aan warnings ("kon match X niet plannen — onvoldoende capaciteit")

4. Return { matches: flatten(assignment), warnings, isFeasible: warnings.length === 0 }
```

**Optimalisaties** (nice-to-have, niet MVP):
- Backtracking als greedy faalt
- Heuristiek: wedstrijden in dezelfde categorie/poule spreiden over meerdere velden parallel
- Minimaliseer max-wachttijd per team (fairness)

### 6.3 Capaciteit-berekening (simulator)

```js
function calculateCapacity({ startTime, endTime, matchDurationMinutes, breakStartTime, breakDurationMinutes, fields }) {
  const totalMinutes = minutesBetween(startTime, endTime) - (breakDurationMinutes || 0)
  const slotsPerField = Math.floor(totalMinutes / matchDurationMinutes)
  const totalSlots = slotsPerField * fields.length

  // Per poule: matches needed = n*(n-1)/2
  return { totalSlots, slotsPerField }
}

function totalMatchesNeeded(pools) {
  return pools.reduce((sum, p) => {
    const n = p.teamIds.length
    return sum + (n * (n - 1)) / 2
  }, 0)
}
```

UI vergelijkt `totalMatchesNeeded` met `totalSlots` — toont groen als ≤ 80%, oranje 80-100%, rood >100%.

### 6.4 Manual overrides bij hergeneratie

Wedstrijden met `manual_override = true` blijven behouden bij hergeneratie. Het algoritme:
1. Lees bestaande matches met `manual_override = true`
2. Markeer hun slots/velden als bezet
3. Genereer alleen de overige wedstrijden in de resterende slots
4. (MVP-scope: kan ook simpeler — gewoon altijd alles overschrijven, met een dialog dat dat duidelijk maakt)

---

## 7. Implementatieplan

| # | Taak | Complexiteit | Afh. |
|---|---|---|---|
| 1 | DB migratie schrijven (`migration_toernooien.sql`) — alle tabellen, RLS, role-slug update | M | — |
| 2 | DB migratie testen lokaal + applyen op Supabase | S | 1 |
| 3 | `services/tournaments.js` — basale CRUD | S | 1 |
| 4 | `services/tournamentFields.js` + `tournamentCategories.js` + `tournamentTeams.js` | M | 1 |
| 5 | `services/tournamentPools.js` met team-koppelingen | M | 4 |
| 6 | `services/tournamentSchedule.js` — pure algoritme functies + unit tests | L | — |
| 7 | `services/tournamentMatches.js` — bulk insert/delete | S | 1 |
| 8 | Routes registreren in `App.jsx`, ProtectedRoute met `requiredRole="toernooien"` | S | 3 |
| 9 | `ToernooienBeheerPage` — lijst + nieuw-knop | S | 3 |
| 10 | `ToernooiBewerkenPage` schil met tabbar + tab "Algemeen" | M | 3, 8 |
| 11 | Tab "Velden" + `ToernooiVeldenEditor` | M | 4, 10 |
| 12 | Tab "Categorieën" + `ToernooiCategorieenEditor` | S | 4, 10 |
| 13 | Tab "Teams" + `ToernooiTeamsEditor` | M | 4, 10, 12 |
| 14 | Tab "Poules" + drag-and-drop tussen poules (`@dnd-kit`) | L | 5, 13 |
| 15 | Tab "Simulatie" + `ToernooiSimulator` (capaciteit) | M | 6, 11–14 |
| 16 | Genereer-knop: integratie van `generateSchedule` + bulk save | M | 6, 7, 15 |
| 17 | Tab "Schema" — tabel + lijst-view, manual edit | L | 7, 16 |
| 18 | `BeheerDashboardPage` — nieuwe tile "Toernooien" | S | 8 |
| 19 | Publieke `ToernooienPage` (lijst) | S | 3 |
| 20 | Publieke `ToernooiDetailPage` met schema-weergave | M | 7, 19 |
| 21 | TopNav-integratie (conditioneel zichtbaar) | S | 19 |
| 22 | Empty/loading/error states + toaster meldingen | M | 9–20 |
| 23 | E2E smoketest: aanmaken → vullen → genereren → publiceren → publiek bekijken | M | alle |
| 24 | (Nice-to-have) PDF export | M | 17 |
| 25 | (Nice-to-have) Uitslagen invoeren + poule-stand | L | 17 |

**Geschatte totaal MVP**: 1–14 + 9–23 ≈ 4–6 dagen werk voor één developer.

### Risico's

- **`@dnd-kit` afhankelijkheid**: controleer of de package al in `package.json` staat. Zo niet: toevoegen of fallback naar simpele select-dropdowns voor poule-toewijzing.
- **Slug-collisies** bij dupliceren: handle in service met counter-suffix
- **Performance simulator**: bij elke wijziging herrekenen — pure JS dus geen issue
- **RLS-policy fouten**: end-to-end testen met een niet-admin user die alleen `toernooien` rol heeft

---

## 8. Out of Scope

Expliciet niet meegenomen in deze feature-elaboratie / MVP:

1. **Meerdaagse toernooien** — alle wedstrijden zijn op één datum
2. **Knock-outfase / kruisfinales / play-offs** — alleen round-robin per poule
3. **Uitslagen invoeren + automatische standberekening** — wel `result` JSONB-kolom voor toekomst
4. **Scheidsrechtertoewijzing**
5. **Spelersregistratie / inschrijfformulier voor teams** (zelfregistratie via publieke pagina)
6. **Notificaties / e-mails** naar teams of contactpersonen
7. **Kalender-export (.ics)** per team
8. **Iframe-embed** voor andere clubs
9. **PDF-export** (nice-to-have, kan later)
10. **Permissies per toernooi** (eigenaarschap) — alle rolhouders kunnen alle toernooien bewerken
11. **Statistieken / rankings cross-toernooi**
12. **Internationalisatie** — alles is Nederlands

---

## 9. Quality Checklist

- [x] Alle UI-tekst in het Nederlands
- [x] Asset paths via `import.meta.env.BASE_URL` (n.v.t. — geen statische assets)
- [x] BrowserRouter (`basename="/vvz-toolbox"`) compatibel — alleen relatieve routes
- [x] RLS policies voor elke nieuwe tabel
- [x] `{ data, error }` pattern in alle service-functies
- [x] Tailwind CSS only
- [x] Past in bestaande structuur (`/beheer/...`, services, components)
- [x] Empty / loading / error states gespecificeerd
- [x] Nieuwe rol `toernooien` aangesloten op bestaand rolbeheer-systeem
- [x] Concrete SQL DDL inclusief constraints en indexes
- [x] Algoritme volledig uitgeschreven (round-robin + greedy scheduler)
