# Feature Spec: TV-scherm Presentatie (`/tv`)

## 1. Feature Begrijp

Een volledig schermvullende slideshow-pagina voor een TV in het clubhuis of kantine van VVZ'49. De pagina staat los van de rest van de toolbox (geen header/footer/navigatie) en is publiek toegankelijk op `/tv`. Elke dia wordt een configureerbaar aantal seconden (standaard 10) getoond, waarna automatisch de volgende dia verschijnt.

Het VVZ'49-logo is altijd zichtbaar. Een klok rechtsbovenin houdt de huidige tijd bij.

De inhoud past zich automatisch aan het moment aan: op een wedstrijddag (zaterdag of zondag) worden wedstrijdgerelateerde dia's getoond; op andere dagen het weekprogramma.

---

## 2. Functionele Eisen

### MVP (must-have)

| # | Eis |
|---|-----|
| 1 | Slideshow op `/tv`, volledig scherm, zonder toolbox-navigatie |
| 2 | Dia-interval configureerbaar via URL-parameter `?interval=10` (seconden) |
| 3 | VVZ'49-logo altijd zichtbaar (linksonder of linksboven) |
| 4 | Huidige tijd zichtbaar (rechtsbovenin) |
| 5 | Progressbalk toont resterende tijd voor huidige dia |
| 6 | Automatische refresh van data elke 5 minuten |
| 7 | Dia: **Nieuws** — laatste 3 gepubliceerde nieuwsberichten |
| 8 | Dia: **Activiteiten** — komende activiteiten (max 10, op basis van `sort_date >= vandaag`) |
| 9 | Weekendag: Dia **Huidige wedstrijden** — wedstrijden die nu gespeeld worden (aanvangstijd ≤ now ≤ aanvangstijd + 90 min), alleen als er ≥1 actieve wedstrijd is |
| 10 | Weekendag: Dia **Standen** — poulestand voor teams die vandaag spelen, alleen als data beschikbaar |
| 11 | Weekendag: Dia **Uitslagen van vandaag** — huidig-dag wedstrijden met een uitslag, alleen als er ≥1 uitslag is |
| 12 | Weekendag: Dia **Nog te spelen** — huidig-dag wedstrijden zonder uitslag en nog niet aangevangen, alleen als er ≥1 is |
| 13 | Niet-weekendag: Dia **Programma deze week** — alle VVZ-wedstrijden van vandaag t/m komende zaterdag |
| 14 | Lege dia's (geen data) worden automatisch overgeslagen |

### Nice-to-have

- Handmatig navigeren met pijltoetsen (links/rechts)
- Teamnummer of -logo naast teamnaam op wedstrijddia's
- Fade-transitie tussen dia's
- Ondertiteling op nieuwskaart (eerste alinea als samenvatting)

---

## 3. Data Model

Er zijn **geen nieuwe tabellen** nodig. De pagina gebruikt uitsluitend bestaande data:

### 3.1 Nieuws — Supabase `news_items`

| Kolom | Type | Gebruik |
|-------|------|---------|
| `id` | UUID | key |
| `title` | TEXT | Koptekst op dia |
| `content` | TEXT | Eerste ~200 chars als samenvatting |
| `image_url` | TEXT | Optionele afbeelding |
| `published_at` | TIMESTAMPTZ | Sortering |

Query: `fetchPublicNewsItems(3)` — bestaande functie in `src/services/news.js`.

### 3.2 Activiteiten — Supabase `activities`

| Kolom | Type | Gebruik |
|-------|------|---------|
| `title` | TEXT | Naam van activiteit |
| `sort_date` | DATE | Filter (`>= today`) en sortering |
| `time_start` | TIME | Optionele starttijd |
| `date` / `date_start` / `date_end` / `dates_item` | DATE | Datumweergave |

Query: `fetchActivities({ hidePast: true })`, dan `.slice(0, 10)`.

### 3.3 Wedstrijden — Sportlink API

Via bestaande functies in `src/services/wedstrijden.js` + `src/services/sportlink.js`:

| Functie | Gebruik |
|---------|---------|
| `getProgramma()` | Komende wedstrijden (voor "Programma week" en "Nog te spelen") |
| `getUitslagen()` | Gespeelde wedstrijden (voor "Uitslagen van vandaag") |
| `getTeams()` | Teamcode-lookup voor standen |
| `getPoulestand(poulecode)` | Poulestand per team |
| `getTeamProgramma(teamcode)` | Poule-selectie bij meerdere poules per team |

