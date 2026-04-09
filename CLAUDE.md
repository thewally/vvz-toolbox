# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

This is the **VVZ'49 Toolbox** — a web application for VVZ'49, a football club from Soest (Netherlands). It is built as a React frontend with Supabase as the backend, deployed to GitHub Pages.

The toolbox contains the following sections:

1. **Activiteiten** (`/activiteiten`) — Upcoming club activities and events, publicly visible. Admin at `/beheer/activiteiten`.
2. **Trainingsschema** (`/trainingsschema`) — Weekly training schedule. Admin at `/beheer/trainingsschema`. Field layout at `/trainingsschema/veldindeling`.
3. **Wedstrijden** (`/wedstrijden`) — Match programme, results, and cancellations.
4. **Nieuws** (`/nieuws`) — News articles. Admin at `/beheer/nieuws`.
5. **Sponsors** (`/sponsors`) — Sponsor overview and "become a sponsor". Admin at `/beheer/sponsoring`.
6. **Club** — Ereleden (`/club/ereleden`), reglementen, historie. Admin at `/beheer/club/ereleden`.
7. **Contact** — Contact details, wie doet wat, location. Admin at `/beheer/contact`.
8. **Content pages** (`/pagina/:slug`) — Free-form pages via TipTap editor. Admin at `/beheer/content`.
9. **Plattegrond** (`/plattegrond`) — Map of Sportpark Zonnegloren (PDF A4, A3, SVG, EPS).
10. **Huistijl** (`/huistijl`) — Official club branding assets (logo PNG, AI vector).
11. **Gebruikersbeheer** (`/beheer/gebruikers`) — Invite users, assign granular roles.

All public views are visible without login. The admin environment (`/beheer`) is protected via Supabase Auth with granular role-based access.

## Tech Stack

- **Frontend**: React 18 with Vite 5
- **Routing**: React Router v6 with `BrowserRouter` (`basename="/vvz-toolbox"`)
- **Backend**: Supabase (PostgreSQL, Auth, RLS, Edge Functions)
- **Styling**: Tailwind CSS
- **Rich text**: TipTap
- **PDF export**: jsPDF + html2canvas
- **Deployment**: GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`)
- **Agents**: Use `js-frontend-supabase-builder` for frontend + Supabase work, `ux-designer` for UX review, `gh-pages-supabase-deployer` for deployment

## Key Conventions

- Supabase client lives in `src/lib/supabaseClient.js` using `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- All Supabase interactions are isolated in `src/services/`
- Always destructure `{ data, error }` from Supabase responses
- Row Level Security enabled by default; policies use `auth.uid()` and `user_has_role()`
- Public asset paths must use `import.meta.env.BASE_URL` prefix (e.g. `` `${import.meta.env.BASE_URL}logo-vvz.png` ``) — never hardcoded `/` paths, because Vite base is `/vvz-toolbox/` on GitHub Pages
- Styling: Tailwind CSS only, no CSS Modules

## Authorization

Two-level role system:

1. **Admin**: `app_metadata.role = 'admin'` — full access to everything. Set via Edge Function `set-user-role`.
2. **Granular roles**: `user_roles` table with `role_slug` values: `activiteiten`, `trainingsschema`, `sponsoring`, `ereleden`, `contact`, `content`, `gebruikers`. Each role grants access to specific `/beheer/*` routes.

DB functions: `user_has_role(slug)` (with admin bypass), `user_has_any_role()`, `get_user_roles_for_management()`.

Edge Functions: `invite-user` (send invitation email), `set-user-role` (set/remove admin via app_metadata).

## Project Structure

```
src/
  components/
    Layout.jsx                # Global header + footer
    BeheerLayout.jsx          # Admin layout with sidebar nav
    AgendaLayout.jsx          # Sub-nav: Activiteiten
    TrainingschemaLayout.jsx  # Sub-nav: Schema | Veldindeling
    WedstrijdenLayout.jsx     # Sub-nav: Programma | Uitslagen | Afgelastingen
    ProtectedRoute.jsx        # Auth + role guard
  pages/
    HomePage.jsx
    ActiviteitenPage.jsx / ActiviteitenBeheerPage.jsx
    SchedulePage.jsx / TrainingschemaBeheerPage.jsx / AdminPage.jsx
    VeldindelingPage.jsx
    GebruikersBeheerPage.jsx
    SponsoringBeheerPage.jsx / EreledenBeheerPage.jsx
    ContactBeheerPage.jsx / WieDoetWatBeheerPage.jsx
    MenuBeheerPage.jsx / ContentBeheerPage.jsx / ContentEditPage.jsx
    NieuwsBeheerPage.jsx / NieuwsEditPage.jsx
    LoginPage.jsx / WachtwoordVergetenPage.jsx / WachtwoordResettenPage.jsx / WachtwoordInstellenPage.jsx
    PlattegrondPage.jsx / HuistijlPage.jsx
  services/
    activities.js        # Agenda CRUD
    auth.js              # Invite, role assignment, password flows
    roles.js             # user_roles CRUD
    trainingSlots.js
    fields.js
    teams.js
  lib/
    supabaseClient.js
    constants.js
  context/
    AuthContext.jsx       # Global auth + roles state
public/
  logo-vvz.png
  plattegrond/           # plattegrond.svg, plattegrond-trainingschema.svg, PDF/EPS files
  huistijl/              # logo-vvz.png, logo-vvz.ai
supabase/
  migration.sql          # Base tables
  sponsors.sql           # Sponsors table
  migration_rolbeheer.sql # user_roles, RLS policies, DB functions
```

## Agenda Domain

Activities are stored in a Supabase `activities` table with three date modes:
- **Enkele datum**: single day (`date` column)
- **Periode**: date range (`date_start`, `date_end`)
- **Lijst**: recurring series (`dates_item`, grouped by `group_id`)

Optional fields: `time_start`, `time_end`, `url`, `description`.

## Training Schedule Domain

The schedule covers **Monday–Friday** (weekends are match days, not training days).

Fields available:
- **Veld 1**: 1A, 1B, 1C, 1D (four sub-fields)
- **Veld 6**: 6A, 6B, 6C, 6D (four sub-fields)
- **Veld 2**: 2A, 2B
- **Veld 3**: 3A, 3B
- **Veld 4**, **Veld 5** (single fields)

Time slots run from **13:45 to 22:45** in 15-minute increments.

Teams use Dutch naming (JO9, JO10, JO11, JO12, JO13, JO14, JO15, JO17, JO19 = youth; Selectie, Veteranen, Zesde, Derde, 30+ vrouwen, 35+ mannen, 45+ mannen).

## Deployment

- **Live URL**: https://thewally.github.io/vvz-toolbox/
- **Repository**: https://github.com/thewally/vvz-toolbox
- Auto-deploys on push to `main` via GitHub Actions
- Requires GitHub Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```
