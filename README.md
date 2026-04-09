# VVZ'49 Toolbox

Een webapplicatie voor [sv VVZ'49](https://www.vvz49.nl) in Soest met tools voor het beheren en presenteren van clubinformatie. Gebouwd met **React + Vite** en **Supabase** als backend.

> Zie [docs/index.md](docs/index.md) voor de volledige documentatie (gebruiker-handleiding, admin-handleiding en technische documentatie).

**Live:** [https://thewally.github.io/vvz-toolbox/](https://thewally.github.io/vvz-toolbox/)

---

## Tools

| Tool | URL | Omschrijving |
|---|---|---|
| **Activiteiten** | `/activiteiten` | Komende clubactiviteiten en evenementen |
| **Trainingsschema** | `/trainingsschema` | Weekoverzicht van trainingstijden en veldindeling |
| **Wedstrijden** | `/wedstrijden` | Programma, uitslagen en afgelastingen |
| **Nieuws** | `/nieuws` | Nieuwsberichten van de club |
| **Sponsors** | `/sponsors` | Sponsoroverzicht en sponsor worden |
| **Club** | `/club/ereleden` | Ereleden, reglementen, historie |
| **Contact** | `/contact` | Contactgegevens, wie doet wat, locatie |
| **Plattegrond** | `/plattegrond` | Kaart van Sportpark Zonnegloren, downloadbaar |
| **Huistijl** | `/huistijl` | Officiële clublogo's en huistijlbestanden |

Alle publieke pagina's zijn zichtbaar zonder login. De beheeromgeving (`/beheer`) is beveiligd met Supabase Auth en granulaire rollen.

---

## Beheeromgeving

De beheeromgeving is bereikbaar via `/beheer` en bevat de volgende onderdelen:

| Onderdeel | URL | Vereiste rol |
|---|---|---|
| Activiteiten | `/beheer/activiteiten` | `activiteiten` |
| Trainingsschema | `/beheer/trainingsschema` | `trainingsschema` |
| Sponsoring | `/beheer/sponsoring` | `sponsoring` |
| Ereleden | `/beheer/club/ereleden` | `ereleden` |
| Contact & Wie doet wat | `/beheer/contact` | `contact` |
| Pagina's & Nieuws | `/beheer/content`, `/beheer/nieuws` | `content` |
| Menu | `/beheer/menu` | `content` |
| Gebruikers | `/beheer/gebruikers` | `gebruikers` |

Gebruikers met de rol `admin` (via `app_metadata`) hebben automatisch toegang tot alle onderdelen. Andere gebruikers zien alleen de onderdelen waarvoor ze een rol hebben.

---

## Vereisten

| Tool | Versie | Waarvoor |
|---|---|---|
| [Node.js](https://nodejs.org) | 18 of hoger | JavaScript runtime voor de build-tooling |
| [npm](https://www.npmjs.com) | meegeleverd met Node.js | Pakketbeheer en scripts |
| [Git](https://git-scm.com) | recent | Versiebeheer |

---

## Installatie

```bash
npm install
```

### Omgevingsvariabelen

Maak een `.env`-bestand aan in de projectroot:

```env
VITE_SUPABASE_URL=https://jouw-project.supabase.co
VITE_SUPABASE_ANON_KEY=jouw-anon-key
```

---

## Ontwikkeling

```bash
npm run dev
```

Start de Vite dev server op [http://localhost:5173/vvz-toolbox/](http://localhost:5173/vvz-toolbox/).

---

## Bouwen

```bash
npm run build
```

Dit draait `vite build` gevolgd door het genereren van Open Graph HTML-bestanden. Uitvoer staat in `dist/`.

---

## Deployment

De app deployt automatisch naar **GitHub Pages** via GitHub Actions bij iedere push naar `main`.

Vereiste GitHub Secrets:

| Secret | Omschrijving |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |

Zie [docs/technische-documentatie.md](docs/technische-documentatie.md) voor de volledige deployment-instructies.

---

## Supabase setup

### Edge Functions

De applicatie gebruikt twee Supabase Edge Functions:

- **`invite-user`** — Stuurt een uitnodigingsmail naar een nieuwe gebruiker
- **`set-user-role`** — Stelt de `admin` rol in via `app_metadata`

Deze moeten gedeployd worden naar je Supabase project.

### Database migraties

Voer de SQL-migraties uit in het Supabase SQL Editor:

1. `supabase/migration.sql` — Basistabellen (activities, training_slots, fields, teams)
2. `supabase/sponsors.sql` — Sponsortabel
3. `supabase/migration_rolbeheer.sql` — Rolbeheer (`user_roles` tabel, RLS policies, functies)

### Rolbeheer

Het rolsysteem werkt op twee niveaus:

1. **Admin** — Via `app_metadata.role = 'admin'` op de Supabase Auth user. Heeft toegang tot alles.
2. **Granulaire rollen** — Via de `user_roles` tabel. Mogelijke rollen: `activiteiten`, `trainingsschema`, `sponsoring`, `ereleden`, `contact`, `content`, `gebruikers`.

Rollen worden beheerd via de gebruikersbeheerpagina (`/beheer/gebruikers`). Zie `supabase/migration_rolbeheer.sql` voor de database-setup.

### Auth-instellingen

In het Supabase dashboard onder **Authentication → URL Configuration**:

- **Site URL**: `https://thewally.github.io/vvz-toolbox/`
- **Redirect URLs**: `https://thewally.github.io/vvz-toolbox/**`

---

## Documentatie

| Document | Doelgroep | Inhoud |
|---|---|---|
| [docs/gebruiker-handleiding.md](docs/gebruiker-handleiding.md) | Eindgebruikers | Wat de toolbox toont en hoe te navigeren |
| [docs/admin-handleiding.md](docs/admin-handleiding.md) | Beheerders | Activiteiten, trainingsschema, gebruikers en rollen beheren |
| [docs/technische-documentatie.md](docs/technische-documentatie.md) | Ontwikkelaars | Architectuur, Supabase, database, deployment |
