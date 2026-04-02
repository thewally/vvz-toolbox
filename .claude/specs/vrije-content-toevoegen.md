# Feature Spec: Vrije Content & Dynamisch Menu

## Samenvatting

Deze feature maakt het mogelijk om:
1. **Contentpagina's** aan te maken met rich text, afbeeldingen en YouTube-embeds
2. **Het hoofdmenu en Quick Links dynamisch** te beheren vanuit een admin-interface
3. **Publieke pagina's** te tonen op basis van een slug, ook zonder menuitem

De feature vervangt de huidige hardcoded navigatie in `src/lib/navigation.js` en `TopNav.jsx` door een database-gedreven menu, met een hardcoded fallback als de database niet bereikbaar is.

---

## Fase-indeling

De feature is opgedeeld in 3 onafhankelijk releasbare fases:

| Fase | Omschrijving | Waarde |
|------|-------------|--------|
| **1** | Contentpagina's (CRUD + publieke weergave) | Beheerder kan pagina's maken, bezoekers kunnen ze bekijken |
| **2** | Menubeheer (database-gedreven menu) | Beheerder kan menu aanpassen zonder code-wijziging |
| **3** | Quick Links beheer + HomePage integratie | Beheerder beheert ook de Quick Links en homepagina-kaartjes |

---

## Fase 1: Contentpagina's

### Functionele eisen (must-have)

- Beheerder kan een contentpagina aanmaken met: titel, slug (auto-gegenereerd uit titel, handmatig aanpasbaar), rich text content, publicatiedatum, optionele vervaldatum
- Rich text editor ondersteunt: koppen (h2, h3), bold/italic/underline, lijsten (ul/ol), links, afbeeldingen (upload naar Supabase Storage), YouTube-embeds
- Lijst met alle pagina's in beheerscherm, met kolommen: titel, slug, publicatiedatum, status (gepubliceerd/verlopen/concept), gekoppelde menuitems (fase 2)
- Pagina's die niet aan een menuitem zijn gekoppeld tonen een waarschuwing in de lijst en in de edit-view
- Publieke pagina's zijn bereikbaar via `#/pagina/:slug` zonder login
- Verlopen pagina's (vervaldatum verstreken) zijn niet meer zichtbaar voor bezoekers, wel voor beheerders
- Wijzigingsdatum wordt automatisch bijgehouden

### Functionele eisen (nice-to-have)

- Pagina dupliceren
- Versiegeschiedenis
- Concept/draft status (niet gepubliceerd)
- Zoekfunctie in paginalijst

### Rich text editor: TipTap

