# Feature Spec: Contact-sectie

## 1. Feature Understanding

De Contact-sectie bevat drie publieke pagina's onder `/contact/`:

| Pagina | Huidige route | Huidige databron |
|---|---|---|
| Contactgegevens | `/contact/gegevens` | SportLink API (`fetchClubGegevens`) |
| Locatie & Routebeschrijving | `/contact/locatie` | SportLink API (`fetchClubGegevens`) |
| Wie doet wat? | `/contact/wie-doet-wat` | Niet geimplementeerd (PlaceholderPage) |

**Probleem**: de contactgegevens en locatie-informatie komen nu uit de SportLink API, wat kwetsbaar is (externe afhankelijkheid, geen controle over data) en niet alle gewenste velden bevat. "Wie doet wat?" is nog niet gebouwd.

**Oplossing**: alle contactdata verplaatsen naar Supabase-tabellen die via beheerpagina's te onderhouden zijn. SportLink-afhankelijkheden verwijderen uit deze pagina's.

### Gebruikers
- **Publieke bezoeker**: bekijkt contactgegevens, locatie, commissie-overzicht
- **Beheerder** (ingelogd): beheert alle contactdata via `/beheer/contact/*`

### Aannames
- Er is maar een clubadres en een bezoekadres (geen meerdere locaties)
- Google Maps embed via `maps.google.com/maps?q=...&output=embed` blijft werken; alternatief kan een opgeslagen embed-URL zijn
- Commissies in "Wie doet wat?" zijn vrij in te delen door de beheerder (geen vaste lijst)

## 2. Functionele Eisen

### Must-have (MVP)

#### Contactgegevens (`/contact/gegevens`)
1. Publieke weergave toont: clubnaam, postadres (straat + huisnummer + postcode + plaats), telefoonnummer, e-mailadres, rekeningnummer (IBAN), website, KVK-nummer
2. Optioneel: social media links (Facebook, Instagram, Twitter/X, YouTube)
3. Lege velden worden niet getoond
4. Beheerpagina `/beheer/contact/gegevens`: formulier met alle velden, opslaan-knop

#### Locatie & Routebeschrijving (`/contact/locatie`)
1. Publieke weergave toont: naam terrein, bezoekadres (straat + huisnummer), postcode, woonplaats
2. Google Maps kaartje via embed (iframe), gebaseerd op opgeslagen `google_maps_query` of bezoekadres
3. Beheerpagina `/beheer/contact/locatie`: formulier voor naam terrein, straat, huisnummer, postcode, woonplaats, Google Maps zoekterm (optioneel, anders wordt adres gebruikt)

#### Wie doet wat? (`/contact/wie-doet-wat`)
1. Publieke weergave: commissies als secties, per commissie de leden met naam, telefoonnummer, e-mailadres
2. Commissies gesorteerd op `sort_order`; personen binnen commissie gesorteerd op `sort_order`
3. Lege telefoon/email niet getoond; als alles leeg is, alleen naam
4. Beheerpagina `/beheer/contact/wie-doet-wat`:
   - CRUD voor commissies (naam, sorteervolgorde)
   - CRUD voor commissieleden (naam, telefoon, email, sorteervolgorde)
   - Drag-and-drop of pijltjes voor sortering (nice-to-have; MVP: numeriek veld)

#### Beheer-integratie
1. Nieuwe tegel "Contact" op `/beheer` dashboard met drie acties: Gegevens, Locatie, Wie doet wat?
2. Alle `/beheer/contact/*` routes beschermd via `ProtectedRoute` (al geregeld door nesting onder `/beheer`)

#### SportLink opruimen
1. `fetchClubGegevens` import verwijderen uit `ContactgegevensPage.jsx` en `LocatieRoutebeschrijvingPage.jsx`
2. `fetchClubGegevens` functie in `sportlink.js` kan blijven bestaan (mogelijk gebruikt elders), maar wordt niet meer aangeroepen vanuit contact-pagina's

### Nice-to-have
- Secretaris naam als apart veld bij contactgegevens
- Foto's bij commissieleden
- Drag-and-drop sortering bij wie doet wat

### Edge cases
- **Geen data opgeslagen**: contactpagina toont melding "Geen contactgegevens beschikbaar"
- **Locatie zonder Google Maps query**: gebruik bezoekadres als zoekterm
- **Commissie zonder leden**: toon commissienaam met tekst "Geen leden"
- **Geen commissies**: toon melding "Geen commissies beschikbaar"

## 3. Data Model

### Tabel: `club_contact_info`

Enkele rij met alle clubgegevens (key: `id = 1`, afgedwongen via check constraint).

