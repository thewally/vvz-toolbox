# Feature Specificatie: Wedstrijden

## 1. Feature Understanding

De **Wedstrijden**-module is een nieuw toolbox-item voor de VVZ'49 Toolbox dat wedstrijdgegevens toont via de **Sportlink Club.Dataservice API**. Er wordt geen data opgeslagen in Supabase -- alle data komt direct van Sportlink (CORS staat open: `Access-Control-Allow-Origin: *`) of via gecachte statische JSON/iCal-bestanden gegenereerd door GitHub Actions.

### Primaire gebruikers

- **Publieke bezoekers**: bekijken wedstrijdprogramma, uitslagen, standen, teampagina's
- **Spelers/ouders**: raadplegen teampagina voor eerstvolgende wedstrijd, agenda-abonnement
- **Geen admin nodig**: alle data komt van Sportlink, geen beheeromgeving

### Aannames

- VVZ'49 krijgt een eigen Sportlink `client_id`; tot die tijd wordt `VITE_SPORTLINK_CLIENT_ID` als env var gebruikt
- De clubrelatiecode van VVZ'49 wordt geconfigureerd als `VITE_SPORTLINK_CLUB_RELATIECODE` (bij FC Trias = `FZSZ66G`)
- Teamfoto's en stafgegevens die niet uit Sportlink komen, worden beheerd als statische assets of via Supabase (apart in te richten)
- De `afgelastingen` endpoint retourneert een lege array als er geen afgelastingen zijn (bevestigd via API-test)

---

## 2. Functionele Eisen

### Must-have (MVP)

#### A. Teampagina (`/wedstrijden/:teamSlug`)

| Requirement | Details |
|---|---|
| Eerstvolgende wedstrijd uitgelicht | Datum, tijd, aanwezigheidstijd (45 min voor aanvang), thuis/uit indicator, locatie, tegenstander met logo |
| WhatsApp deelknop | Voorgeformatteerd bericht met wedstrijdinfo |
| Alle geplande wedstrijden | Tabel/lijst met alle toekomstige wedstrijden van het team |
| Uitslagen lopende competitie | Uitslagen van het team in de huidige fase (via `uitslagen?teamcode=X`) |
| Stand lopende competitie | Competitiestand (via `poulestand?poulecode=X`) |
| Staf | Kadertje met trainers/leiders uit `team-indeling` (filter `rol != "Teamspeler"`) |
| Trainingstijden | Afgeleid uit bestaande `training_slots` tabel (koppeling via teamnaam) |
| Agenda-abonneerknop | Link naar statisch iCal-bestand (`/wedstrijden/ical/:teamSlug.ics`) |

#### B. Wedstrijdprogramma cluboverzicht (`/wedstrijden`)

| Requirement | Details |
|---|---|
| Huidige speelweek | Zondag t/m zaterdag (week wisselt op zondag) |
| Groepering per dag | Wedstrijden gegroepeerd per datum |
| Automatisch filteren | Gespeelde wedstrijden (`status === "Uitgespeeld"`) worden niet getoond |
| Link naar teampagina | Elke wedstrijd linkt door naar de teampagina |

#### C. Uitslagenpagina (`/wedstrijden/uitslagen`)

| Requirement | Details |
|---|---|
| Periode | Vorige zondag t/m vandaag (of t/m zaterdag als het zaterdag is) |
| Groepering | Per dag, met per wedstrijd: thuis-uit, score, teamlogo's |
| Geen resultaten | Lege state: "Geen uitslagen deze week" |

#### D. Afgelastingen-indicator (herbruikbaar component)

| Kleur | Betekenis |
|---|---|
| Groen | Geen afgelastingen |
| Geel | Sommige wedstrijden afgelast |
| Oranje | Alle thuiswedstrijden afgelast, niet alle uitwedstrijden |
| Rood | Alle thuis- en uitwedstrijden afgelast |

Wordt getoond in de header (Layout.jsx) en op de HomePage.

#### E. iCal-generatie (GitHub Actions)