**Aanbeveling: [TipTap](https://tiptap.dev/)** (open-source, MIT-licentie voor core)

Redenen:
- Headless: geen eigen CSS, past perfect bij Tailwind-styling
- React-first met `@tiptap/react`
- Modulair: alleen de extensies installeren die nodig zijn
- Goede image- en YouTube-embed extensies beschikbaar
- Actieve community, goed onderhouden

Benodigde packages:
```
@tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-youtube @tiptap/extension-link @tiptap/extension-underline @tiptap/pm
```

De editor slaat content op als **HTML** (niet JSON). Dit maakt rendering in de publieke view simpel (`dangerouslySetInnerHTML` met sanitization) en is doorzoekbaar.

### Datamodel

#### Tabel: `pages`

```sql
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT, -- HTML from TipTap
  published_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ, -- NULL = never expires
  og_title TEXT, -- override for WhatsApp/social preview
  og_description TEXT,
  og_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pages_slug ON pages (slug);
CREATE INDEX idx_pages_published_at ON pages (published_at);

-- RLS
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Iedereen kan gepubliceerde pagina's lezen"
  ON pages FOR SELECT
  USING (
    published_at <= now()
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "Beheerders kunnen alles lezen"
  ON pages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Beheerders kunnen pagina's aanmaken"
  ON pages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Beheerders kunnen pagina's wijzigen"
  ON pages FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Beheerders kunnen pagina's verwijderen"
  ON pages FOR DELETE
  TO authenticated
  USING (true);
```

#### Supabase Storage: `page-images` bucket

```sql
-- Maak een publieke bucket aan voor pagina-afbeeldingen
INSERT INTO storage.buckets (id, name, public)
VALUES ('page-images', 'page-images', true);

-- Iedereen kan afbeeldingen lezen (publieke bucket)
CREATE POLICY "Publiek lezen van afbeeldingen"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'page-images');

-- Alleen beheerders kunnen uploaden
CREATE POLICY "Beheerders uploaden afbeeldingen"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'page-images');

-- Beheerders kunnen verwijderen
CREATE POLICY "Beheerders verwijderen afbeeldingen"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'page-images');
```

### Service layer: `src/services/pages.js`

```js
// Alle pagina's ophalen (beheer - inclusief verlopen/concept)
export async function fetchAllPages()
// -> { data: Page[], error }

// Enkele pagina ophalen op slug (publiek)
export async function fetchPageBySlug(slug)
// -> { data: Page | null, error }

// Enkele pagina ophalen op id (beheer)
export async function fetchPageById(id)
// -> { data: Page | null, error }

// Pagina aanmaken
export async function createPage({ title, slug, content, published_at, expires_at, og_title, og_description, og_image_url })
// -> { data: Page, error }

// Pagina bijwerken
export async function updatePage(id, updates)
// -> { data: Page, error }

// Pagina verwijderen
export async function deletePage(id)
// -> { data, error }

// Afbeelding uploaden naar Supabase Storage
export async function uploadPageImage(file)
// -> { url: string, error }
// Upload naar `page-images/{timestamp}-{filename}`, retourneer publieke URL

// Afbeelding verwijderen
export async function deletePageImage(path)
// -> { data, error }
```

### UI/UX

#### Publieke route: `#/pagina/:slug`

- Component: `ContentPage.jsx`
- Haalt pagina op via `fetchPageBySlug(slug)`
- Toont titel als `<h1>`, publicatiedatum, en content als gerenderde HTML
- Styling van de HTML-content via Tailwind `prose` class (`@tailwindcss/typography` plugin)
- Loading state: skeleton
- 404 state: "Pagina niet gevonden" met link naar homepage
- Verlopen state: pagina niet tonen, redirect naar homepage

#### Beheerroute: `#/beheer/content`

- Component: `ContentBeheerPage.jsx`
- Lijst van alle pagina's als tabel: titel (link naar edit), slug, publicatiedatum, status-badge, gekoppelde menuitems (fase 2: toon "-" tot dan)
- Pagina's zonder menuitem: oranje waarschuwingslabel "Niet in menu"
- "Nieuwe pagina" knop bovenaan
- Verwijderen via confirm-dialog

#### Beheerroute: `#/beheer/content/:id`

- Component: `ContentEditPage.jsx`
- Formulier: titel (text input), slug (text input, auto-gegenereerd uit titel bij nieuw), publicatiedatum (date picker), vervaldatum (optioneel date picker)
- TipTap editor voor content
- Toolbar boven editor: Bold, Italic, Underline, H2, H3, Bullet list, Ordered list, Link, Afbeelding uploaden, YouTube embed
- Afbeelding upload: opent file picker, uploadt naar Supabase Storage, voegt `<img>` in
- YouTube embed: modal met URL-invoer, voegt embed in
- OG-velden (inklapbare sectie): og_title, og_description, og_image_url
- Opslaan knop, Annuleren knop
- Waarschuwing als pagina niet in menu zit

#### Beheer Dashboard integratie

Voeg een tegel toe aan `BeheerDashboardPage.jsx`:
- Titel: "Pagina's"
- Beschrijving: "Contentpagina's beheren"
- Link: `/beheer/content`

### Routing (toevoegingen aan `App.jsx`)

```jsx
// Publiek
<Route path="pagina/:slug" element={<ContentPage />} />

// Beheer (onder bestaande <Route path="beheer" ...>)
<Route path="content" element={<ContentBeheerPage />} />
<Route path="content/nieuw" element={<ContentEditPage />} />
<Route path="content/:id" element={<ContentEditPage />} />
```

### OG tags / WhatsApp preview

Het huidige systeem (`scripts/generate-og-html.mjs`) genereert statische HTML-bestanden per pagina bij build time. Voor dynamische contentpagina's werkt dit niet direct.

**Aanpak voor fase 1:**
- Voeg een `og_title`, `og_description`, en `og_image_url` veld toe aan de `pages` tabel
- Bij het delen van een link (`https://thewally.github.io/vvz-toolbox/#/pagina/mijn-slug`) haalt WhatsApp de root `index.html` op -- de hash wordt genegeerd door crawlers
- **Pragmatische oplossing**: breid `generate-og-html.mjs` uit met een build-time stap die Supabase queried en voor elke pagina een statische HTML genereert in `dist/pagina/<slug>/index.html`. Dit vereist dat de build-pipeline Supabase-credentials heeft (die al als GitHub Secrets bestaan).
- Alternatief: een Supabase Edge Function die als redirect-service werkt, maar dat is complexer.

**Beperking**: OG tags worden pas bijgewerkt na een nieuwe deploy. Dit is acceptabel voor een clubwebsite.

### Dependencies toe te voegen

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-youtube @tiptap/extension-link @tiptap/extension-underline @tiptap/pm
npm install -D @tailwindcss/typography
```

### Implementatieplan Fase 1

| # | Taak | Grootte | Afhankelijkheid |
|---|------|---------|-----------------|
| 1.1 | SQL: `pages` tabel + RLS + Storage bucket aanmaken | S | - |
| 1.2 | `@tailwindcss/typography` plugin toevoegen aan Tailwind config | S | - |
| 1.3 | TipTap packages installeren | S | - |
| 1.4 | `src/services/pages.js` implementeren | M | 1.1 |
| 1.5 | `ContentPage.jsx` (publieke weergave) | M | 1.4 |
| 1.6 | TipTap editor component (`src/components/TipTapEditor.jsx`) | L | 1.3 |
| 1.7 | `ContentEditPage.jsx` (beheer: aanmaken/wijzigen) | L | 1.4, 1.6 |
| 1.8 | `ContentBeheerPage.jsx` (beheer: lijst) | M | 1.4 |
| 1.9 | Routes toevoegen aan `App.jsx` | S | 1.5, 1.7, 1.8 |
| 1.10 | Tegel toevoegen aan `BeheerDashboardPage.jsx` | S | 1.9 |
| 1.11 | OG-generatie uitbreiden in build script | M | 1.4 |

---

## Fase 2: Menubeheer

### Functionele eisen (must-have)

- Beheerder kan de menustructuur aanpassen via een beheerscherm
- Ondersteunde menuitem-typen:
  - **Verzamelitem**: dropdown-groep (bijv. "Wedstrijdinformatie"), geen eigen link
  - **Sub-verzamelitem**: geneste dropdown binnen een verzamelitem (1 niveau diep)
  - **Link naar contentpagina**: verwijst naar een `pages` record
  - **Link naar tool**: verwijst naar een hardcoded route (bijv. `/trainingsschema`, `/wedstrijden/programma`)
  - **Externe link**: verwijst naar een externe URL (opent in nieuw tabblad)
- Maximaal 2 niveaus diep: verzamelitem > sub-verzamelitem > items. Geen diepere nesting.
- Volgorde is instelbaar (drag-and-drop of up/down knoppen)
- Bij verwijderen van een menuitem dat kinderen heeft: waarschuwing dat kinderen ook verwijderd worden
- Hardcoded fallback: als de database niet bereikbaar is, gebruikt TopNav de huidige `NAV_SECTIONS` uit `navigation.js`

### Functionele eisen (nice-to-have)

- Drag-and-drop volgorde
- Preview van het menu in het beheerscherm
- Iconen per menuitem

### Datamodel

#### Tabel: `menu_items`

```sql
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('group', 'page', 'tool', 'external')),
  -- Voor type 'page': verwijzing naar pages tabel
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  -- Voor type 'tool': de hardcoded route
  tool_route TEXT,
  -- Voor type 'external': de URL
  external_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_menu_items_parent ON menu_items (parent_id, position);