Relevante velden per wedstrijd:

| Veld | Voorbeeld | Gebruik |
|------|-----------|---------|
| `wedstrijddatum` | `"2026-05-17T14:00:00+0200"` | Datum-filter |
| `aanvangstijd` | `"14:00"` | Tijdweergave + "huidig spelend"-logica |
| `thuisteam` / `uitteam` | `"VVZ '49 1"` | Teamnamen |
| `thuisteamclubrelatiecode` | gelijk aan `VITE_SPORTLINK_CLUB_RELATIECODE` | Filter VVZ-wedstrijden |
| `uitteamclubrelatiecode` | idem | Filter VVZ-wedstrijden |
| `uitslag` | `"2-1"` of `null` | Uitslag-check |

---

## 4. Service Layer

Geen nieuwe service-functies nodig. Alle benodigde functies bestaan al. De pagina roept deze direct aan.

**Data refresh patroon** (in `TvSchermPage`):
```js
async function laadAlleData() {
  const [nieuwsRes, activiteitenRes, programmaRes, uitslagenRes, teamsRes] = await Promise.all([
    fetchPublicNewsItems(3),
    fetchActivities({ hidePast: true }),
    getProgramma(),
    getUitslagen(),
    getTeams(),
  ])
  // ... verwerk en sla op in state
  // Standen worden asynchroon geladen (zie §4.1)
}
```

### 4.1 Standen laden (wedstrijddag)

Algoritme (gebaseerd op `WedstrijdenStandenPage`):

1. Filter programma op vandaag + VVZ-wedstrijden → lijst van VVZ-teamnamen
2. Zoek teamcode per naam in teams-lijst
3. Groepeer teams per teamcode → Map<teamcode, poules[]>
4. Als team meerdere poules heeft: `getTeamProgramma(teamcode)` → `kiesPouleViaWedstrijd()`
5. Unieke poulecodes → `Promise.all(poulecodes.map(pc => getPoulestand(pc)))`
6. Sla op als `standenMap: { [poulecode]: stand[] }`

---

## 5. UI/UX Ontwerp

### 5.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│ [LOGO]          DIA-TITEL (groot, gecentreerd)  [14:35] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              D I A   I N H O U D                        │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ ●●○○○○  [progressbalk ════════════════░░░░░░░░░]        │
└─────────────────────────────────────────────────────────┘
```

- **Achtergrond**: `bg-gray-950` (bijna zwart)
- **Tekst**: `text-white`
- **Accentkleur**: VVZ-groen (`text-vvz-green`, `bg-vvz-green`)
- **Lettergrootte**: groot voor TV-afstand (`text-3xl`–`text-5xl` voor titels, `text-xl`–`text-2xl` voor content)
- **Padding**: ruim (`p-8`–`p-12`)

### 5.2 Header (altijd zichtbaar)

```jsx
<header className="flex items-center justify-between px-10 py-6">
  <img src={`${import.meta.env.BASE_URL}logo-vvz.png`} alt="VVZ'49" className="h-16" />
  <h1 className="text-4xl font-bold text-white">{slide.title}</h1>
  <div className="text-3xl font-mono text-gray-300">{tijd}</div>
</header>
```

### 5.3 Dia: Nieuws

3 nieuwskaarten naast elkaar (`grid grid-cols-3 gap-8`):

```
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ [afbeelding]   │  │ [afbeelding]   │  │ [afbeelding]   │
│ Titel          │  │ Titel          │  │ Titel          │
│ datum          │  │ datum          │  │ datum          │
│ samenvatting…  │  │ samenvatting…  │  │ samenvatting…  │
└────────────────┘  └────────────────┘  └────────────────┘
```

Samenvatting = HTML-tags gestript, eerste 150 tekens.

### 5.4 Dia: Activiteiten

Lijst van max 10 activiteiten, 2 kolommen:

```
datum    Naam van activiteit      tijd (optioneel)
datum    Naam van activiteit
...
```

Datum-opmaak:
- `date`: "za 17 mei"
- `date_start`/`date_end`: "17–21 mei"
- `dates_item`: "za 17 mei"

### 5.5 Dia: Huidige wedstrijden

Kaarten per wedstrijd (`grid grid-cols-2`):

```
┌────────────────────────────┐
│  VVZ '49 1   •   Thuis     │
│  14:00                     │
│  vs Sparta Nijkerk 2       │
│  🟢 Bezig                  │
└────────────────────────────┘
```

Groen pulserende indicator voor "bezig"-status.

### 5.6 Dia: Standen

Per team één tabel met poulestand. Als meerdere teams spelen: tonen in grid. Huidige VVZ-teamrij highlighted met `bg-vvz-green/20`.

Kolommen: `#` | Team | G | W | G | V | Pnt