| Requirement | Details |
|---|---|
| Dagelijkse job om 06:00 | Genereert per team een `.ics` bestand |
| Opslag | `public/wedstrijden/ical/<teamSlug>.ics` -- gecommit naar repo |
| Webcal-URL | `webcal://thewally.github.io/vvz-toolbox/wedstrijden/ical/<teamSlug>.ics` |

### Nice-to-have

- Teamfoto als hero-image op teampagina
- Wedstrijddetailpagina (via `wedstrijd-informatie?wedstrijdcode=X`)
- Historische standen (eerdere fases)
- Push-notificatie bij afgelastingen
- Zoekfunctie/filter op teamnaam in programma-overzicht

### Edge cases

- **Geen wedstrijden gepland**: lege state met melding
- **API onbereikbaar**: foutmelding met retry-knop; indien gecachte data beschikbaar, toon die
- **Team zonder poulecode** (bijv. oefenwedstrijden): geen stand tonen
- **Meerdere competities per team** (regulier + beker): toon stand alleen voor `competitiesoort === "regulier"`
- **Afgelastingen-endpoint leeg**: groen lampje
- **Teamslug niet gevonden**: 404-pagina met link naar overzicht

---

## 3. API-analyse (Sportlink Club.Dataservice)

Alle endpoints: `https://data.sportlink.com/<endpoint>?client_id=<CLIENT_ID>`

CORS: `Access-Control-Allow-Origin: *` -- directe browser-calls zijn mogelijk.

### 3.1 `teams`

**URL**: `teams?gebruiklokaleteamgegevens=NEE&client_id=<CID>`

**Response**: `Array<Team>`

```typescript
interface Team {
  teamcode: number;          // 169961
  lokaleteamcode: number;    // -1
  poulecode: number;         // 788564
  teamnaam: string;          // "FC Trias 1"
  competitienaam: string;    // "0512 Mannen Zondag standaard (A-cat)"
  klasse: string;            // "3e klasse"
  poule: string;             // "K"
  klassepoule: string;       // "3e klasse K"
  spelsoort: string;         // "Veld Algemeen/Zondag"
  competitiesoort: string;   // "regulier" | "beker"
  geslacht: string;          // "man" | "vrouw"
  teamsoort: string;         // "bond"
  leeftijdscategorie: string; // "Senioren" | "Junioren"
  kalespelsoort: string;     // "VE"
  speeldag: string;          // "Zondag" | "Zaterdag"
  speeldagteam: string;      // "zondag speeldag"
  more: string;              // "team-indeling?teamcode=169961&..."
}
```

**Let op**: Een team kan meerdere entries hebben (regulier + beker + meerdere fases). Groepeer op `teamcode` en filter op `competitiesoort === "regulier"` voor de hoofdcompetitie.

### 3.2 `programma`

**URL**: `programma?client_id=<CID>` (alle teams) of `programma?teamcode=<TC>&client_id=<CID>` (1 team)

**Response**: `Array<Wedstrijd>`

```typescript
interface Wedstrijd {
  wedstrijddatum: string;        // ISO 8601: "2026-03-29T14:00:00+0200"
  wedstrijdcode: number;         // 19608395
  wedstrijdnummer: number;       // 630
  teamnaam: string;              // "FC Trias 1"
  thuisteamclubrelatiecode: string; // "FZSZ66G"
  uitteamclubrelatiecode: string;
  thuisteamid: number;
  thuisteam: string;             // "FC Trias 1"
  thuisteamlogo: string | null;  // URL naar logo (met expiry + sig)
  uitteamid: number;
  uitteam: string;
  uitteamlogo: string | null;
  teamvolgorde: number;
  competitiesoort: string;       // "regulier" | "beker" | "Oefenwedstrijd"
  competitie: string;
  klasse: string;
  poule: string;
  klassepoule: string;
  kaledatum: string;             // "2026-03-29 00:00:00.00"
  datum: string;                 // "29 mrt."
  vertrektijd: string;
  verzameltijd: string;
  aanvangstijd: string;          // "14:00"
  wedstrijd: string;             // "FC Trias 1 - DVV 1"
  status: string;                // "Te spelen" | "Uitgespeeld"
  scheidsrechters: string;
  scheidsrechter: string;
  accommodatie: string;          // "Sportpark 't Huitinkveld"
  veld: string;
  locatie: string;               // "Veld" | "Outdoor"
  plaats: string;                // "WINTERSWIJK"
  rijders: string | null;
  kleedkamerthuisteam: string;
  kleedkameruitteam: string;
  kleedkamerscheidsrechter: string;
  meer: string;                  // "wedstrijd-informatie?wedstrijdcode=..."
}
```

