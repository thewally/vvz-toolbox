# Technische documentatie VVZ'49 Toolbox

Deze documentatie beschrijft de technische architectuur van de VVZ'49 Toolbox voor ontwikkelaars en technisch beheerders.

---

## Tech Stack

| Onderdeel | Technologie |
|---|---|
| Frontend framework | React 18 |
| Build tool | Vite 5 |
| Routing | React Router v6 (BrowserRouter met `basename="/vvz-toolbox"`) |
| Styling | Tailwind CSS |
| Rich text editor | TipTap |
| PDF export | jsPDF + html2canvas |
| Backend | Supabase (PostgreSQL + Auth + RLS + Edge Functions) |
| Deployment | GitHub Pages via GitHub Actions |

---

## Projectstructuur

```
vvz-toolbox/
  public/
    logo-vvz.png
    plattegrond/                         # SVG, PDF, EPS bestanden
    huistijl/                            # Logo PNG + AI
  src/
    components/
      Layout.jsx                         # Globale header + footer
      BeheerLayout.jsx                   # Beheer-omgeving layout met zijnavigatie
      AgendaLayout.jsx                   # Sub-nav activiteiten
      TrainingschemaLayout.jsx           # Sub-nav schema | veldindeling
      WedstrijdenLayout.jsx              # Sub-nav wedstrijden
      ProtectedRoute.jsx                 # Auth + rolcheck guard
    pages/
      HomePage.jsx
      ActiviteitenPage.jsx               # Publieke agendaweergave
      ActiviteitenBeheerPage.jsx         # Admin: activiteiten beheren
      SchedulePage.jsx                   # Publiek trainingsschema
      TrainingschemaBeheerPage.jsx       # Admin: schema beheren
      VeldindelingPage.jsx               # Veldindeling SVG
      AdminPage.jsx                      # Admin: tijdslots, teams, velden
      GebruikersBeheerPage.jsx           # Admin: gebruikers en rollen
      SponsoringBeheerPage.jsx           # Admin: sponsors beheren
      EreledenBeheerPage.jsx             # Admin: ereleden beheren
      ContactBeheerPage.jsx              # Admin: contactgegevens
      WieDoetWatBeheerPage.jsx           # Admin: wie doet wat
      MenuBeheerPage.jsx                 # Admin: menu-items
      ContentBeheerPage.jsx              # Admin: pagina's
      ContentEditPage.jsx                # Admin: pagina bewerken (TipTap)
      NieuwsBeheerPage.jsx               # Admin: nieuwsberichten
      NieuwsEditPage.jsx                 # Admin: nieuwsbericht bewerken
      LoginPage.jsx
      WachtwoordVergetenPage.jsx
      WachtwoordResettenPage.jsx
      WachtwoordInstellenPage.jsx
      EmailBevestigdPage.jsx
      PlattegrondPage.jsx
      HuistijlPage.jsx
    services/
      activities.js                      # Agenda CRUD
      auth.js                            # Invite, rollen, wachtwoord
      roles.js                           # Rolbeheer (user_roles)
      trainingSlots.js                   # Trainingsschema CRUD
      fields.js                          # Velden CRUD
      teams.js                           # Teams CRUD
    lib/
      supabaseClient.js                  # Supabase client initialisatie
      constants.js
    context/
      AuthContext.jsx                    # Globale auth + rollen state
  supabase/
    migration.sql                        # Basistabellen
    sponsors.sql                         # Sponsortabel
    migration_rolbeheer.sql              # user_roles + RLS + functies
  .github/workflows/
    deploy.yml                           # GitHub Actions deployment
  vite.config.js
```

---

## Routing

De app gebruikt `BrowserRouter` met `basename="/vvz-toolbox"`. URL's zijn clean paths (geen hash-fragment).

GitHub Pages heeft geen server-side routing. De deploy workflow bevat een `404.html` die doorverwijst naar `index.html`, zodat client-side routing werkt.

---

## Omgevingsvariabelen