```sql
CREATE TABLE club_contact_info (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  clubnaam text,
  -- Postadres
  post_straat text,
  post_huisnummer text,
  post_postcode text,
  post_plaats text,
  -- Contact
  telefoonnummer text,
  email text,
  website text,
  -- Financieel
  iban text,
  kvk_nummer text,
  -- Social media
  facebook_url text,
  instagram_url text,
  twitter_handle text,
  youtube_url text,
  -- Bezoekadres / locatie
  terrein_naam text,
  bezoek_straat text,
  bezoek_huisnummer text,
  bezoek_postcode text,
  bezoek_plaats text,
  google_maps_query text,
  -- Meta
  updated_at timestamptz DEFAULT now()
);

-- Seed met lege rij zodat er altijd precies 1 rij is
INSERT INTO club_contact_info (id) VALUES (1);

-- RLS
ALTER TABLE club_contact_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Iedereen kan contactinfo lezen"
  ON club_contact_info FOR SELECT
  USING (true);

CREATE POLICY "Alleen ingelogde gebruikers kunnen contactinfo wijzigen"
  ON club_contact_info FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Geen INSERT/DELETE policies: er is altijd precies 1 rij
```

### Tabel: `committees`

```sql
CREATE TABLE committees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE committees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Iedereen kan commissies lezen"
  ON committees FOR SELECT
  USING (true);

CREATE POLICY "Ingelogd: insert commissies"
  ON committees FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Ingelogd: update commissies"
  ON committees FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Ingelogd: delete commissies"
  ON committees FOR DELETE
  USING (auth.uid() IS NOT NULL);
```

### Tabel: `committee_members`

```sql
CREATE TABLE committee_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id uuid NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE committee_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Iedereen kan leden lezen"
  ON committee_members FOR SELECT
  USING (true);

CREATE POLICY "Ingelogd: insert leden"
  ON committee_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Ingelogd: update leden"
  ON committee_members FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Ingelogd: delete leden"
  ON committee_members FOR DELETE
  USING (auth.uid() IS NOT NULL);
```

## 4. Service Layer

### `src/services/clubContact.js`

```js
import { supabase } from '../lib/supabaseClient'

// Haal de enkele rij club contactinfo op
export async function fetchClubContactInfo() {
  const { data, error } = await supabase
    .from('club_contact_info')
    .select('*')
    .eq('id', 1)
    .single()
  return { data, error }
}

// Update club contactinfo (altijd id=1)
export async function updateClubContactInfo(fields) {
  const { data, error } = await supabase
    .from('club_contact_info')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single()
  return { data, error }
}
```

### `src/services/committees.js`

```js
import { supabase } from '../lib/supabaseClient'

export async function fetchCommittees() {
  const { data, error } = await supabase
    .from('committees')
    .select('*, committee_members(*)')
    .order('sort_order')
    .order('sort_order', { foreignTable: 'committee_members' })
  return { data, error }
}

export async function createCommittee({ name, sort_order }) {
  const { data, error } = await supabase
    .from('committees')
    .insert({ name, sort_order })
    .select()
    .single()
  return { data, error }
}

export async function updateCommittee(id, fields) {
  const { data, error } = await supabase
    .from('committees')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteCommittee(id) {
  const { error } = await supabase
    .from('committees')
    .delete()
    .eq('id', id)
  return { error }
}

export async function createCommitteeMember({ committee_id, name, phone, email, sort_order }) {
  const { data, error } = await supabase
    .from('committee_members')
    .insert({ committee_id, name, phone, email, sort_order })
    .select()
    .single()
  return { data, error }
}

export async function updateCommitteeMember(id, fields) {
  const { data, error } = await supabase
    .from('committee_members')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteCommitteeMember(id) {
  const { error } = await supabase
    .from('committee_members')
    .delete()
    .eq('id', id)
  return { error }
}
```

## 5. UI/UX Design

### Routing

```
/contact/gegevens              → ContactgegevensPage (publiek)
/contact/locatie               → LocatieRoutebeschrijvingPage (publiek)
/contact/wie-doet-wat          → WieDoetWatPage (publiek)
/beheer/contact/gegevens       → ContactGegevensBeheerPage (beschermd)
/beheer/contact/locatie        → ContactLocatieBeheerPage (beschermd)
/beheer/contact/wie-doet-wat   → WieDoetWatBeheerPage (beschermd)
```

Geen aparte `ContactLayout` nodig; de contact-routes staan al als losse routes onder `/contact/*` in `App.jsx`. De navigatie in `navigation.js` bevat al de juiste links.

### Nieuwe/gewijzigde componenten

| Component | Type | Beschrijving |
|---|---|---|
| `ContactgegevensPage` | Wijzigen | Data uit `club_contact_info` i.p.v. SportLink |
| `LocatieRoutebeschrijvingPage` | Wijzigen | Data uit `club_contact_info` i.p.v. SportLink |
| `WieDoetWatPage` | Nieuw | Commissies + leden weergeven |
| `ContactGegevensBeheerPage` | Nieuw | Formulier voor contactgegevens + locatie *of* apart |
| `ContactLocatieBeheerPage` | Nieuw | Formulier voor locatiegegevens |
| `WieDoetWatBeheerPage` | Nieuw | CRUD commissies + leden |

### Publieke pagina's

**ContactgegevensPage**: behoud huidige layout (witte kaart, dl/dt/dd grid), maar data uit `fetchClubContactInfo()`. Zelfde velden als nu: clubnaam, postadres, telefoon, email, website, KVK, social media. Zelfde styling met `text-vvz-green` links.

