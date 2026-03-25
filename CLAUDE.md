# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

This is the **VVZ'49 Toolbox** — a web application for VVZ'49, a football club from Soest (Netherlands). It is built as a React frontend with Supabase as the backend, deployed to GitHub Pages.

The toolbox contains the following tools:

1. **Agenda** (`/agenda`) — Upcoming club activities and events, publicly visible. Admin environment for managing activities at `/agenda/beheer`.
2. **Trainingsschema** (`/trainingsschema`) — Weekly training schedule showing which team trains on which field and at what time. Google Calendar-like look and feel, exportable as PDF. Admin at `/trainingsschema/beheer`. Field layout view at `/trainingsschema/veldindeling`.
3. **Plattegrond** (`/plattegrond`) — Map of Sportpark Zonnegloren with downloadable files (PDF A4, PDF A3, SVG, EPS).
4. **Huistijl** (`/huistijl`) — Official club branding assets (logo PNG, AI vector).

All public views are visible without login. Admin environments are password-protected via Supabase Auth.

## Tech Stack

- **Frontend**: React with Vite
- **Routing**: React Router v6 with `HashRouter` (required for GitHub Pages)
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Styling**: Tailwind CSS
- **Deployment**: GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`)
- **Agents**: Use `js-frontend-supabase-builder` for frontend + Supabase work, `ux-designer` for UX review, `gh-pages-supabase-deployer` for deployment

## Key Conventions

- Supabase client lives in `src/lib/supabaseClient.js` using `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- All Supabase interactions are isolated in `src/services/`
- Always destructure `{ data, error }` from Supabase responses
- Row Level Security enabled by default; policies use `auth.uid()`
- Public asset paths must use `import.meta.env.BASE_URL` prefix (e.g. `` `${import.meta.env.BASE_URL}logo-vvz.png` ``) — never hardcoded `/` paths, because Vite base is `/vvz-toolbox/` on GitHub Pages
- Styling: Tailwind CSS only, no CSS Modules

## Project Structure

```
src/
  components/
    Layout.jsx           # Global header (breadcrumb) + footer
    AgendaLayout.jsx     # Sub-nav: Agenda | Beheer
    TrainingschemaLayout.jsx  # Sub-nav: Schema | Veldindeling | Beheer
    ProtectedRoute.jsx
  pages/
    HomePage.jsx
    AgendaPage.jsx
    AgendaBeheerPage.jsx
    SchedulePage.jsx
    VeldindelingPage.jsx
    AdminPage.jsx
    PlattegrondPage.jsx
    HuistijlPage.jsx
    LoginPage.jsx
  services/
    activities.js        # Agenda CRUD
    trainingSlots.js
    fields.js
    teams.js
  lib/
    supabaseClient.js
    constants.js
  context/
    AuthContext.jsx
public/
  logo-vvz.png
  plattegrond/           # plattegrond.svg, plattegrond-trainingschema.svg, PDF/EPS files
  huistijl/              # logo-vvz.png, logo-vvz.ai
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