| Variabele | Omschrijving |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (bijv. `https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous (publieke) key |

Lokaal: sla op in `.env` in de projectroot. In productie: GitHub Secrets.

> **Let op:** `VITE_*` variabelen worden gebundeld in de frontend-JavaScript en zijn zichtbaar voor iedereen. Gebruik uitsluitend de anon key — nooit de service role key.

---

## Authenticatie en autorisatie

### Auth-flows

De app ondersteunt de volgende auth-flows:

1. **Uitnodiging** — Een beheerder nodigt een gebruiker uit via `/beheer/gebruikers`. De gebruiker ontvangt een e-mail en wordt na bevestiging doorgestuurd naar `/wachtwoord-instellen` om een wachtwoord te kiezen.
2. **Wachtwoord vergeten** — Via `/wachtwoord-vergeten` kan een gebruiker een reset-link aanvragen. Na klikken op de link wordt de gebruiker doorgestuurd naar `/wachtwoord-resetten`.
3. **Login/logout** — Via `/login` met e-mail en wachtwoord.

### Rolsysteem

Het autorisatiesysteem werkt op twee niveaus:

**Niveau 1: Admin (Supabase Auth)**
Gebruikers met `app_metadata.role = 'admin'` hebben volledige toegang tot alle beheeronderdelen. Dit wordt ingesteld via de Edge Function `set-user-role`.

**Niveau 2: Granulaire rollen (user_roles tabel)**
Niet-admin gebruikers krijgen toegang via specifieke rollen in de `user_roles` tabel:

| Rol-slug | Geeft toegang tot |
|---|---|
| `activiteiten` | Activiteitenbeheer |
| `trainingsschema` | Trainingsschemabeheer |
| `sponsoring` | Sponsoringbeheer |
| `ereleden` | Ereledenbeheer |
| `contact` | Contact en wie-doet-wat beheer |
| `content` | Pagina's, nieuws en menubeheer |
| `gebruikers` | Gebruikers- en rollenbeheer |

### Database functies

- `user_has_role(check_slug TEXT)` — Controleert of de huidige gebruiker de opgegeven rol heeft. Admin-gebruikers passeren automatisch.
- `user_has_any_role()` — Controleert of de huidige gebruiker enige rol heeft (voor toegang tot het beheerdashboard).
- `get_user_roles_for_management()` — Haalt alle user-rol koppelingen op (voor de gebruikersbeheerpagina).

### ProtectedRoute

Routes in de beheeromgeving zijn gewikkeld in `<ProtectedRoute>`:

```jsx
// Toegang voor elke gebruiker met een rol
<ProtectedRoute adminOnly>
  <BeheerLayout />
</ProtectedRoute>

// Toegang alleen met specifieke rol (of admin)
<ProtectedRoute requiredRole="activiteiten">
  <ActiviteitenBeheerPage />
</ProtectedRoute>
```

De guard handelt ook af:
- Doorsturen naar login als niet ingelogd
- Verplicht wachtwoord instellen na uitnodiging
- Verplicht wachtwoord resetten na recovery-link

### Edge Functions

| Functie | Doel |
|---|---|
| `invite-user` | Stuurt een uitnodigingsmail naar een nieuw e-mailadres. Maakt de Auth-user aan in Supabase. |
| `set-user-role` | Stelt `app_metadata.role` in op `admin` of verwijdert deze. Vereist service role key server-side. |

Deze functies moeten gedeployd worden naar je Supabase project. Ze worden aangeroepen vanuit `src/services/auth.js`.

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
| `day_of_week` | integer | 1=maandag ... 5=vrijdag |
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
| `category` | text | Categorie: `Pupillen`, `Junioren`, `Senioren`, `Veteranen` of `null` |

### Tabel: `user_roles` (Rolbeheer)

| Kolom | Type | Omschrijving |
|---|---|---|
| `id` | uuid | Primaire sleutel |
| `user_id` | uuid | Verwijzing naar `auth.users(id)` |
| `role_slug` | text | Rolnaam (zie constraint hieronder) |
| `assigned_by` | uuid | Wie de rol heeft toegekend |
| `created_at` | timestamptz | Aanmaakdatum |

CHECK constraint op `role_slug`: `activiteiten`, `trainingsschema`, `sponsoring`, `ereleden`, `contact`, `content`, `gebruikers`. UNIQUE op `(user_id, role_slug)`.

### Row Level Security

RLS is ingeschakeld op alle tabellen:

- **Publiek lezen**: `SELECT` voor de `anon`-rol (activities, training_slots, fields, teams, sponsors, etc.)
- **Schrijven**: `INSERT`, `UPDATE`, `DELETE` alleen voor geauthenticeerde gebruikers met de juiste rol
- **user_roles**: eigen rollen lezen, beheerders en gebruikers met rol `gebruikers` mogen alles lezen/toekennen/verwijderen

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