-- RLS
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Iedereen kan zichtbare menuitems lezen"
  ON menu_items FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Beheerders kunnen alles lezen"
  ON menu_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Beheerders kunnen menuitems aanmaken"
  ON menu_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Beheerders kunnen menuitems wijzigen"
  ON menu_items FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Beheerders kunnen menuitems verwijderen"
  ON menu_items FOR DELETE
  TO authenticated
  USING (true);
```

#### Constraint: maximaal 2 niveaus

Afdwingen via applicatielogica (niet SQL): bij opslaan controleren dat `parent_id` niet verwijst naar een item dat zelf al een `parent_id` heeft.

### Tabel: `quick_links`

Quick Links zijn een aparte tabel omdat ze een platte lijst zijn (geen nesting) en apart beheerd worden.

```sql
CREATE TABLE quick_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('page', 'tool', 'external')),
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  tool_route TEXT,
  external_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quick_links_position ON quick_links (position);

-- RLS (zelfde patroon als menu_items)
ALTER TABLE quick_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Iedereen kan zichtbare quick links lezen"
  ON quick_links FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Beheerders kunnen alles lezen"
  ON quick_links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Beheerders CRUD"
  ON quick_links FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

### Service layer: `src/services/menu.js`

```js
// Menu ophalen (publiek, genest structuur opbouwen)
export async function fetchMenu()
// -> { data: MenuItem[], error }
// Haalt alle menu_items op, bouwt boomstructuur op in JS
// Retourneert array van top-level items met children[]

// Quick Links ophalen
export async function fetchQuickLinks()
// -> { data: QuickLink[], error }

// Alle menu items ophalen (plat, voor beheer)
export async function fetchAllMenuItems()
// -> { data: MenuItem[], error }

// Menu item CRUD
export async function createMenuItem({ parent_id, label, type, page_id, tool_route, external_url, position })
export async function updateMenuItem(id, updates)
export async function deleteMenuItem(id)

// Quick Link CRUD
export async function createQuickLink(...)
export async function updateQuickLink(id, updates)
export async function deleteQuickLink(id)

// Volgorde bijwerken (batch)
export async function reorderMenuItems(items)
// -> items: [{ id, position }]
// Gebruikt Promise.all met individual updates

export async function reorderQuickLinks(items)

// Beschikbare tools ophalen (hardcoded lijst)
export function getAvailableTools()
// -> [{ label: 'Trainingsschema', route: '/trainingsschema' }, ...]
// Statische lijst van alle hardcoded routes die als tool geselecteerd kunnen worden
```

