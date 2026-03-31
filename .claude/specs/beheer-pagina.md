# Feature Spec: Centrale Beheer-pagina

## 1. Feature Understanding

De VVZ Toolbox heeft op dit moment drie beheer-omgevingen die verspreid zitten achter hun eigen feature-routes:

| Beheer-onderdeel | Huidige route | Component | Beschermd |
|---|---|---|---|
| Trainingsschema beheer | `/trainingsschema/beheer` | `AdminPage` | Ja (ProtectedRoute) |
| Agenda beheer | `/agenda/beheer` | `AgendaBeheerPage` | Ja (ProtectedRoute) |
| Sponsoring beheer | `/sponsoring/beheer` | `SponsoringBeheerPage` | Ja (ProtectedRoute) |

**Probleem**: een beheerder moet weten dat deze pagina's bestaan en hoe ze te bereiken. Er is geen overzichtspagina, geen gedeelde navigatie tussen beheer-onderdelen, en de "Beheer"-tabs in sub-navigaties (AgendaLayout, TrainingschemaLayout) zijn alleen zichtbaar als de gebruiker al is ingelogd.

**Oplossing**: een centrale `/beheer` landingspagina die als dashboard fungeert met tegels naar alle beheer-onderdelen, plus een directe beheer-knop in de hoofdnavigatie (alleen zichtbaar als ingelogd). Daarnaast wordt agenda-beheer inline in de weergave verwerkt en wordt trainingsschema-invullen ook inline.

### Gebruikers
- **Beheerder** (ingelogd via Supabase Auth): enige gebruiker van deze feature

### Aannames
- Er komen in de toekomst meer beheer-onderdelen bij (dit is de reden om nu een centraal punt te maken)
- Er is geen rolstructuur nodig; elke ingelogde gebruiker is beheerder (tenzij rolbeheer later wordt geimplementeerd conform de rolbeheer-spec)

## 2. Functionele Eisen

### Must-have (MVP)

1. **Beheer-knop in hoofdnavigatie** (TopNav / Layout header):
   - **Desktop**: rechtsboven, links van het hamburgermenu-icoon
   - **Mobiel**: linksboven
   - Link naar `/beheer`
   - **Alleen zichtbaar als ingelogd** — gebruik `useAuth()` hook, check `user` truthy