### 3.3 `uitslagen`

**URL**: `uitslagen?client_id=<CID>` (alle teams) of `uitslagen?teamcode=<TC>&client_id=<CID>`

**Response**: `Array<Uitslag>`

```typescript
interface Uitslag {
  wedstrijddatum: string;          // ISO 8601
  wedstrijdcode: number;
  wedstrijdnummer: number;
  datum: string;                    // "2026-03-21 00:00:00.00"
  wedstrijd: string;                // "FC Dinxperlo 1 - FC Trias 1"
  datumopgemaakt: string;           // "21 mrt."
  accommodatie: string;
  aanvangstijd: string;
  thuisteam: string;
  thuisteamid: string;              // NB: string, niet number!
  thuisteamlogo: string;
  thuisteamclubrelatiecode: string;
  uitteamclubrelatiecode: string;
  uitteam: string;
  uitteamid: string;
  uitteamlogo: string;
  uitslag: string;                  // "1 - 1"
  "uitslag-regulier": string;       // "1 - 1"
  "uitslag-nv": string | null;      // na verlenging
  "uitslag-s": string | null;       // na strafschoppen
  competitienaam: string;
  competitiesoort: string;
  eigenteam: string;                // "true" | "false"
  sportomschrijving: string;
  verenigingswedstrijd: string;     // "Ja" | "Nee"
  status: string;                   // "Uitgespeeld"
  meer: string;
}
```

### 3.4 `poulestand`

**URL**: `poulestand?poulecode=<PC>&client_id=<CID>`

**Response**: `Array<StandRij>`

```typescript
interface StandRij {
  positie: number;              // 1
  teamnaam: string;             // "DCS 1"
  clubrelatiecode: string;
  clublogo: string;             // URL
  gespeeldewedstrijden: number;
  gewonnen: number;
  gelijk: number;
  verloren: number;
  doelpuntenvoor: number;
  doelpuntentegen: number;
  doelsaldo: number;
  verliespunten: number;
  punten: number;
  eigenteam: string;            // "true" | "false"
}
```

**Let op**: `eigenteam` is een string, niet boolean.

### 3.5 `afgelastingen`

**URL**: `afgelastingen?client_id=<CID>`

**Response**: `Array<Afgelasting>` (leeg als er geen afgelastingen zijn)

Response shape niet bevestigd (leeg bij test). Verwachte velden op basis van Sportlink documentatie:

```typescript
interface Afgelasting {
  wedstrijdcode: number;
  wedstrijd: string;
  datum: string;
  aanvangstijd: string;
  accommodatie: string;
  reden: string;
  thuisteam: string;
  uitteam: string;
  thuisteamclubrelatiecode: string;
  uitteamclubrelatiecode: string;
}
```

### 3.6 `team-indeling`

**URL**: `team-indeling?teamcode=<TC>&lokaleteamcode=-1&gebruiklokaleteamgegevens=NEE&client_id=<CID>`

**Response**: `Array<TeamLid>`

```typescript
interface TeamLid {
  relatiecode: string | null;
  naam: string;                // "Abbink, Kay" of "Afgeschermd"
  voornaam: string;
  achternaam: string;
  tussenvoegsel: string | null;
  geslacht: string | null;
  rol: string;                 // "Overige staf" | "Teamspeler" | "Trainer" | "Leider"
  functie: string;             // "Assistent-scheidsrechter(club)" | "Aanvaller" | ""
  einddatum: string | null;
  email: string | null;        // meestal null (privacy)
  telefoon: string | null;
  mobiel: string | null;
  foto: string | null;
}
```