**LocatieRoutebeschrijvingPage**: behoud huidige layout (iframe + adreskaart). `google_maps_query` uit database gebruiken als embed-parameter; als leeg, construeer uit bezoekadres. Fallback: "Sportpark Zonnegloren, Soest".

**WieDoetWatPage**:
- Per commissie een sectie met heading (`h2`, commissienaam)
- Per lid: naam, telefoon (als `tel:` link), email (als `mailto:` link)
- Weergave als kaarten of als lijst vergelijkbaar met contactgegevens-layout
- Empty state: "Geen commissies beschikbaar"

### Beheerpagina's

**ContactGegevensBeheerPage** (`/beheer/contact/gegevens`):
- Formulier met alle velden uit `club_contact_info` die postadres en contact betreffen
- Velden: clubnaam, post_straat, post_huisnummer, post_postcode, post_plaats, telefoonnummer, email, website, iban, kvk_nummer, facebook_url, instagram_url, twitter_handle, youtube_url
- Eén "Opslaan" knop onderaan
- Succes/fout-melding na opslaan
- Load bestaande data bij mount

**ContactLocatieBeheerPage** (`/beheer/contact/locatie`):
- Velden: terrein_naam, bezoek_straat, bezoek_huisnummer, bezoek_postcode, bezoek_plaats, google_maps_query
- Zelfde pattern als ContactGegevensBeheerPage

**WieDoetWatBeheerPage** (`/beheer/contact/wie-doet-wat`):
- Linkerpaneel of bovenaan: lijst commissies met "Toevoegen" knop
- Per commissie: naam + sorteervolgorde bewerken, verwijderen (met bevestiging)
- Per geselecteerde/uitgeklapte commissie: ledenlijst met "Lid toevoegen" knop
- Per lid: inline of modal bewerken (naam, telefoon, email, sorteervolgorde), verwijderen
- Pattern: vergelijkbaar met `SponsoringBeheerPage` of `ActiviteitenBeheerPage`

### Beheer Dashboard integratie

Voeg een tegel toe aan `TILES` in `BeheerDashboardPage.jsx`:

```js
{
  title: 'Contact',
  description: 'Contactgegevens, locatie en commissies beheren',
  multiAction: true,
  actions: [
    { label: 'Gegevens', to: '/beheer/contact/gegevens' },
    { label: 'Locatie', to: '/beheer/contact/locatie' },
    { label: 'Wie doet wat?', to: '/beheer/contact/wie-doet-wat' },
  ],
  icon: (/* telefoon of adresboek SVG icon */),
}
```

### App.jsx route-toevoegingen

Onder de bestaande `/beheer` route:
```jsx
<Route path="contact">
  <Route path="gegevens" element={<ContactGegevensBeheerPage />} />
  <Route path="locatie" element={<ContactLocatieBeheerPage />} />
  <Route path="wie-doet-wat" element={<WieDoetWatBeheerPage />} />
</Route>
```

Bestaande publieke `/contact/wie-doet-wat` route wijzigen van `PlaceholderPage` naar `WieDoetWatPage`.

## 6. Implementation Plan

| # | Taak | Afhankelijk van | Grootte |
|---|---|---|---|
| 1 | SQL: maak tabellen `club_contact_info`, `committees`, `committee_members` met RLS | - | S |
| 2 | Service: `src/services/clubContact.js` | 1 | S |
| 3 | Service: `src/services/committees.js` | 1 | S |
| 4 | Wijzig `ContactgegevensPage`: data uit Supabase, verwijder SportLink import | 2 | S |
| 5 | Wijzig `LocatieRoutebeschrijvingPage`: data uit Supabase, verwijder SportLink import | 2 | S |
| 6 | Nieuw: `WieDoetWatPage` | 3 | M |
| 7 | Nieuw: `ContactGegevensBeheerPage` | 2 | M |
| 8 | Nieuw: `ContactLocatieBeheerPage` | 2 | M |
| 9 | Nieuw: `WieDoetWatBeheerPage` | 3 | L |
| 10 | Routes toevoegen in `App.jsx` | 6-9 | S |
| 11 | Tegel toevoegen aan `BeheerDashboardPage` | 10 | S |
| 12 | Seed data: vul `club_contact_info` met huidige VVZ'49 gegevens | 1 | S |

### Risico's
- Google Maps embed kan door Google gelimiteerd worden (rate limits). Mitigatie: de `google_maps_query` is handmatig in te stellen, dus een exacte embed-URL kan ook opgeslagen worden.
- `fetchClubGegevens` wordt mogelijk nog door andere pagina's gebruikt. Check voor verwijdering.

## 7. Out of Scope

- Verwijderen van `fetchClubGegevens` uit `sportlink.js` (wordt mogelijk elders gebruikt)
- Rolgebaseerde toegang (alle ingelogde gebruikers zijn beheerder)
- Foto's bij commissieleden
- E-mail verstuurformulier ("Neem contact op")
- Automatische synchronisatie met SportLink
- ContactLayout met sub-navigatie (de drie pagina's zijn bereikbaar via het hoofdmenu)