2. **`/beheer` landingspagina** met tegels/kaarten naar:
   - Agenda (`/agenda` — want beheer zit nu inline in de weergave)
   - Trainingsschema beheren (`/trainingsschema/beheer` — bestaande AdminPage voor schema's, teams & velden)
   - Trainingsrooster invullen (`/trainingsschema` — inline bewerkbaar wanneer ingelogd)
   - Sponsoring beheer (`/sponsoring/beheer` of nieuwe route)
3. **Agenda-beheer inline in de weergave**:
   - De aparte `/agenda/beheer` route verdwijnt (redirect naar `/agenda`)
   - In `AgendaPage` worden toevoegen/wijzigen/verwijder-knoppen getoond als `user` truthy is
   - Niet-ingelogde gebruikers zien de gewone read-only weergave
4. **Trainingsschema twee ingangen**:
   - Bestaande `/trainingsschema/beheer` (AdminPage) blijft: invoeren van schema's, teams & velden
   - `/trainingsschema` (SchedulePage) wordt inline bewerkbaar wanneer ingelogd
   - Beide vindbaar vanuit de beheer-landingspagina als aparte tegels
5. **`BeheerLayout`** component met sub-navigatie bovenaan die links toont naar alle beheer-onderdelen
6. **Alle `/beheer/*` routes beschermd** via `ProtectedRoute`
7. **Redirect naar login** als niet ingelogd, met `state.from` zodat de gebruiker na login terugkeert naar `/beheer`
8. **Uitlog-knop** zichtbaar in de beheer-navigatie
9. **Inloggen/Uitloggen tekst groter** (zie sectie 5 voor details)

### Nice-to-have

- Snelkoppelingen op de landingspagina (bijv. "Laatste activiteit toegevoegd", "Aantal sponsors")
- Zoekveld om snel naar een specifiek beheer-onderdeel te navigeren
- Breadcrumbs in beheer-context

## 3. Routestructuur

### Nieuwe routes

```
/beheer                    -> BeheerDashboardPage (landingspagina met tegels)
/beheer/sponsoring         -> SponsoringBeheerPage (hergebruik bestaande component)
```

### Routes die blijven (ongewijzigd)

```
/trainingsschema/beheer    -> AdminPage (schema's, teams & velden beheren)
/trainingsschema           -> SchedulePage (nu inline bewerkbaar als ingelogd)
/agenda                    -> AgendaPage (nu inline bewerkbaar als ingelogd)
```

### Routes die verdwijnen

```
/agenda/beheer             -> Redirect naar /agenda (beheer zit nu inline)
```

### Migratiestrategie

De bestaande route `/agenda/beheer` wordt een redirect naar `/agenda`:

```jsx
<Route path="agenda/beheer" element={<Navigate to="/agenda" replace />} />
```

De routes `/trainingsschema/beheer` en `/sponsoring/beheer` blijven werken. Optioneel kunnen er redirects naar `/beheer/...` varianten worden toegevoegd, maar dit is niet noodzakelijk voor MVP.

### Route-definitie in App.jsx

```jsx
{/* Beheer landingspagina */}
<Route path="beheer" element={
  <ProtectedRoute>
    <BeheerLayout />
  </ProtectedRoute>
}>
  <Route index element={<BeheerDashboardPage />} />
  <Route path="sponsoring" element={<SponsoringBeheerPage />} />
</Route>

{/* Redirect oude agenda/beheer */}
<Route path="agenda/beheer" element={<Navigate to="/agenda" replace />} />
```

## 4. Nieuwe & Gewijzigde Componenten

### Nieuw: Beheer-knop in TopNav (`src/components/TopNav.jsx`)

De beheer-knop wordt getoond in de header-balk (de `div` met `flex items-center justify-end`), **alleen als `user` truthy is**.

**Desktop** (sm+): rechts, links van de hamburger-knop.
**Mobiel**: links in dezelfde balk (gebruik `justify-between` in plaats van `justify-end` als user ingelogd is).

```jsx
{/* In de Hamburgerbalk div */}
<div className="flex items-center justify-between px-4 py-2">
  {/* Mobiel: Beheer-knop links */}
  {user ? (
    <Link to="/beheer" className="sm:hidden text-white font-medium text-sm">
      Beheer
    </Link>
  ) : <div className="sm:hidden" />}

  <div className="flex items-center gap-3">
    {/* Desktop: Beheer-knop links van hamburger */}
    {user && (
      <Link to="/beheer" className="hidden sm:inline-block text-white font-medium text-sm hover:text-white/80 transition-colors">
        Beheer
      </Link>
    )}
    {!menuOpen && (
      <button onClick={() => setMenuOpen(true)} ...>
        {/* hamburger icon */}
      </button>
    )}
  </div>
</div>
```

### Nieuw: `BeheerLayout.jsx` (`src/components/BeheerLayout.jsx`)

Sub-navigatie met links naar alle beheer-onderdelen + uitlog-knop. Zelfde patroon als `AgendaLayout`.

```
+------------------------------------------------------------------+
|  Dashboard  |  Agenda  |  Trainingsschema  |  Rooster  |  Sponsoring  |  [Uitloggen]  |
+------------------------------------------------------------------+
|                        <Outlet />                                  |
```

- Gebruikt `NavLink` met dezelfde styling als bestaande layouts (`bg-vvz-green/10 text-vvz-green` voor actief)
- Uitlog-knop rechts uitgelijnd, roept `signOut()` aan uit `AuthContext`
- Na uitloggen: redirect naar `/`

Links in de sub-nav:

| Label | Route | Opmerking |
|---|---|---|
| Dashboard | `/beheer` | index, `end` prop |
| Agenda | `/agenda` | Externe link (buiten BeheerLayout) |
| Trainingsschema | `/trainingsschema/beheer` | Bestaande AdminPage |
| Rooster invullen | `/trainingsschema` | Externe link |
| Sponsoring | `/beheer/sponsoring` | Onder BeheerLayout |

### Nieuw: `BeheerDashboardPage.jsx` (`src/pages/BeheerDashboardPage.jsx`)

Landingspagina met tegels. Elke tegel toont:
- Icoon (Tailwind/emoji of SVG)
- Titel
- Korte beschrijving
- Link naar het beheer-onderdeel

Layout: responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`), kaarten met `bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow`.

Tegels:

| Titel | Beschrijving | Route |
|---|---|---|
| Agenda | Activiteiten en evenementen beheren | `/agenda` |
| Trainingsschema | Schema's, teams en velden beheren | `/trainingsschema/beheer` |
| Trainingsrooster | Trainingen invullen in het rooster | `/trainingsschema` |
| Sponsoring | Sponsors en pakketten beheren | `/beheer/sponsoring` |

### Gewijzigd: `SponsorsPage.jsx` — "Beheer" knop verwijderen

De publieke sponsoring-weergave (`SponsorsPage.jsx`) toont momenteel een "Beheer"-link rechtsboven (regels 38-42) als de gebruiker ingelogd is. Deze link vervalt; de ingang naar sponsoring-beheer loopt voortaan uitsluitend via de Algemene Beheerpagina (`/beheer`).

**Te verwijderen uit `SponsorsPage.jsx`:**

```jsx
// Verwijder dit blok (regels 38-42):
{user && (
  <Link to="/sponsoring/beheer" className="text-sm text-gray-400 hover:text-vvz-green transition-colors">
    Beheer
  </Link>
)}
```

Na verwijdering kan ook de `useAuth` import en `const { user } = useAuth()` weg als er geen andere auth-afhankelijke logica in de component overblijft. De `Link` import van react-router-dom blijft nodig voor de sponsor-detail links.

De `<div className="flex items-center justify-between mb-10">` kan vereenvoudigd worden naar alleen de heading zonder `justify-between`.

### Gewijzigd: `AgendaPage.jsx` — inline beheer

De bestaande `AgendaPage` wordt uitgebreid met inline bewerkingsmogelijkheden. De logica uit `AgendaBeheerPage` wordt verwerkt (of hergebruikt als gedeelde componenten).

**Aanpak:**

1. Importeer `useAuth` uit `AuthContext`
2. Destructureer `{ user }` uit `useAuth()`
3. Conditioneel tonen van bewerkingsknoppen:

```jsx
// Bovenaan de pagina, als user ingelogd:
{user && (
  <div className="flex justify-end mb-3">
    <button onClick={startAdd} className="...">
      + Activiteit toevoegen
    </button>
  </div>
)}

// Per ActivityCard, als user ingelogd:
{user && (
  <div className="flex gap-1 mt-2">
    <button onClick={() => startEdit(activity)} title="Bewerken">
      {/* pencil icon */}
    </button>
    <button onClick={() => confirmDelete(activity)} title="Verwijderen">
      {/* trash icon */}
    </button>
  </div>
)}
```

4. Het toevoegen/bewerken-formulier (nu in `AgendaBeheerPage`) wordt als een modal of uitklapbaar panel boven de lijst getoond
5. Alle CRUD-functies (`createActivities`, `updateActivity`, `deleteActivity`, `deleteActivityGroup`) worden geimporteerd uit `src/services/activities.js`
6. Na een mutatie: `loadActivities()` opnieuw aanroepen om de lijst te verversen

**Aandachtspunten:**
- De formulier-logica en state (form, editingId, editingGroupId, deleteConfirm) kan naar een custom hook of naar de component zelf
- Het formulier verschijnt als een uitklapbaar panel bovenaan de lijst (zelfde patroon als nu in AgendaBeheerPage)
- Verwijder-bevestiging kan inline onder de kaart of als een klein popup-panel

### Gewijzigd: `AgendaLayout.jsx`

De "Beheer" tab verdwijnt uit de sub-navigatie. Er is geen aparte beheer-pagina meer voor agenda. De sub-nav toont alleen "Agenda".

```jsx
export default function AgendaLayout() {
  return (
    <div>
      <nav className="bg-white border-b border-gray-200 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 h-10">
          <NavLink to="/agenda" end className={...}>
            Agenda
          </NavLink>
        </div>
      </nav>
      <Outlet />
    </div>
  )
}
```

Opmerking: de `AgendaLayout` kan ook helemaal verwijderd worden als er maar een tab overblijft. De route kan dan rechtstreeks `AgendaPage` renderen. Dit is een implementatie-keuze.

### Gewijzigd: `SchedulePage.jsx` — inline bewerkbaar

Het bestaande trainingsrooster (`/trainingsschema`) wordt inline bewerkbaar als de gebruiker ingelogd is:

1. Importeer `useAuth`, check `user`
2. Als ingelogd: klikken op een slot opent een bewerkingsinterface (bijv. een dropdown om een team te selecteren, of drag-and-drop)
3. Als niet ingelogd: het rooster is read-only (huidige gedrag)

De exacte UX voor inline slot-bewerking wordt in een aparte spec uitgewerkt indien nodig. Voor de beheer-pagina MVP is het voldoende dat de tegel op het dashboard linkt naar `/trainingsschema` met een notitie dat het rooster inline bewerkbaar is als ingelogd.

### Gewijzigd: `LoginPage.jsx`

De default redirect na login wordt `/beheer` in plaats van `/`:

```jsx
const from = location.state?.from?.pathname ?? '/beheer'
```

## 5. Inloggen/Uitloggen tekst groter

De inloggen/uitloggen links in TopNav zijn nu `text-sm` (klein, laag contrast `text-white/50`). Dit moet groter en beter zichtbaar.

### Wijzigingen in `TopNav.jsx`:

**Desktop** (in het volledige menu, kolom 1 onderaan):
- Verander van `text-sm text-white/50` naar `text-lg text-white/70` voor zowel de "Inloggen" link als de "Uitloggen" button

```jsx
{/* Desktop: lijn 101-115 */}
<div className="hidden sm:block mt-6 pt-4 border-t border-white/20">
  {user ? (
    <button onClick={signOut} className="text-lg text-white/70 hover:text-white transition-colors">
      Uitloggen
    </button>
  ) : (
    <Link to="/login" ... className="text-lg text-white/70 hover:text-white transition-colors">
      Inloggen
    </Link>
  )}
</div>
```

**Mobiel** (onderaan het volledige menu, lijn 170-184):
- Verander van `text-sm text-white/50` naar `text-lg text-white/70`

```jsx
{/* Mobiel */}
<div className="sm:hidden px-6 pb-3 flex justify-end shrink-0">
  {user ? (
    <button onClick={signOut} className="text-lg text-white/70 hover:text-white transition-colors">
      Uitloggen
    </button>
  ) : (
    <Link to="/login" ... className="text-lg text-white/70 hover:text-white transition-colors">
      Inloggen
    </Link>
  )}
</div>
```

## 6. Navigatie-integratie

### Ingang naar beheer

Drie manieren om bij `/beheer` te komen:

1. **Via de beheer-knop in de header** (nieuw): altijd zichtbaar als ingelogd, desktop rechtsboven naast hamburger, mobiel linksboven
2. **Via `/login`**: na succesvolle login, redirect naar `/beheer` (default `from` is nu `/beheer`)
3. **Via directe URL**: `/beheer` in de browser

### Geen publieke navigatie-entry

`/beheer` wordt **niet** opgenomen in `navigation.js` (`NAV_SECTIONS` of `QUICK_LINKS`). Het is bereikbaar via de beheer-knop (als ingelogd), via `/login`, of via directe URL.

## 7. Geen database-wijzigingen

Deze feature vereist geen nieuwe Supabase-tabellen, RLS-policies of service-functies. Het is puur een frontend-reorganisatie van bestaande beheer-functionaliteit.

## 8. Implementatieplan

| # | Taak | Complexiteit | Afhankelijkheid |
|---|---|---|---|
| 1 | Beheer-knop toevoegen aan `TopNav.jsx` (desktop rechts, mobiel links, auth-check) | S | - |
| 2 | Inloggen/Uitloggen tekst groter maken in `TopNav.jsx` | S | - |
| 3 | Maak `BeheerLayout.jsx` met sub-nav en uitlog-knop | S | - |
| 4 | Maak `BeheerDashboardPage.jsx` met tegels (4 tegels: Agenda, Trainingsschema, Rooster, Sponsoring) | S | - |
| 5 | Voeg `/beheer` routes toe aan `App.jsx` met `ProtectedRoute` wrapper | S | 3, 4 |
| 6 | Update `LoginPage` default redirect naar `/beheer` | S | 5 |
| 7 | Verwerk agenda-beheer inline in `AgendaPage`: auth-check, CRUD-knoppen, formulier, verwijder-bevestiging | L | - |
| 8 | Verwijder `/agenda/beheer` route, voeg redirect toe naar `/agenda` | S | 7 |
| 9 | Update `AgendaLayout` — verwijder "Beheer" tab (of verwijder AgendaLayout geheel) | S | 8 |
| 10 | Maak trainingsrooster inline bewerkbaar in `SchedulePage` (als ingelogd) | L | - |
| 11 | Verwijder "Beheer"-knop uit `SponsorsPage.jsx` (auth-import en user-check kunnen ook weg) | S | - |
| 12 | Test: beheer-knop zichtbaarheid, login flow, inline agenda-beheer, tegels dashboard | M | alle |

## 9. Out of Scope

- Rolgebaseerde toegangscontrole (zie aparte spec `rolbeheer.md`)
- Nieuwe beheer-functionaliteit (bijv. nieuws-beheer, team-beheer)
- Dashboard-statistieken of activiteitslog
- Wijzigingen aan de publieke navigatie (`navigation.js`)
- Gedetailleerd UX-ontwerp voor inline trainingsrooster-bewerking (aparte spec indien nodig)
- `AgendaBeheerPage` volledig verwijderen (kan na succesvolle migratie naar inline, als cleanup-taak)
