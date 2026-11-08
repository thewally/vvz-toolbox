# VVZ'49 Toolbox

Een webapplicatie voor [sv VVZ'49](https://www.vvz49.nl) in Soest met tools voor het beheren en presenteren van clubinformatie. Gebouwd met **React + Vite** en **Supabase** als backend.

> Zie [docs/index.md](docs/index.md) voor de volledige documentatie (gebruiker-handleiding, admin-handleiding en technische documentatie).

**Live:** [https://thewally.github.io/vvz-toolbox/](https://thewally.github.io/vvz-toolbox/)

---

## Tools

| Tool | URL | Omschrijving |
|---|---|---|
| **Activiteiten** | `/activiteiten` | Komende clubactiviteiten en evenementen (uit SportLink, standaard 100 dagen vooruit; instelbaar met `VITE_ACTIVITEITEN_DAGEN_VOORUIT`) |
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

#### Inloggen via Auth0 (optioneel, achter een vlag)

Standaard (`VITE_AUTH_PROVIDER` leeg of `supabase`) gebruikt de site de Supabase-login en is er geen Auth0-code actief. Met `VITE_AUTH_PROVIDER=auth0` loggen gebruikers in via Auth0 Universal Login. Alle variabelen zijn publiek (een SPA heeft geen client secret).

| Variabele | Betekenis |
|---|---|
| `VITE_AUTH_PROVIDER` | `auth0` of leeg/`supabase` (standaard) |
| `VITE_AUTH0_DOMAIN` | Auth0-tenantdomein, bijv. `vvz.eu.auth0.com` (verplicht in Auth0-modus) |
| `VITE_AUTH0_CLIENT_ID` | Client-id van de Auth0 SPA-applicatie (verplicht in Auth0-modus) |
| `VITE_AUTH0_AUDIENCE` | API-identifier van de Quarkus-API (`OIDC_AUDIENCE`); nodig voor `getAccessToken()` en de rolclaim in het access token |
| `VITE_AUTH0_CONNECTION` | Database-connectie voor wachtwoord vergeten (standaard `Username-Password-Authentication`) |

Auth0 SPA-applicatie: Allowed Callback URLs `https://thewally.github.io/vvz-toolbox/` en `http://localhost:5173/vvz-toolbox/`; Allowed Logout URLs en Allowed Web Origins idem (zonder pad); Refresh Token Rotation aan.

Rollen komen uit de claim `https://vvz49.nl/roles` (lijst met slugs zoals `paginas`, `nieuws`, `admin`). De site leest eerst het access token (voor de audience) en valt terug op dezelfde claim in het ID-token. De Post-Login Action moet de claim dus in het access token of het ID-token zetten, met exact de slugs uit de toolbox.

Voor latere kaarten (#60, #62): `getAccessToken()` uit `src/services/auth0Token.js` geeft een accesstoken voor `VITE_AUTH0_AUDIENCE` (of `null` als niet ingelogd) voor `Authorization: Bearer`.

#### Gebruikersbeheer (`/beheer/gebruikers`)

De pagina volgt de vlag. In Auth0-modus gebruikt zij de Quarkus-API `/api/gebruikers` (lijst, uitnodigen, rollen wijzigen, uitnodiging opnieuw sturen, verwijderen) met het Bearer-token uit `getAccessToken()`; alleen de rol `admin` heeft toegang en de pagina raakt Supabase niet. Zonder vlag (of `supabase`) blijft de pagina met edge functions en `user_roles` werken en is er geen extra variabele nodig.

| Variabele | Betekenis |
|---|---|
| `VITE_API_BASE_URL` | Optioneel. Basis-url van de Quarkus-API. Standaard afgeleid uit `VITE_SPORTLINK_PROXY_URL` door `/api/sportlink` te verwijderen (zelfde Render-service) |

De pagina toont de rollen van de backend-whitelist (`src/lib/gebruikersHelpers.js`) als schakelaars; `admin` is een eigen schakelaar en `activiteiten` (geen beheerpagina) wordt niet getoond maar blijft behouden bij opslaan. De rol `gebruikers` bestaat alleen in Supabase-modus. Tests: `node --test tests/gebruikersApi.test.mjs`.

Beperkingen zolang beheerschrijfacties nog via supabase-js lopen: in Auth0-modus is er geen Supabase-sessie, dus die schrijfacties falen door RLS. Verslagen krijgen in Auth0-modus geen `author_id`. Zet de vlag pas om als #55, #42 en #60/#62 klaar zijn. Terugdraaien: vlag leegmaken en opnieuw deployen. De GitHub Actions-variabelen voor de build staan in `.github/workflows/deploy.yml` (voor ops/Arjen om aan te maken).

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

1. `supabase/migration.sql` — Basistabellen (training_slots, fields, teams)
2. `supabase/sponsors.sql` — Sponsortabel
3. `supabase/migration_rolbeheer.sql` — Rolbeheer (`user_roles` tabel, RLS policies, functies)

### Rolbeheer

Het rolsysteem werkt op twee niveaus:

1. **Admin** — Via `app_metadata.role = 'admin'` op de Supabase Auth user. Heeft toegang tot alles.
2. **Granulaire rollen** — Via de `user_roles` tabel. Mogelijke rollen: `trainingsschema`, `sponsoring`, `ereleden`, `contact`, `content`, `gebruikers`.

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
| [docs/admin-handleiding.md](docs/admin-handleiding.md) | Beheerders | Trainingsschema, gebruikers en rollen beheren |
| [docs/technische-documentatie.md](docs/technische-documentatie.md) | Ontwikkelaars | Architectuur, Supabase, database, deployment |
