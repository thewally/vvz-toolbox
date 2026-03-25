# VVZ'49 Toolbox

Een webapplicatie voor [sv VVZ'49](https://www.vvz49.nl) in Soest met tools voor het beheren en presenteren van clubinformatie. Gebouwd met **React + Vite** en **Supabase** als backend.

> Zie [docs/index.md](docs/index.md) voor de volledige documentatie (gebruiker-handleiding, admin-handleiding en technische documentatie).

**Live:** [https://thewally.github.io/vvz-toolbox/](https://thewally.github.io/vvz-toolbox/)

---

## Tools

| Tool | URL | Omschrijving |
|---|---|---|
| **Agenda** | `/#/agenda` | Komende clubactiviteiten en evenementen |
| **Trainingsschema** | `/#/trainingsschema` | Weekoverzicht van trainingstijden en veldindeling |
| **Plattegrond** | `/#/plattegrond` | Kaart van Sportpark Zonnegloren, downloadbaar |
| **Huistijl** | `/#/huistijl` | Officiële clublogo's en huistijlbestanden |

Alle tools zijn publiek zichtbaar. Admin-omgevingen zijn beveiligd met Supabase Auth en bereikbaar via `/#/agenda/beheer` en `/#/trainingsschema/beheer`.

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

Uitvoer staat in `dist/`.

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

## Documentatie

| Document | Doelgroep | Inhoud |
|---|---|---|
| [docs/gebruiker-handleiding.md](docs/gebruiker-handleiding.md) | Eindgebruikers | Wat de toolbox toont en hoe te navigeren |
| [docs/admin-handleiding.md](docs/admin-handleiding.md) | Beheerders | Agenda en trainingsschema beheren |
| [docs/technische-documentatie.md](docs/technische-documentatie.md) | Ontwikkelaars | Architectuur, Supabase, database, deployment |