### 5.7 Dia: Uitslagen van vandaag

Lijst met wedstrijden die uitslag hebben. Per rij:

```
VVZ '49 1   2 – 1   Sparta Nijkerk 2   (14:00)
```

VVZ-score **vet**, winstkleur groen / verlieskleur rood / gelijk grijs.

### 5.8 Dia: Nog te spelen

Zelfde opmaak als programma, maar alleen voor wedstrijden van vandaag die nog beginnen:

```
15:00   VVZ '49 2   thuis   Ajax Barendrecht 3
16:00   VVZ JO17-1  uit     FC Soest 1
```

### 5.9 Dia: Programma deze week

Groepering per dag (op volgorde):

```
Zaterdag 17 mei
  14:00   VVZ '49 1    –   Sparta Nijkerk 2
  14:00   VVZ '49 2    –   Ajax Barendrecht 3
```

T/m komende zaterdag. Maximaal ~20 wedstrijden per dia (anders pagineren — nice-to-have).

### 5.10 Progressbalk & Dia-indicators

- **Progressbalk**: dunne lijn (`h-1`) onderaan, `bg-vvz-green`, breedte groeit van 0% naar 100% over het interval
- **Dia-dots**: ronde bolletjes, huidige dia gevuld groen, rest leeg

---

## 6. Implementatieplan

| # | Taak | Complexiteit |
|---|------|-------------|
| 1 | `src/pages/TvSchermPage.jsx` aanmaken — basis layout, klok, logo, rotatie-logica | M |
| 2 | Data-laad-functie met `Promise.all` voor nieuws, activiteiten, programma, uitslagen, teams | S |
| 3 | Helper-functies: `isWeekendDag()`, `getTodaySleutel()`, `isHuidigSpelend(w)`, `isVvzWedstrijd(w)` | S |
| 4 | Slide-berekening (`useMemo`): welke dia's tonen op basis van dag + beschikbare data | M |
| 5 | Slide-component: **Nieuws** | S |
| 6 | Slide-component: **Activiteiten** | S |
| 7 | Slide-component: **Huidige wedstrijden** | S |
| 8 | Slide-component: **Uitslagen van vandaag** | S |
| 9 | Slide-component: **Nog te spelen** | S |
| 10 | Slide-component: **Programma deze week** | S |
| 11 | Standen laden (async, na wedstrijddatum-filter + teamcode-lookup) | L |
| 12 | Slide-component: **Standen** | M |
| 13 | Progressbalk + dia-dots animatie | S |
| 14 | Route toevoegen in `App.jsx` **buiten** `<Layout>` wrapper | S |
| 15 | Auto-refresh elke 5 minuten | S |

**Totaal**: ~3 dagen werk (M: 1 dag, 9×S: 0,5 dag × 9 = 4,5 dag, L: 1 dag → afgerond ~3 dagen)

---

## 7. Routing

Route moet **buiten** de `<Route element={<Layout />}>` wrapper in `App.jsx`, vóór de Layout-route:

```jsx
<Routes>
  <Route path="tv" element={<TvSchermPage />} />
  <Route element={<Layout />}>
    {/* alle bestaande routes */}
  </Route>
</Routes>
```

Geen `ProtectedRoute` nodig — volledig publiek.

---

## 8. Technische Randvoorwaarden

- Geen login vereist
- Asset-paden via `import.meta.env.BASE_URL` (`logo-vvz.png`)
- `import.meta.env.VITE_SPORTLINK_CLUB_RELATIECODE` voor VVZ-filter
- BrowserRouter met `basename="/vvz-toolbox"` — route wordt `/vvz-toolbox/tv`
- Tailwind CSS only — geen CSS Modules
- `useSearchParams` voor `?interval=N`

---

## 9. Out of Scope

- Admin-interface voor configuratie van de TV-pagina
- Authenticatie of beveiligde modus
- Meerdere TV-profielen of thema's
- Geluid of video
- Sponsorbanner rotatie
- Trainingsschema op de TV
- Toernooi-uitslagen (aparte module, niet gekoppeld)
- Paginering van standen (alleen eerste ~10 rijen per poule)