**Privacy**: de meeste spelers staan als "Afgeschermd". Alleen staf met een naam is bruikbaar. Filter op `rol !== "Teamspeler"` en `naam !== "Afgeschermd"` voor het staf-kadertje.

### 3.7 Endpoint niet gevonden: `stand`

Het endpoint `stand` bestaat niet (`4041 Article does not exist`). Gebruik `poulestand` in plaats daarvan.

---

## 4. Data Flow

### Aanbeveling: hybride aanpak

| Data | Bron | Motivatie |
|---|---|---|
| Teams-lijst | **GitHub Actions cache** (`public/data/teams.json`) | Verandert zelden, voorkomt onnodige API-calls. Dagelijkse refresh. |
| Programma (club) | **Direct API-call** | Moet actueel zijn (afgelastingen, tijdwijzigingen) |
| Programma (team) | **Direct API-call** | Idem |
| Uitslagen | **Direct API-call** | Moet actueel zijn (scores worden op wedstrijddag bijgewerkt) |
| Poulestand | **Direct API-call** | Wijzigt na elke speelronde |
| Afgelastingen | **Direct API-call** | Moet real-time actueel zijn |
| Team-indeling (staf) | **GitHub Actions cache** (`public/data/staf/<teamSlug>.json`) | Verandert zelden, privacy-gevoelig |
| iCal-bestanden | **GitHub Actions** (`public/wedstrijden/ical/<teamSlug>.ics`) | Statisch bestand nodig voor webcal-protocol |

### GitHub Actions workflow: `sportlink-cache.yml`

```yaml
name: Sportlink Data Cache
on:
  schedule:
    - cron: '0 4 * * *'    # 06:00 CET (04:00 UTC)
  workflow_dispatch:

jobs:
  cache:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: node scripts/sportlink-cache.js
        env:
          SPORTLINK_CLIENT_ID: ${{ secrets.SPORTLINK_CLIENT_ID }}
          SPORTLINK_CLUB_RELATIECODE: ${{ secrets.SPORTLINK_CLUB_RELATIECODE }}
      - run: node scripts/generate-ical.js
        env:
          SPORTLINK_CLIENT_ID: ${{ secrets.SPORTLINK_CLIENT_ID }}
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore: update Sportlink cache en iCal-bestanden"
          file_pattern: "public/data/** public/wedstrijden/ical/**"
```

### Cachebestanden

```
public/
  data/
    teams.json              # Array van teams (gededupliceerd op teamcode, alleen regulier)
    staf/
      selectie.json         # Staf per team
      jo19.json
      ...
  wedstrijden/
    ical/
      selectie.ics
      jo19.ics
      ...
```

### Env variabelen

| Variabele | Gebruik | Waar |
|---|---|---|
| `VITE_SPORTLINK_CLIENT_ID` | Client-side API calls | `.env`, GitHub Secrets |
| `VITE_SPORTLINK_CLUB_RELATIECODE` | Bepalen thuis/uit | `.env`, GitHub Secrets |
| `SPORTLINK_CLIENT_ID` | GitHub Actions scripts | GitHub Secrets |
| `SPORTLINK_CLUB_RELATIECODE` | GitHub Actions scripts | GitHub Secrets |

---

## 5. Service Layer

### `src/services/sportlink.js`

Basis-client voor Sportlink API:

```javascript
const BASE_URL = 'https://data.sportlink.com';
const CLIENT_ID = import.meta.env.VITE_SPORTLINK_CLIENT_ID;
const CLUB_RELATIECODE = import.meta.env.VITE_SPORTLINK_CLUB_RELATIECODE;

async function sportlinkFetch(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set('client_id', CLIENT_ID);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Sportlink API error: ${response.status}`);
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
```

### `src/services/wedstrijden.js`

```javascript
/**
 * Haal alle teams op (uit cache of API).
 * @returns {{ data: Team[] | null, error: Error | null }}
 */
export async function getTeams()