### Beschikbare tools (hardcoded lijst)

De beheerder kan uit deze routes kiezen bij type `tool`:

```js
export const AVAILABLE_TOOLS = [
  { label: 'Activiteiten', route: '/activiteiten' },
  { label: 'Trainingsschema', route: '/trainingsschema' },
  { label: 'Veldindeling', route: '/trainingsschema/veldindeling' },
  { label: 'Programma', route: '/wedstrijden/programma' },
  { label: 'Uitslagen', route: '/wedstrijden/uitslagen' },
  { label: 'Afgelastingen', route: '/wedstrijden/afgelastingen' },
  { label: 'Wedstrijdverslagen', route: '/wedstrijden/verslagen' },
  { label: 'Topscorers & Keeperstrofee', route: '/wedstrijden/topscorers' },
  { label: 'Senioren', route: '/teams/senioren' },
  { label: 'Veteranen', route: '/teams/veteranen' },
  { label: 'Junioren', route: '/teams/junioren' },
  { label: 'Pupillen', route: '/teams/pupillen' },
  { label: 'Zaalvoetbal', route: '/teams/zaalvoetbal' },
  { label: 'Sponsors', route: '/sponsors' },
  { label: 'Sponsor worden?', route: '/sponsoring/sponsor-worden' },
  { label: 'Plattegrond', route: '/plattegrond' },
  { label: 'Huisstijl', route: '/huistijl' },
  { label: 'Historie', route: '/club/historie' },
  { label: 'Ereleden', route: '/club/ereleden' },
  { label: 'Reglementen', route: '/club/reglementen' },
  { label: 'Lid worden?', route: '/lid-worden' },
  { label: 'Contributie', route: '/lidmaatschap/contributie' },
  { label: 'Vrijwilliger worden?', route: '/vrijwilliger' },
  { label: 'Contactgegevens', route: '/contact/gegevens' },
  { label: 'Locatie & Routebeschrijving', route: '/contact/locatie' },
  { label: 'Wie doet wat?', route: '/contact/wie-doet-wat' },
  { label: 'Techniektrainingen', route: '/techniektrainingen' },
  { label: 'Nieuws', route: '/nieuws' },
]
```

