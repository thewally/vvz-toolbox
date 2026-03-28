# Feature Spec: Sponsoring

## Overzicht

Het Sponsoring-onderdeel bestaat uit drie pagina's en een slider op de homepage. Sponsors worden beheerd via een admin-interface en opgeslagen in Supabase.

**Branch:** `sponsor-feature`

---

## 1. Functionele Requirements

### Sponsors pagina (`/sponsors`)

- Drie categorieën: **Goud**, **Zilver**, **Brons** — in die volgorde getoond
- **Goud**: groot logo (bv. max-w-xs), max 3 per rij, klikbaar naar detailpagina (`/sponsors/[slug]`)
- **Zilver**: kleiner logo (bv. max-w-[150px]), max 6 per rij, klikbaar naar website van sponsor (extern, `target="_blank"`)
- **Brons**: alleen naam als tekst, klikbaar naar website van sponsor (extern)
- Lege categorieën worden niet getoond

### Detailpagina Goud-sponsor (`/sponsors/:slug`)

- Alleen voor Goud-sponsors
- Toont: groot logo, naam, beschrijving, knop "Bezoek website" → externe link
- Zilver/Brons hebben geen detailpagina — direct externe link

### Slider op homepage (`/`)

- Horizontale auto-scrollende slider met alle Goud & Zilver sponsors
- **Goud**: volledig logo op volle hoogte van de slider (bv. h-24)
- **Zilver**: twee zilver-logo's gestapeld in de ruimte van één goud-logo (elk h-10, gap-1)
- Klikken → website van de sponsor (extern, `target="_blank"`)
- Slider loopt automatisch (CSS marquee of JS interval), ook swipeable op mobiel

### Sponsor worden? pagina (`/sponsoring/sponsor-worden`)

- Statische pagina die de drie pakketten beschrijft:
  - **Goud**: groot logo op sponsorpagina (3 per rij), eigen detailpagina, groot logo in slider
  - **Zilver**: kleiner logo op sponsorpagina (6 per rij), gedeelde ruimte in slider, link naar website
  - **Brons**: naam vermelding op sponsorpagina, link naar website
- Contactknop of e-mailadres onderaan

### Sponsor Acties (`/sponsoring/acties`)

- Blijft placeholder

### Beheer (`/sponsoring/beheer`)

- Overzicht van alle sponsors (tabel of kaartjes)
- Toevoegen, bewerken, verwijderen
- Velden: naam, categorie, logo URL, website URL, beschrijving (Goud), slug (auto-gegenereerd uit naam), volgorde (getal), actief (boolean)

---

## 2. Datamodel

### Tabel: `sponsors`

```sql
create table sponsors (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  slug text not null unique,
  categorie text not null check (categorie in ('goud', 'zilver', 'brons')),
  logo_url text,
  website_url text,
  beschrijving text,           -- alleen relevant voor Goud
  volgorde integer not null default 0,
  actief boolean not null default true,
  created_at timestamptz default now()
);
```

### RLS Policies

```sql
-- Iedereen mag actieve sponsors lezen
alter table sponsors enable row level security;

create policy "Publiek lezen van actieve sponsors"
  on sponsors for select
  using (actief = true);

create policy "Beheerders mogen alles"
  on sponsors for all
  using (auth.role() = 'authenticated');
```

---

## 3. Service Layer (`src/services/sponsors.js`)

```js
// Haal alle actieve sponsors op, gesorteerd op volgorde
export async function getSponsors() → { data: Sponsor[], error }

// Haal één sponsor op via slug (voor detailpagina)
export async function getSponsorBySlug(slug) → { data: Sponsor, error }

// Beheer (authenticated only)
export async function createSponsor(sponsor) → { data, error }
export async function updateSponsor(id, updates) → { data, error }
export async function deleteSponsor(id) → { data, error }
```

---

## 4. Routing

| Route | Component | Toegang |
|---|---|---|
| `/sponsors` | `SponsorsPage` | Publiek |
| `/sponsors/:slug` | `SponsorDetailPage` | Publiek |
| `/sponsoring/sponsor-worden` | `SponsorWordenPage` | Publiek |
| `/sponsoring/acties` | `PlaceholderPage` | Publiek |
| `/sponsoring/beheer` | `SponsoringBeheerPage` | Authenticated |

---

## 5. UI/UX per pagina

### SponsorsPage

```
<h2>Onze Sponsors</h2>

## Goud
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
  <Link to="/sponsors/[slug]">
    <img class="w-full object-contain h-32" />
  </Link>
</div>

## Zilver
<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
  <a href={website} target="_blank">
    <img class="w-full object-contain h-16" />
  </a>
</div>

## Brons
<div class="flex flex-wrap gap-3">
  <a href={website} target="_blank" class="text-sm text-gray-700 hover:text-vvz-green">
    {naam}
  </a>
</div>
```

### SponsorDetailPage (Goud)

```
<img logo groot />
<h1>{naam}</h1>
<p>{beschrijving}</p>
<a href={website} target="_blank">Bezoek website →</a>
```

### Homepage Slider

- Component: `SponsorSlider` in `src/components/SponsorSlider.jsx`
- Geplaatst in `HomePage.jsx` boven of onder de tool-kaartjes
- CSS marquee animatie (`animate-marquee` via Tailwind `keyframes` in `tailwind.config.js`)
- Items:
  - Goud: `<a href={website}><img class="h-24 object-contain" /></a>`
  - Zilver: `<a href={website}><div class="flex flex-col gap-1 h-24 justify-center"><img class="h-10 object-contain" /><img class="h-10 object-contain" /></div></a>` (zilver-sponsors worden per 2 gegroepeerd)

### SponsoringBeheerPage

- Tabel met kolommen: Naam, Categorie, Logo, Website, Volgorde, Actief, Acties (Bewerken / Verwijderen)
- Modal voor toevoegen/bewerken (zelfde patroon als AgendaBeheerPage)
- Slug wordt automatisch gegenereerd uit naam (lowercase, spaties → koppelteken)

### SponsorWordenPage

- Drie kaartjes (Goud, Zilver, Brons) met badge-kleur (goud/grijs/bruin)
- Opsomming van voordelen per pakket
- Onderaan: "Interesse? Neem contact op: [e-mail]"

---

## 6. Implementatieplan

| # | Taak | Grootte |
|---|---|---|
| 1 | Supabase tabel aanmaken + RLS policies | S |
| 2 | `src/services/sponsors.js` aanmaken | S |
| 3 | `SponsorsPage` (overzicht met 3 categorieën) | M |
| 4 | `SponsorDetailPage` (Goud detailpagina) | S |
| 5 | Routes toevoegen in `App.jsx` | S |
| 6 | `SponsorSlider` component + marquee animatie | M |
| 7 | Slider integreren in `HomePage.jsx` | S |
| 8 | `SponsorWordenPage` (statische uitleg pakketten) | S |
| 9 | `SponsoringBeheerPage` (CRUD admin) | L |
| 10 | Navigatie: `/sponsoring/beheer` link toevoegen als admin | S |

---

## 7. Buiten scope

- Logo-upload via Supabase Storage (fase 2 — voor nu logo URL invoeren)
- Prijzen van pakketten (bewust weggelaten — per gesprek te bepalen)
- Sponsor Acties pagina (blijft placeholder)
- E-mailformulier op Sponsor worden? pagina (fase 2)