/**
 * Haal team op basis van slug.
 * @param {string} teamSlug - bijv. "selectie", "jo19"
 * @returns {{ data: Team | null, error: Error | null }}
 */
export async function getTeamBySlug(teamSlug)

/**
 * Haal programma op voor de hele club.
 * @returns {{ data: Wedstrijd[] | null, error: Error | null }}
 */
export async function getProgramma()

/**
 * Haal programma op voor een specifiek team.
 * @param {number} teamcode
 * @returns {{ data: Wedstrijd[] | null, error: Error | null }}
 */
export async function getProgrammaByTeam(teamcode)

/**
 * Haal uitslagen op voor de hele club.
 * @returns {{ data: Uitslag[] | null, error: Error | null }}
 */
export async function getUitslagen()

/**
 * Haal uitslagen op voor een specifiek team.
 * @param {number} teamcode
 * @returns {{ data: Uitslag[] | null, error: Error | null }}
 */
export async function getUitslagenByTeam(teamcode)

/**
 * Haal poulestand op.
 * @param {number} poulecode
 * @returns {{ data: StandRij[] | null, error: Error | null }}
 */
export async function getPoulestand(poulecode)

/**
 * Haal afgelastingen op.
 * @returns {{ data: Afgelasting[] | null, error: Error | null }}
 */
export async function getAfgelastingen()

/**
 * Haal staf op voor een team (uit cache).
 * @param {string} teamSlug
 * @returns {{ data: TeamLid[] | null, error: Error | null }}
 */
export async function getStaf(teamSlug)
```

### `src/services/wedstrijdenHelpers.js`

Utility-functies (geen API-calls):

```javascript
/**
 * Bepaal of een wedstrijd thuis is.
 * @param {Wedstrijd} wedstrijd
 * @returns {boolean}
 */
export function isThuis(wedstrijd)

/**
 * Bereken aanwezigheidstijd (45 min voor aanvang).
 * @param {string} wedstrijddatum - ISO 8601
 * @returns {Date}
 */
export function getAanwezigheidstijd(wedstrijddatum)

/**
 * Filter wedstrijden voor huidige speelweek (zo-za).
 * @param {Wedstrijd[]} wedstrijden
 * @returns {Wedstrijd[]}
 */
export function filterHuidigeSpeelweek(wedstrijden)

/**
 * Filter uitslagen voor vorige week.
 * @param {Uitslag[]} uitslagen
 * @returns {Uitslag[]}
 */
export function filterUitslagenVorigeWeek(uitslagen)

/**
 * Groepeer items per dag.
 * @param {Array} items - wedstrijden of uitslagen
 * @param {string} datumVeld - veldnaam voor datum
 * @returns {Map<string, Array>}
 */
export function groepeerPerDag(items, datumVeld = 'wedstrijddatum')

/**
 * Genereer WhatsApp-deellink.
 * @param {Wedstrijd} wedstrijd
 * @returns {string} - whatsapp:// URL
 */
export function getWhatsAppLink(wedstrijd)

/**
 * Bepaal afgelastingen-niveau.
 * @param {Afgelasting[]} afgelastingen
 * @param {Wedstrijd[]} programma
 * @returns {'groen' | 'geel' | 'oranje' | 'rood'}
 */
export function getAfgelastingenNiveau(afgelastingen, programma)

/**
 * Converteer teamnaam naar slug.
 * "VVZ 1" -> "selectie", "VVZ JO19-1" -> "jo19-1"
 * @param {string} teamnaam
 * @returns {string}
 */
export function teamNaamNaarSlug(teamnaam)

/**
 * Converteer slug naar teamnaam.
 * @param {string} slug
 * @returns {string}
 */