### UI/UX

#### TopNav aanpassing

De huidige `TopNav.jsx` importeert `NAV_SECTIONS` en `QUICK_LINKS` uit `navigation.js`. De aanpassing:

1. Bij mount: `fetchMenu()` en `fetchQuickLinks()` aanroepen
2. Resultaat opslaan in state
3. Als fetch faalt (error of lege data): fallback naar `NAV_SECTIONS` / `QUICK_LINKS` uit `navigation.js`
4. De bestaande render-logica hergebruiken maar met database-data

**Uitbreiding voor sub-verzamelitems**: de huidige accordion ondersteunt 1 niveau (verzamelitem > children). Voor sub-verzamelitems (2 niveaus) moet de render-logica uitgebreid worden met een genest accordion-patroon:

```
VERZAMELITEM v
  Sub-verzamelitem v      <- klikbaar, opent geneste lijst
    Item 1                <- link
    Item 2                <- link
  Sub-verzamelitem v
    Item 3
  Item 4                  <- direct link onder verzamelitem
```

Op desktop (sm+): sub-verzamelitems tonen als aparte groep met een subtiel inspring of divider.
Op mobiel: genest accordion met extra inspring (pl-4 voor niveau 2).

#### Menubeheer: `#/beheer/menu`

- Component: `MenuBeheerPage.jsx`
- Twee tabbladen: **Hoofdmenu** | **Quick Links**

**Tab: Hoofdmenu**
- Boomweergave van het menu als geindenteerde lijst
- Per item: label, type-badge (groep/pagina/tool/extern), drag-handle of up/down knoppen
- "Item toevoegen" knop bij elk niveau
- Klik op item opent edit-modal/inline-form
- Edit-formulier per type:
  - Groep: alleen label
  - Pagina: label + pagina-selectie (dropdown van alle pages)
  - Tool: label + tool-selectie (dropdown van AVAILABLE_TOOLS)
  - Extern: label + URL
- Verwijder-knop met bevestiging

**Tab: Quick Links**
- Platte lijst, zelfde interactie als hoofdmenu maar zonder nesting
- Zelfde type-opties (behalve group)

#### Beheer Dashboard

Voeg tegel toe:
- Titel: "Menu"
- Beschrijving: "Menustructuur en Quick Links beheren"
- Link: `/beheer/menu`

### Routing (toevoegingen)

```jsx
// Beheer
<Route path="menu" element={<MenuBeheerPage />} />
```

### Implementatieplan Fase 2

| # | Taak | Grootte | Afhankelijkheid |
|---|------|---------|-----------------|
| 2.1 | SQL: `menu_items` + `quick_links` tabellen + RLS | S | - |
| 2.2 | Seed data: huidige NAV_SECTIONS en QUICK_LINKS als records in de database | M | 2.1 |
| 2.3 | `src/services/menu.js` implementeren | M | 2.1 |
| 2.4 | TopNav aanpassen: data uit database laden met fallback | M | 2.3 |
| 2.5 | TopNav: sub-verzamelitem rendering (2 niveaus) | M | 2.4 |
| 2.6 | `MenuBeheerPage.jsx` - hoofdmenu tab | L | 2.3 |
| 2.7 | `MenuBeheerPage.jsx` - quick links tab | M | 2.3 |
| 2.8 | Routes + beheer dashboard tegel | S | 2.6, 2.7 |
| 2.9 | `ContentBeheerPage.jsx` bijwerken: toon gekoppelde menuitems per pagina | S | 2.3 |

---

## Fase 3: Quick Links & HomePage integratie

### Functionele eisen

- De Quick Links in de homepage-grid worden ook uit de database gelezen
- Beheerder kan Quick Links koppelen aan een icoon (selectie uit voorgedefinieerde set)
- Beheerder kan een korte beschrijving opgeven per Quick Link (voor de homepage kaartjes)
- Fallback: als database niet bereikbaar, toon hardcoded kaartjes

### Datamodel aanpassing

Voeg kolommen toe aan `quick_links`:

