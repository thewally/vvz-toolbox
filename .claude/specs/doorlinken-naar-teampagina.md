# Feature Spec: Doorlinken naar Teampagina vanuit Programma & Uitslagen

## Samenvatting

Wedstrijd-cards op de pagina's Programma (`/wedstrijden/programma`) en Uitslagen (`/wedstrijden/uitslagen`) worden klikbaar. Een klik navigeert naar de teampagina (`/teams/:teamcode`) van het "groene" VVZ-team in die wedstrijd.

---

## 1. Functionele Eisen

### Must-have (MVP)

- **Klikbare wedstrijd-cards**: De volledige card (zowel mobiel als desktop layout) is een klikbaar element dat navigeert naar de relevante teampagina.
- **Groene team bepaling**: Het team dat groen gekleurd is in de card is het team waarnaar genavigeerd wordt. Dit is het VVZ-team in de wedstrijd.
- **Thuis-regel bij twee VVZ-teams**: Als zowel thuisteam als uitteam van VVZ'49 zijn (bijv. VVZ'49 1 vs VVZ'49 2), navigeer naar de teampagina van het **thuisteam**.
- **Werkt op beide pagina's**: Programma en Uitslagen gebruiken dezelfde logica.
- **Visuele hint**: `cursor-pointer` en subtiele hover-state zodat de gebruiker ziet dat de card klikbaar is.

### Nice-to-have

- Chevron-icoon (>) rechts in de card als extra visuele hint.

### Niet klikbaar

- Als er om wat voor reden dan ook geen teamcode gevonden kan worden voor het VVZ-team, blijft de card niet-klikbaar (`cursor-default`, geen link). Dit is een graceful degradation.

---

## 2. Het "Groene Team" Bepalen

### Huidige situatie

De Sportlink API `/programma` en `/uitslagen` endpoints retourneren wedstrijd-objecten met onder andere:
- `thuisteam` (string, bijv. "VVZ'49 1")
- `uitteam` (string, bijv. "FC Soest 3")
- `thuisteamclubrelatiecode` (string, bijv. "BJQS53Z")
- `uitteamclubrelatiecode` (string)

De code vergelijkt `thuisteamclubrelatiecode` met `VITE_SPORTLINK_CLUB_RELATIECODE` om te bepalen of het thuisteam van VVZ is (`isThuis`). Het "groene team" is het team waarvan de clubrelatiecode overeenkomt met VVZ.

### Probleem

Wedstrijd-objecten bevatten **geen `teamcode`**. De `teamcode` is nodig voor de URL `/teams/:teamcode`. De `teamcode` is alleen beschikbaar via het `/teams` endpoint.

### Oplossing: Team-lookup via `/teams` endpoint

1. Laad de teams-lijst eenmalig (via `getTeams()`) wanneer de Programma- of Uitslagenpagina mount.
2. Bouw een lookup-map: `teamnaam -> teamcode` (key = genormaliseerde teamnaam).
3. Voor elke wedstrijd-card: bepaal welk team het "groene" VVZ-team is, zoek de `teamcode` op in de lookup-map.

### Matching-logica

De `thuisteam`/`uitteam` strings uit de wedstrijd-API en de `teamnaam` uit de teams-API komen van dezelfde Sportlink-bron en zijn identiek. Een directe string-match volstaat:

```js
// Bouw lookup eenmalig
const teamcodeByNaam = new Map()
for (const t of teams) {
  teamcodeByNaam.set(t.teamnaam, t.teamcode)
}

// Per wedstrijd
function getVvzTeamcode(w, teamcodeByNaam) {
  const isThuis = w.thuisteamclubrelatiecode === CLUB_RELATIECODE
  const isUit = w.uitteamclubrelatiecode === CLUB_RELATIECODE

  if (isThuis && isUit) {
    // Twee VVZ-teams: navigeer naar thuisteam
    return teamcodeByNaam.get(w.thuisteam) ?? null
  }
  if (isThuis) return teamcodeByNaam.get(w.thuisteam) ?? null
  if (isUit) return teamcodeByNaam.get(w.uitteam) ?? null
  return null // zou niet moeten voorkomen (eigenwedstrijden=JA)
}
```

**Let op**: Een team kan in meerdere competities voorkomen (regulier + beker). De `/teams` endpoint retourneert dan meerdere entries met dezelfde `teamnaam` maar dezelfde `teamcode`. De `Map` overschrijft duplicaten automatisch met dezelfde waarde, dus dit is geen probleem.

---

## 3. URL-structuur

De teampagina verwacht de route `/teams/:teamcode` (bijv. `/teams/223456`). De `teamcode` is een numerieke string afkomstig van Sportlink. Er hoeft geen slug of menselijk-leesbare URL te worden gegenereerd.

---

## 4. Edge Cases

| Scenario | Gedrag |
|---|---|
| Normaal: 1 VVZ-team | Navigeer naar teampagina van dat team |
| Twee VVZ-teams tegen elkaar | Navigeer naar teampagina van het **thuisteam** |
| Geen teamcode match gevonden | Card is niet klikbaar (geen link, `cursor-default`) |
| Teams-API faalt | Cards blijven niet klikbaar (graceful degradation, geen error getoond) |
| Teams-API laadt langzaam | Cards renderen eerst als niet-klikbaar, worden klikbaar zodra teams geladen zijn |