export function slugNaarTeamNaam(slug)
```

### Team-slug mapping

De mapping van Sportlink-teamnamen naar slugs moet configureerbaar zijn (bijv. in `src/lib/teamConfig.js`):

```javascript
// Mapping van VVZ-teamnamen naar URL-slugs en weergavenamen
export const TEAM_CONFIG = [
  { slug: 'selectie',    sportlinkNaam: 'VVZ 1',         weergaveNaam: 'Selectie' },
  { slug: 'veteranen',   sportlinkNaam: 'VVZ 2',         weergaveNaam: 'Veteranen' },
  { slug: 'derde',       sportlinkNaam: 'VVZ 3',         weergaveNaam: 'Derde' },
  { slug: 'zesde',       sportlinkNaam: 'VVZ 6',         weergaveNaam: 'Zesde' },
  { slug: '30-vrouwen',  sportlinkNaam: 'VVZ VR30+1',    weergaveNaam: '30+ vrouwen' },
  { slug: '35-mannen',   sportlinkNaam: 'VVZ 35+1',      weergaveNaam: '35+ mannen' },
  { slug: '45-mannen',   sportlinkNaam: 'VVZ 45+1',      weergaveNaam: '45+ mannen' },
  { slug: 'jo19-1',      sportlinkNaam: 'VVZ JO19-1',    weergaveNaam: 'JO19-1' },
  { slug: 'jo17-1',      sportlinkNaam: 'VVZ JO17-1',    weergaveNaam: 'JO17-1' },
  { slug: 'jo15-1',      sportlinkNaam: 'VVZ JO15-1',    weergaveNaam: 'JO15-1' },
  { slug: 'jo14-1',      sportlinkNaam: 'VVZ JO14-1',    weergaveNaam: 'JO14-1' },
  { slug: 'jo13-1',      sportlinkNaam: 'VVZ JO13-1',    weergaveNaam: 'JO13-1' },
  { slug: 'jo12-1',      sportlinkNaam: 'VVZ JO12-1',    weergaveNaam: 'JO12-1' },
  { slug: 'jo11-1',      sportlinkNaam: 'VVZ JO11-1',    weergaveNaam: 'JO11-1' },
  { slug: 'jo10-1',      sportlinkNaam: 'VVZ JO10-1',    weergaveNaam: 'JO10-1' },
  { slug: 'jo9-1',       sportlinkNaam: 'VVZ JO9-1',     weergaveNaam: 'JO9-1' },
  // Meerdere teams per leeftijdscategorie worden dynamisch toegevoegd
];
```

**Open punt**: de exacte teamnamen van VVZ in Sportlink zijn nog onbekend. De mapping moet bijgewerkt worden zodra de VVZ client_id beschikbaar is.

---

## 6. UI/UX Design

### 6.1 Routing

```
/wedstrijden                    -> WedstrijdenProgrammaPage (overzicht huidige week)
/wedstrijden/uitslagen          -> WedstrijdenUitslagenPage
/wedstrijden/:teamSlug          -> TeamPage (bijv. /wedstrijden/selectie)
```

Alle routes zijn publiek (geen `ProtectedRoute`).

### 6.2 Layout & Navigatie

Nieuw: `WedstrijdenLayout.jsx` (vergelijkbaar met `AgendaLayout`/`TrainingschemaLayout`).

**Sub-navigatie tabs**:
- **Programma** (`/wedstrijden`)
- **Uitslagen** (`/wedstrijden/uitslagen`)

De teampagina's zijn bereikbaar via links in het programma/uitslagen, niet via de sub-nav.

**HomePage-integratie**: nieuw kaartje "Wedstrijden" naast Agenda, Trainingsschema, etc. Met het afgelastingen-indicator-component.

### 6.3 Componenten

```
src/
  components/
    WedstrijdenLayout.jsx         # Sub-nav: Programma | Uitslagen
    AfgelastingenIndicator.jsx    # Herbruikbaar lampje (groen/geel/oranje/rood)
    WedstrijdCard.jsx             # Enkele wedstrijd (thuis/uit, tijd, locatie, logo's)
    WedstrijdUitgelicht.jsx       # Eerstvolgende wedstrijd, groter, met WhatsApp-knop
    StandTabel.jsx                # Competitiestand-tabel
    UitslagRij.jsx                # Enkele uitslag-rij
    StafKader.jsx                 # Lijst van stafleden
    TeamTrainingstijden.jsx       # Trainingstijden afgeleid uit training_slots
    AgendaAbonneerKnop.jsx        # iCal/webcal abonneerknop
  pages/
    WedstrijdenProgrammaPage.jsx  # Cluboverzicht huidige speelweek
    WedstrijdenUitslagenPage.jsx  # Uitslagen vorige week
    TeamPage.jsx                  # Teampagina
