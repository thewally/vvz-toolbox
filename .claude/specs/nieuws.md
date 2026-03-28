# Feature Spec: Nieuws

## Samenvatting

Nieuwsartikelen die beheerd worden door admins en getoond worden op de hoofdpagina ter vervanging van de huidige tegels. Elk artikel heeft een titel, inleidende tekst en een volledige inhoud met tekst, afbeeldingen en YouTube-video's. Bezoekers klikken door van de hoofdpagina naar het volledige artikel.

De huidige tegels op de homepage (Agenda, Trainingsschema, Wedstrijden, Teams, Plattegrond, Huistijl, Sponsors) worden **volledig vervangen** door nieuws. Alle tools blijven bereikbaar via het navigatiemenu.

**Aanname**: Afbeeldingen worden opgeslagen via Supabase Storage. Er is geen rich-text editor nodig voor MVP; de body wordt opgeslagen als Markdown (of HTML) en gerenderd met een simpele parser.

---

## 1. Functionele eisen

### MVP (must-have)

- Admin kan nieuwsartikelen aanmaken, bewerken en verwijderen via `/nieuws/beheer`
- Elk artikel bevat: titel, slug (auto-generated), inleiding, body (Markdown), publicatiedatum, gepubliceerd-status
- Body ondersteunt: tekst (Markdown), afbeeldingen (URL), YouTube-video's (embed via URL)
- Hoofdpagina en `/nieuws` tonen exact dezelfde view via een gedeeld `NieuwsOverzicht` component: alle gepubliceerde artikelen als kaarten (titel + inleiding + datum), nieuwste eerst
- Kaart linkt door naar `/nieuws/:slug` met het volledige artikel
- Afbeeldingen worden geupload naar Supabase Storage bucket `news-images`
- Alleen gepubliceerde artikelen zijn zichtbaar voor bezoekers (concept-modus via `published` boolean)

### Nice-to-have

- Afbeelding als header/thumbnail bij artikel (cover image)
- Paginering op `/nieuws` overzichtspagina
- Zoekfunctie
- Categorisering / tags
- Social sharing meta tags (og:image, og:title)

---

## 2. Data Model

### Tabel: `news_articles`

```sql
CREATE TABLE news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  intro TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_news_articles_published_at ON news_articles (published_at DESC)
  WHERE published = true;

CREATE INDEX idx_news_articles_slug ON news_articles (slug);
```

### RLS Policies

```sql
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

-- Publiek: alleen gepubliceerde artikelen lezen
CREATE POLICY "Iedereen kan gepubliceerde artikelen lezen"
  ON news_articles FOR SELECT
  USING (published = true);

-- Admin: alles lezen (ook concepten)
CREATE POLICY "Admins kunnen alle artikelen lezen"
  ON news_articles FOR SELECT
  TO authenticated
  USING (true);

-- Admin: aanmaken
CREATE POLICY "Admins kunnen artikelen aanmaken"
  ON news_articles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admin: bewerken
CREATE POLICY "Admins kunnen artikelen bewerken"
  ON news_articles FOR UPDATE
  TO authenticated
  USING (true);

-- Admin: verwijderen
CREATE POLICY "Admins kunnen artikelen verwijderen"
  ON news_articles FOR DELETE
  TO authenticated
  USING (true);
```

### Supabase Storage: bucket `news-images`

```sql
-- Bucket aanmaken (via Supabase dashboard of SQL)
INSERT INTO storage.buckets (id, name, public) VALUES ('news-images', 'news-images', true);

-- Publiek lezen
CREATE POLICY "Iedereen kan nieuwsafbeeldingen lezen"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'news-images');

-- Admin uploaden
CREATE POLICY "Admins kunnen nieuwsafbeeldingen uploaden"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'news-images');

-- Admin verwijderen
CREATE POLICY "Admins kunnen nieuwsafbeeldingen verwijderen"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'news-images');
```

---

## 3. Service Layer

### `src/services/newsArticles.js`