---

## 5. UI Aanpassingen

### Wijzigingen aan de card

De bestaande `<div>` wrapper van elke wedstrijd-card wordt conditioneel een `<Link>` (van React Router):

```jsx
const Wrapper = teamcode
  ? ({ children, className }) => (
      <Link to={`/teams/${teamcode}`} className={className}>
        {children}
      </Link>
    )
  : ({ children, className }) => (
      <div className={className}>{children}</div>
    )
```

### Styling

- **Klikbaar**: Voeg `cursor-pointer` toe (vervangt bestaand `cursor-default`). De bestaande `hover:shadow-md transition-shadow` blijft behouden.
- **Niet klikbaar**: Behoudt `cursor-default`.
- **Geen layout-breuk**: De `<Link>` krijgt `block` display en dezelfde classes als de huidige `<div>`. Geen extra padding/margin.
- **Geen underline**: Links krijgen `no-underline` (Tailwind default voor `<Link>`).

### Geen navigatie-breuk

De card-inhoud blijft identiek. Er worden geen extra elementen toegevoegd (geen chevron in MVP). De enige visuele verandering is de cursor.

---

## 6. Implementatieplan

### Stap 1: Helper-functie voor team-lookup (S)

Maak een helper in `src/services/wedstrijdenHelpers.js`:

```js
/**
 * Bouw een Map van teamnaam -> teamcode vanuit de teams-lijst.
 */
export function buildTeamcodeLookup(teams) {
  const map = new Map()
  for (const t of teams) {
    if (t.teamnaam && t.teamcode) {
      map.set(t.teamnaam, t.teamcode)
    }
  }
  return map
}

/**
 * Geeft de teamcode terug van het VVZ-team in een wedstrijd, of null.
 * Bij twee VVZ-teams: thuisteam wint.
 */
export function getVvzTeamcode(wedstrijd, teamcodeLookup) {
  const CLUB = import.meta.env.VITE_SPORTLINK_CLUB_RELATIECODE
  const isThuis = wedstrijd.thuisteamclubrelatiecode === CLUB
  const isUit = wedstrijd.uitteamclubrelatiecode === CLUB

  if (isThuis) return teamcodeLookup.get(wedstrijd.thuisteam) ?? null
  if (isUit) return teamcodeLookup.get(wedstrijd.uitteam) ?? null
  return null
}
```

### Stap 2: Teams laden in Programma- en Uitslagenpagina (S)

Voeg een extra `getTeams()` call toe aan de `load()` functie van beide pagina's. Sla het resultaat op in state. Bouw de lookup-map met `useMemo`.

```js
const [teams, setTeams] = useState([])

async function load() {
  // ... bestaande loading logica ...
  const teamsRes = await getTeams()
  if (teamsRes.data) setTeams(teamsRes.data)
}

const teamcodeLookup = useMemo(() => buildTeamcodeLookup(teams), [teams])
```

**Opmerking**: De teams-call kan parallel lopen met de programma/uitslagen-call via `Promise.all` voor betere performance.

### Stap 3: Card klikbaar maken in WedstrijdenProgrammaPage (M)

1. Import `Link` van `react-router-dom`.
2. Import `buildTeamcodeLookup`, `getVvzTeamcode` van helpers.
3. In de render-loop: bepaal `teamcode` per wedstrijd.
4. Vervang de card `<div>` door een `<Link>` als teamcode beschikbaar is.
5. Pas cursor-class aan: `cursor-pointer` als klikbaar, `cursor-default` als niet.

### Stap 4: Hetzelfde voor WedstrijdenUitslagenPage (M)

Identieke aanpak als stap 3.

### Stap 5: Extractie van WedstrijdCard component (optioneel, M)

De card-rendering in Programma en Uitslagen is nu grotendeels gedupliceerd. Overweeg een gedeeld `<WedstrijdCard>` component te extraheren dat:
- De wedstrijd-data ontvangt als prop
- De teamcode-lookup ontvangt als prop
- De variant (programma vs. uitslag) als prop bepaalt of scores getoond worden
- De Link/div wrapper intern afhandelt

Dit is optioneel maar vermindert duplicatie.

---

## 7. Data Model

Geen database-wijzigingen nodig. Alle data komt van de Sportlink API.

---

## 8. Geen Nieuwe Routes

Er worden geen nieuwe routes toegevoegd. De feature gebruikt bestaande routes (`/teams/:teamcode`).

---

## 9. Out of Scope

- Klikbare cards op de TeamPage zelf (die toont al team-specifieke wedstrijden)
- Klikbare cards op de Afgelastingen-pagina
- Extractie van een gedeeld WedstrijdCard component (nice-to-have, niet vereist voor MVP)
- Deep-linking naar een specifieke wedstrijd (er is geen wedstrijd-detail-pagina)
- Chevron of pijl-icoon in de card
