# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

This is the **VVZ'49 Toolbox** — a web application for VVZ'49, a football club from Soest (Netherlands). It is built as a JavaScript frontend with Supabase as the backend.

The first tool in the toolbox is a **Trainingsschema** (training schedule with field layout). It shows a weekly overview of which team trains on which field and at what time. The schedule has a Google Calendar-like look and feel, and can be exported as a PDF.

The schedule is **publicly visible** (no login required to view). There is a **password-protected admin environment** where authorized users can manage the schedule (add, edit, delete training slots, teams, and field assignments).

## Tech Stack

- **Frontend**: React with Vite
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, RLS)
- **Styling**: Tailwind CSS or CSS Modules
- **Agent**: Use the `js-frontend-supabase-builder` sub-agent for all frontend + Supabase work

## Key Conventions

- Supabase client lives in `src/lib/supabaseClient.js` using `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- All Supabase interactions are isolated in `src/services/`
- Always destructure `{ data, error }` from Supabase responses
- Row Level Security enabled by default; policies use `auth.uid()`

## Training Schedule Domain

The schedule covers **Monday–Friday** (Zaterdag/Sunday are match days, not training days).

Fields available:
- **Veld 1**: 1A, 1B, 1C, 1D (four sub-fields)
- **Veld 6**: 6A, 6B, 6C, 6D (four sub-fields)
- Additional fields: Veld 2, Veld 3 (3A, 3B), Veld 4, Veld 5

Time slots run from **13:45 to 22:45** in 15-minute increments.

Teams use Dutch naming (JO9, JO10, JO11, JO12, JO13, JO14, JO15, JO17, JO19 = youth; O16, O17 = older youth; Selectie, Veteranen, Zesde, Derde, Derde & 35+, 30+ vrouwen, 35+ mannen, 45+ mannen).

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
