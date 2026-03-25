# Technische documentatie VVZ'49 Toolbox

Deze documentatie beschrijft de technische architectuur van de VVZ'49 Toolbox voor ontwikkelaars en technisch beheerders.

---

## Projectstructuur

```
vvz-toolbox/
  public/
    logo-vvz.png                        # VVZ'49 logo
    plattegrond/
      plattegrond.svg                   # Volledige plattegrond
      plattegrond-trainingschema.svg    # Vereenvoudigde veldindeling
      plattegrond-a4.pdf
      plattegrond-a3.pdf
      plattegrond.eps
    huistijl/
      logo-vvz.png
      logo-vvz.ai
  src/
    components/
      Layout.jsx                        # Globale header + footer
      AgendaLayout.jsx                  # Sub-nav Agenda | Beheer
      TrainingschemaLayout.jsx          # Sub-nav Schema | Veldindeling | Beheer
      ProtectedRoute.jsx
    pages/
      HomePage.jsx
      AgendaPage.jsx                    # Publieke agendaweergave
      AgendaBeheerPage.jsx              # Admin: activiteiten beheren
      SchedulePage.jsx                  # Publiek trainingsschema
      VeldindelingPage.jsx              # Veldindeling SVG
      AdminPage.jsx                     # Admin: tijdslots, teams, velden
      PlattegrondPage.jsx
      HuistijlPage.jsx
      LoginPage.jsx
    services/
      activities.js                     # Agenda CRUD
      trainingSlots.js                  # Trainingsschema CRUD
      fields.js                         # Velden CRUD
      teams.js                          # Teams CRUD
    lib/
      supabaseClient.js                 # Supabase client initialisatie
      constants.js
    context/
      AuthContext.jsx                   # Globale auth state
  .github/workflows/
    deploy.yml                          # GitHub Actions deployment
  vite.config.js
```

---

## Tech Stack

| Onderdeel | Technologie |
|---|---|
| Frontend framework | React 18 |
| Build tool | Vite |
| Routing | React Router v6 (HashRouter) |
| Styling | Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Deployment | GitHub Pages via GitHub Actions |

**Belangrijk:** de app gebruikt `HashRouter` (URL's met `#`), omdat GitHub Pages geen server-side routing ondersteunt.

---

## Omgevingsvariabelen

| Variabele | Omschrijving |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (bijv. `https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous (publieke) key |

Lokaal: sla op in `.env` in de projectroot. In productie: GitHub Secrets.

> **Let op:** `VITE_*` variabelen worden gebundeld in de frontend-JavaScript en zijn zichtbaar voor iedereen. Gebruik uitsluitend de anon key — nooit de service role key.

---

## Authenticatie

De admin-omgeving gebruikt **Supabase Auth** met e-mail/wachtwoord-login. Er is geen zelfregistratie — accounts worden aangemaakt via het Supabase dashboard.

### Beheerders toevoegen

1. Ga naar het [Supabase dashboard](https://supabase.com/dashboard) en open je project
2. Navigeer naar **Authentication → Users**
3. Klik op **Add user → Create new user**
4. Vul e-mailadres en wachtwoord in

De auth-state wordt globaal beheerd via `src/context/AuthContext.jsx`. Beveiligde routes zijn gewikkeld in `ProtectedRoute`.

---

## Database

### Tabel: `activities` (Agenda)

| Kolom | Type | Omschrijving |
|---|---|---|
| `id` | uuid | Primaire sleutel |
| `title` | text | Naam van de activiteit |
| `description` | text | Korte omschrijving |
| `date` | date | Datum (enkele datum) |
| `date_start` | date | Begindatum (datumbereik) |
| `date_end` | date | Einddatum (datumbereik) |
| `dates_item` | date | Individuele datum (datumlijst) |
| `group_id` | uuid | Groeps-ID voor datumlijst-items |
| `time_start` | time | Starttijd |
| `time_end` | time | Eindtijd |
| `url` | text | Optionele link |
| `sort_date` | date | Sorteersleutel |
| `created_at` | timestamptz | Aanmaakdatum |
| `updated_at` | timestamptz | Laatste wijziging |

Datumtypen worden bepaald door welke kolommen gevuld zijn:
- **Enkele datum**: `date` gevuld
- **Datumbereik**: `date_start` + `date_end` gevuld
- **Datumlijst**: `dates_item` + `group_id` gevuld (meerdere rijen met hetzelfde `group_id`)

### Tabel: `training_slots` (Trainingsschema)

| Kolom | Type | Omschrijving |
|---|---|---|
| `id` | uuid | Primaire sleutel |
| `day_of_week` | integer | 1=maandag … 5=vrijdag |
| `start_time` | time | Begintijd (bijv. `16:00`) |
| `end_time` | time | Eindtijd |
| `description` | text | Optionele omschrijving |
| `updated_at` | timestamptz | Laatste wijziging |

Via junction tables:
- **`training_slot_fields`**: koppelt een slot aan een of meerdere velden
- **`training_slot_teams`**: koppelt een slot aan een of meerdere teams

### Tabel: `fields`

| Kolom | Type | Omschrijving |
|---|---|---|
| `id` | uuid | Primaire sleutel |
| `name` | text | Veldnaam (bijv. `1A`, `6C`, `Veld 2A`) |
| `display_order` | integer | Volgorde in het schema |
| `active` | boolean | Of het veld zichtbaar is in het schema |

### Tabel: `teams`

| Kolom | Type | Omschrijving |
|---|---|---|
| `id` | uuid | Primaire sleutel |
| `name` | text | Teamnaam (bijv. `JO11-1`, `Selectie`) |
| `display_order` | integer | Volgorde |
| `color` | text | HEX-kleur voor weergave in het schema |

### Row Level Security

RLS is ingeschakeld op alle tabellen:

- **Publiek lezen**: `SELECT` voor de `anon`-rol
- **Schrijven**: `INSERT`, `UPDATE`, `DELETE` alleen voor geauthenticeerde gebruikers (`auth.uid() IS NOT NULL`)

---

## Public assets

Bestanden in `public/` worden geserveerd als statische bestanden. In JSX-code moeten paden altijd worden voorafgegaan door `import.meta.env.BASE_URL`, zodat ze correct werken op GitHub Pages:

```jsx
// Correct
<img src={`${import.meta.env.BASE_URL}logo-vvz.png`} />

// Fout — werkt niet op GitHub Pages
<img src="/logo-vvz.png" />
```

---

## Deployment

De GitHub Actions workflow (`.github/workflows/deploy.yml`) draait bij iedere push naar `main`:

1. Checkout code
2. Setup Node.js (v20)
3. `npm ci` — dependencies installeren
4. `npm run build` — productie-build met Supabase secrets als env vars
5. Upload `dist/` als GitHub Pages artifact
6. Deploy naar GitHub Pages

### GitHub Pages instellen

1. Ga naar **Settings → Pages** in de repository
2. Stel **Source** in op **GitHub Actions**

### GitHub Secrets instellen

Ga naar **Settings → Secrets and variables → Actions** en voeg toe:

| Secret | Waarde |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |

### Supabase Auth-instellingen

In het Supabase dashboard onder **Authentication → URL Configuration**:

- **Site URL**: `https://thewally.github.io/vvz-toolbox/`
- **Redirect URLs**: `https://thewally.github.io/vvz-toolbox/**`

### Live URL

**[https://thewally.github.io/vvz-toolbox/](https://thewally.github.io/vvz-toolbox/)**

Routes gebruiken hash-based URLs, bijv. `https://thewally.github.io/vvz-toolbox/#/trainingsschema`.