```

### 6.4 WedstrijdenProgrammaPage

```
+--------------------------------------------------+
| [Sub-nav: Programma | Uitslagen]                  |
| [AfgelastingenIndicator]                          |
+--------------------------------------------------+
| Zaterdag 28 maart                                 |
|   [WedstrijdCard] VVZ JO11-1 - Tegenstander      |
|   [WedstrijdCard] VVZ JO13-2 - Tegenstander      |
| Zondag 29 maart                                   |
|   [WedstrijdCard] VVZ 1 - DVV 1                  |
|   [WedstrijdCard] Tegenstander - VVZ 2            |
+--------------------------------------------------+
```

### 6.5 TeamPage

```
+--------------------------------------------------+
| ← Terug naar programma                           |
| [Teamnaam]  [Klasse/Poule badge]                  |
+--------------------------------------------------+
| EERSTVOLGENDE WEDSTRIJD                           |
| [WedstrijdUitgelicht]                             |
|   Za 29 mrt 14:00 | Aanwezig: 13:15             |
|   VVZ 1 vs DVV 1 (thuis)                         |
|   Sportpark Zonnegloren, Soest                    |
|   [WhatsApp delen] [Agenda toevoegen]             |
+--------------------------------------------------+
| COMPETITIESTAND                                    |
| [StandTabel]                                       |
+--------------------------------------------------+
| PROGRAMMA                                          |
| [WedstrijdCard] ...                               |
| [WedstrijdCard] ...                               |
+--------------------------------------------------+
| UITSLAGEN                                          |
| [UitslagRij] ...                                  |
+--------------------------------------------------+
| TRAININGSTIJDEN                                    |
| [TeamTrainingstijden]                              |
|   Ma 18:00-19:15 Veld 3A                          |
|   Wo 18:00-19:15 Veld 3B                          |
+--------------------------------------------------+
| STAF                                               |
| [StafKader]                                        |
|   Trainer: Jan Jansen                              |
|   Leider: Piet de Vries                            |
+--------------------------------------------------+
| [AgendaAbonneerKnop]                               |
+--------------------------------------------------+
```

### 6.6 AfgelastingenIndicator

Klein component: een gekleurde stip (Tailwind `rounded-full w-3 h-3`) met tooltip/label.

```jsx
// Kleuren via Tailwind
const KLEUREN = {
  groen:  'bg-green-500',
  geel:   'bg-yellow-400',
  oranje: 'bg-orange-500',
  rood:   'bg-red-500',
};
```

Plaatsing:
1. In `Layout.jsx` header, naast de navigatie
2. Op `HomePage.jsx` bij het Wedstrijden-kaartje

### 6.7 WhatsApp deelknop

Voorgeformatteerd bericht:

```
VVZ 1 speelt zondag 29 maart om 14:00 thuis tegen DVV 1.
Aanwezig om 13:15 op Sportpark Zonnegloren.
```

URL: `https://wa.me/?text=<encoded message>`

### 6.8 Agenda-abonneerknop

Twee opties:
- **Webcal** (voor iOS/macOS): `webcal://thewally.github.io/vvz-toolbox/wedstrijden/ical/<teamSlug>.ics`
- **Download .ics**: directe link naar `${import.meta.env.BASE_URL}wedstrijden/ical/<teamSlug>.ics`

---

## 7. Implementatieplan

### Fase 1: Fundament (M)

| # | Taak | Grootte | Afhankelijkheid |
|---|---|---|---|
| 1.1 | Sportlink service layer (`sportlink.js`, `wedstrijden.js`, `wedstrijdenHelpers.js`) | M | - |
| 1.2 | Team-config (`teamConfig.js`) met slug-mapping | S | - |
| 1.3 | Env vars toevoegen (`.env.example`, GitHub Secrets) | S | - |