```sql
ALTER TABLE quick_links
  ADD COLUMN description TEXT,
  ADD COLUMN icon TEXT, -- key uit voorgedefinieerde icon-set
  ADD COLUMN show_on_home BOOLEAN NOT NULL DEFAULT false;
```

### Voorgedefinieerde iconen

Een mapping van icon-keys naar SVG-componenten, bijv.:

```js
export const QUICK_LINK_ICONS = {
  calendar: <CalendarIcon />,
  football: <FootballIcon />,
  clipboard: <ClipboardIcon />,
  users: <UsersIcon />,
  map: <MapIcon />,
  star: <StarIcon />,
  phone: <PhoneIcon />,
  paint: <PaintIcon />,
  // etc.
}
```

De beheerder kiest uit deze set in het formulier via een visuele icon-picker.

### UI/UX aanpassingen

- `HomePage.jsx`: ophalen van quick_links met `show_on_home = true`, renderen als kaartjes
- Fallback naar huidige hardcoded kaartjes als fetch faalt
- Quick Links beheer: extra velden (beschrijving, icoon, "toon op homepage" checkbox)

### Implementatieplan Fase 3

| # | Taak | Grootte | Afhankelijkheid |
|---|------|---------|-----------------|
| 3.1 | SQL: kolommen toevoegen aan `quick_links` | S | Fase 2 |
| 3.2 | Icon-componentenset definiëren | M | - |
| 3.3 | Quick Links beheer uitbreiden (description, icon picker, show_on_home) | M | 3.1, 3.2 |
| 3.4 | `HomePage.jsx` aanpassen: database-driven kaartjes met fallback | M | 3.1 |

---

## Edge cases & error handling

| Scenario | Gedrag |
|----------|--------|
| Database niet bereikbaar bij menu-laden | Fallback naar hardcoded `NAV_SECTIONS` / `QUICK_LINKS` |
| Pagina met verlopen `expires_at` | Niet zichtbaar voor bezoekers, wel in beheer (met "verlopen" badge) |
| Slug conflict bij pagina aanmaken | Toon foutmelding "Deze slug is al in gebruik" |
| Menuitem verwijst naar verwijderde pagina | `page_id` wordt `NULL` door `ON DELETE SET NULL`; toon in beheer als "pagina verwijderd" waarschuwing; verberg in publiek menu |
| Menuitem verwijderd dat kinderen heeft | `ON DELETE CASCADE` verwijdert kinderen; bevestigingsdialog waarschuwt |
| Lege content bij pagina | Toon pagina met alleen titel |
| Afbeelding upload mislukt | Toon foutmelding in editor, afbeelding wordt niet ingevoegd |
| Slug bevat ongeldige tekens | Automatisch sanitizen: lowercase, spaties naar hyphens, speciale tekens verwijderen |

## Bestaande code impact

| Bestand | Wijziging |
|---------|-----------|
| `src/lib/navigation.js` | Blijft bestaan als fallback-bron. Geen wijzigingen. |
| `src/components/TopNav.jsx` | Database-fetch toevoegen, fallback logic, 2-niveau rendering |
| `src/pages/HomePage.jsx` | Database-driven kaartjes (fase 3) |
| `src/pages/BeheerDashboardPage.jsx` | Tegels toevoegen voor "Pagina's" en "Menu" |
| `src/App.jsx` | Routes toevoegen |
| `tailwind.config.js` | `@tailwindcss/typography` plugin toevoegen |
| `package.json` | TipTap + typography dependencies |
| `scripts/generate-og-html.mjs` | Uitbreiden voor dynamische pagina's |

## Out of scope

- Meertaligheid (alles is Nederlands)
- WYSIWYG pagina-builder (block editor a la WordPress Gutenberg) -- TipTap rich text is voldoende
- Gebruikersrollen / meerdere beheerders met verschillende rechten (wordt apart opgepakt via rolbeheer spec)
- Volledige CMS met templates, categorieën, tags
- Commentaren op pagina's
- RSS feed
- Automatische slug-redirects bij hernoeming
- Offline editing / autosave (kan als nice-to-have later)
- Drag-and-drop in menubeheer (fase 2 gebruikt up/down knoppen; drag-and-drop kan later)
- Volledige SEO-optimalisatie (beperkt tot OG-tags voor WhatsApp)