```js
import { supabase } from '../lib/supabaseClient'

// Publiek: gepubliceerde artikelen ophalen (nieuwste eerst)
export async function fetchPublishedArticles({ limit } = {}) {
  let query = supabase
    .from('news_articles')
    .select('id, title, slug, intro, cover_image_url, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false })
  if (limit) query = query.limit(limit)
  const { data, error } = await query
  return { data, error }
}

// Publiek: enkel artikel op slug
export async function fetchArticleBySlug(slug) {
  const { data, error } = await supabase
    .from('news_articles')
    .select('*')
    .eq('slug', slug)
    .single()
  return { data, error }
}

// Admin: alle artikelen ophalen (incl. concepten)
export async function fetchAllArticles() {
  const { data, error } = await supabase
    .from('news_articles')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}

// Admin: artikel aanmaken
export async function createArticle(article) {
  const { data, error } = await supabase
    .from('news_articles')
    .insert(article)
    .select()
    .single()
  return { data, error }
}

// Admin: artikel bijwerken
export async function updateArticle(id, updates) {
  const { data, error } = await supabase
    .from('news_articles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

// Admin: artikel verwijderen
export async function deleteArticle(id) {
  const { data, error } = await supabase
    .from('news_articles')
    .delete()
    .eq('id', id)
  return { data, error }
}

// Slug genereren vanuit titel
export function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Afbeelding uploaden naar Supabase Storage
export async function uploadNewsImage(file) {
  const ext = file.name.split('.').pop()
  const path = `${crypto.randomUUID()}.${ext}`
  const { data, error } = await supabase.storage
    .from('news-images')
    .upload(path, file)
  if (error) return { url: null, error }
  const { data: { publicUrl } } = supabase.storage
    .from('news-images')
    .getPublicUrl(path)
  return { url: publicUrl, error: null }
}
```

---

## 4. UI/UX Design

### 4.1 Gedeeld component: `NieuwsOverzicht.jsx`

De homepage (`/`) en het nieuwsoverzicht (`/nieuws`) tonen **exact hetzelfde component**: `NieuwsOverzicht`. Later kan de homepage uitgebreid worden met extra secties, maar voor MVP zijn beide views identiek.

**Locatie**: `src/components/NieuwsOverzicht.jsx`

**Gedrag**:
- Haalt alle gepubliceerde artikelen op via `fetchPublishedArticles()` (geen limit)
- Toont artikelen als kaarten in een responsive grid (1 kolom mobiel, 2 kolommen tablet, 3 kolommen desktop)

**Nieuwskaart** (per artikel):
- Cover image (als beschikbaar, anders weggelaten)
- Titel (h3, bold)
- Publicatiedatum (klein, grijs)
- Inleidende tekst (max 2-3 regels, text-ellipsis)
- Hele kaart klikbaar, linkt naar `/nieuws/:slug`
- Styling: zelfde rounded-2xl shadow-md pattern als bestaande kaarten

**Lege staat**: als er geen gepubliceerde artikelen zijn, toon een vriendelijke melding zoals "Er zijn nog geen nieuwsberichten." Voor admins (ingelogd) kan een link naar `/nieuws/beheer` getoond worden met de tekst "Voeg het eerste nieuwsbericht toe."

### 4.2 Hoofdpagina (`HomePage.jsx`) -- aanpassen

De huidige tegels worden **volledig verwijderd**. De homepage rendert alleen `<NieuwsOverzicht />`.

```jsx
import NieuwsOverzicht from '../components/NieuwsOverzicht'

export default function HomePage() {
  return <NieuwsOverzicht />
}
```

### 4.3 Nieuwsoverzicht (`/nieuws`) -- `NieuwsPage.jsx`

Rendert hetzelfde component als de homepage:

```jsx
import NieuwsOverzicht from '../components/NieuwsOverzicht'

export default function NieuwsPage() {
  return <NieuwsOverzicht />
}
```

Beide pagina's zijn voor nu identiek. Later kan `HomePage` uitgebreid worden met extra secties (bijv. aankomende wedstrijden, agenda-highlights) terwijl `NieuwsPage` puur nieuwsoverzicht blijft.

### 4.4 Artikelpagina (`/nieuws/:slug`) -- `NieuwsArtikelPage.jsx`

- Titel (h1)
- Publicatiedatum
- Cover image (als beschikbaar, full-width)
- Body gerenderd als Markdown
  - Afbeeldingen: `![alt](url)` --> `<img>`
  - YouTube: `![youtube](https://youtube.com/watch?v=ID)` --> embedded iframe
  - Gebruik een lichtgewicht Markdown renderer (bijv. `react-markdown` of zelfgebouwde simpele parser)
- Terug-link naar `/nieuws`

**YouTube embed detectie**: URLs die matchen op `youtube.com/watch?v=` of `youtu.be/` worden omgezet naar een responsive iframe embed.

### 4.5 Beheerscherm (`/nieuws/beheer`) -- `NieuwsBeheerPage.jsx`

Volgt hetzelfde patroon als `AgendaBeheerPage.jsx`:

- **Artikellijst** als tabel: titel, status (gepubliceerd/concept), datum, acties (bewerken/verwijderen)
- **Toevoegen-knop** bovenaan
- **Formulier** (inline, zelfde pattern als Agenda):
  - Titel (text input, verplicht)
  - Slug (auto-generated, bewerkbaar)
  - Inleiding (textarea, verplicht)
  - Body (textarea, Markdown)
  - Cover afbeelding (file upload naar Supabase Storage)
  - Afbeelding invoegen in body (upload knop die Markdown image-syntax invoegt)
  - YouTube URL invoegen (knop die embed-syntax invoegt)
  - Gepubliceerd (checkbox)
  - Publicatiedatum (date input, default vandaag)
- **Verwijderbevestiging** inline (zelfde pattern als Agenda)

### 4.6 Navigatie

- `/nieuws` -- geen eigen Layout nodig, maar wel een NieuwsLayout met sub-nav "Overzicht | Beheer" (zelfde pattern als AgendaLayout)
- Beheerscherm alleen zichtbaar na login (ProtectedRoute)
- Nieuws krijgt geen eigen tegel op de homepage (het IS de homepage-content)

---

## 5. Routing

Toevoegen aan `App.jsx`:

```jsx
import NieuwsLayout from './components/NieuwsLayout'
import NieuwsPage from './pages/NieuwsPage'
import NieuwsArtikelPage from './pages/NieuwsArtikelPage'
import NieuwsBeheerPage from './pages/NieuwsBeheerPage'

// In Routes:
<Route path="nieuws" element={<NieuwsLayout />}>
  <Route index element={<NieuwsPage />} />
  <Route path="beheer" element={
    <ProtectedRoute>
      <NieuwsBeheerPage />
    </ProtectedRoute>
  } />
  <Route path=":slug" element={<NieuwsArtikelPage />} />
</Route>
```

De bestaande `<Route path="nieuws" element={<PlaceholderPage title="Nieuws" />} />` wordt vervangen.

---

## 6. Implementatieplan

| # | Taak | Complexiteit | Afhankelijkheid |
|---|------|-------------|-----------------|
| 1 | Supabase: tabel `news_articles` aanmaken + RLS policies | S | - |
| 2 | Supabase: storage bucket `news-images` aanmaken + policies | S | - |
| 3 | Service layer: `src/services/newsArticles.js` | S | 1 |
| 4 | `NieuwsLayout.jsx` component (sub-nav Overzicht / Beheer) | S | - |
| 5 | `NieuwsOverzicht.jsx` -- gedeeld component voor nieuwskaarten grid | M | 3 |
| 6 | `NieuwsBeheerPage.jsx` -- CRUD formulier + artikellijst | L | 1, 2, 3 |
| 7 | `NieuwsArtikelPage.jsx` -- artikel weergave met Markdown rendering | M | 3 |
| 8 | `NieuwsPage.jsx` -- rendert `NieuwsOverzicht` | S | 5 |
| 9 | `HomePage.jsx` aanpassen -- tegels verwijderen, rendert `NieuwsOverzicht` | S | 5 |
| 10 | Routing in `App.jsx` bijwerken | S | 4, 6, 7, 8 |
| 11 | Markdown rendering met YouTube embed support | M | 7 |
| 12 | Afbeelding upload in beheerformulier | M | 2, 6 |

**Aanbevolen volgorde**: 1+2 (parallel) -> 3 -> 4+5 (parallel) -> 6+7+8+9 (parallel) -> 10 -> 11+12

**Dependency**: `react-markdown` of vergelijkbaar pakket voor Markdown rendering (npm install nodig).

### Risico's

- **Markdown rendering**: Als een externe dependency ongewenst is, kan een simpele zelfgebouwde parser volstaan voor MVP (alleen paragraphs, bold, images, YouTube embeds). Dit beperkt de body-mogelijkheden maar vermijdt een extra dependency.
- **Slug uniciteit**: Bij het opslaan moet gecontroleerd worden of de slug uniek is. De UNIQUE constraint vangt dit op database-niveau, maar de UI moet een duidelijke foutmelding geven.

---

## 7. Out of Scope

- Rich text editor (WYSIWYG) -- MVP gebruikt een textarea met Markdown
- Reacties / comments op artikelen
- Auteur-tracking (geen koppeling met users tabel)
- RSS feed
- Scheduled publishing (publiceren op toekomstig tijdstip)
- SEO meta tags (og:image etc.) -- HashRouter maakt dit sowieso lastig
- Categorieen / tags
- Zoekfunctionaliteit
- Paginering (eerst kijken of het nodig is bij het aantal artikelen)