### Fase 2: Overzichtspagina's (M)

| # | Taak | Grootte | Afhankelijkheid |
|---|---|---|---|
| 2.1 | `WedstrijdenLayout.jsx` met sub-nav | S | - |
| 2.2 | `WedstrijdCard.jsx` component | S | - |
| 2.3 | `WedstrijdenProgrammaPage.jsx` | M | 1.1, 2.1, 2.2 |
| 2.4 | `UitslagRij.jsx` component | S | - |
| 2.5 | `WedstrijdenUitslagenPage.jsx` | M | 1.1, 2.1, 2.4 |
| 2.6 | Routing toevoegen in `App.jsx` | S | 2.1 |
| 2.7 | HomePage kaartje toevoegen | S | 2.6 |

### Fase 3: Teampagina (L)

| # | Taak | Grootte | Afhankelijkheid |
|---|---|---|---|
| 3.1 | `WedstrijdUitgelicht.jsx` | M | 1.1 |
| 3.2 | `StandTabel.jsx` | S | 1.1 |
| 3.3 | `StafKader.jsx` | S | 1.1 |
| 3.4 | `TeamTrainingstijden.jsx` (koppeling met bestaande training_slots) | M | - |
| 3.5 | `AgendaAbonneerKnop.jsx` | S | - |
| 3.6 | `TeamPage.jsx` (samenstelling) | L | 3.1-3.5 |
| 3.7 | WhatsApp deelknop in `WedstrijdUitgelicht` | S | 3.1 |

### Fase 4: Afgelastingen (M)

| # | Taak | Grootte | Afhankelijkheid |
|---|---|---|---|
| 4.1 | `AfgelastingenIndicator.jsx` | M | 1.1 |
| 4.2 | Integratie in `Layout.jsx` header | S | 4.1 |
| 4.3 | Integratie op `HomePage.jsx` | S | 4.1 |

### Fase 5: GitHub Actions (M)

| # | Taak | Grootte | Afhankelijkheid |
|---|---|---|---|
| 5.1 | `scripts/sportlink-cache.js` (teams + staf) | M | 1.2 |
| 5.2 | `scripts/generate-ical.js` (iCal per team) | M | 1.2 |
| 5.3 | `.github/workflows/sportlink-cache.yml` | S | 5.1, 5.2 |
| 5.4 | Service-functies aanpassen om cache te gebruiken | S | 5.1 |

### Risico's

- **VVZ client_id nog niet beschikbaar**: ontwikkeling kan starten met FC Trias data; alleen teamConfig moet later bijgewerkt
- **Sportlink API rate limits**: onbekend; GitHub Actions cache mitigeert dit voor teams/staf
- **Logo-URL's verlopen**: `thuisteamlogo`/`uitteamlogo` bevatten `expires` en `sig` parameters; ze zijn tijdelijk geldig. Overweeg caching of proxy
- **Afgelastingen response shape onbekend**: endpoint retourneerde leeg array; shape moet geverifieerd worden wanneer er daadwerkelijk afgelastingen zijn
- **Teamnamenvariatie**: Sportlink teamnamen bevatten soms suffixen (-1JM, etc.) die niet matchen met de VVZ-conventie; de slug-mapping moet flexibel zijn

---

## 8. Out of Scope

- **Admin/beheer GUI** voor wedstrijddata (alles komt van Sportlink)
- **Supabase opslag** van wedstrijddata
- **Spelersinformatie** (privacy -- meeste spelers zijn "Afgeschermd" in Sportlink)
- **Wedstrijdverslagen** of foto's bij wedstrijden
- **Push-notificaties** bij afgelastingen of uitslagen
- **Historische seizoensdata** (alleen lopende competitie)
- **Wedstrijddetailpagina** (kan later als nice-to-have)
- **Teamfoto-upload** (apart in te richten, eventueel via Supabase Storage)
- **Real-time live scores** (Sportlink biedt dit niet)
