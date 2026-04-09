# Feature Spec: Vrijwilliger Worden

## 1. Feature Overview

Een module waarmee beheerders vrijwilligersvacatures kunnen aanmaken en groeperen, en bezoekers deze publiek kunnen bekijken op `/vrijwilliger`. Vacatures worden gegroepeerd (bijv. "Op het veld", "In de kantine") en kunnen gekoppeld worden aan een contactpersoon uit de bestaande `committee_members`-tabel of aan een vrije contactpersoon.

**Gebruikers:**
- Publieke bezoeker: bekijkt vacatures op `/vrijwilliger`
- Beheerder met rol `vrijwilligers`: beheert vacatures en groepen op `/beheer/vrijwilligers`

## 2. Functionele Eisen

### Must-have (MVP)
- Beheerder kan groepen aanmaken, bewerken en verwijderen
- Beheerder kan vacatures aanmaken, bewerken en verwijderen binnen een groep
- Per vacature: titel (verplicht), beschrijving (optioneel, rich text via TipTap), contactpersoon (optioneel)
- Contactpersoon: keuze uit bestaand committee_member OF vrije invoer (naam + e-mail)
- Volgorde van groepen en vacatures is aanpasbaar via drag-and-drop (HTML5 native, zoals WieDoetWatBeheerPage)
- Publieke pagina toont alle groepen met hun vacatures
- Lege groepen worden niet getoond op de publieke pagina
- Rolslug `vrijwilligers` voor toegangscontrole

### Nice-to-have
- Vacature actief/inactief toggle (verborgen op publieke pagina)
- E-mail link bij contactpersoon op publieke pagina

## 3. Data Model

### Tabel: `volunteer_groups`

```sql
CREATE TABLE volunteer_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  naam text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE volunteer_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Iedereen kan groepen lezen" ON volunteer_groups FOR SELECT USING (true);
CREATE POLICY "Auth kan groepen beheren" ON volunteer_groups FOR ALL USING (auth.uid() IS NOT NULL);
```

### Tabel: `volunteer_vacancies`

```sql
CREATE TABLE volunteer_vacancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES volunteer_groups(id) ON DELETE CASCADE,
  titel text NOT NULL,
  beschrijving text,  -- HTML from TipTap
  -- Contact: either a committee_member reference OR free-form
  contact_member_id uuid REFERENCES committee_members(id) ON DELETE SET NULL,
  contact_naam text,
  contact_email text,
  sort_order integer NOT NULL DEFAULT 0,
  actief boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE volunteer_vacancies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Iedereen kan vacatures lezen" ON volunteer_vacancies FOR SELECT USING (true);
CREATE POLICY "Auth kan vacatures beheren" ON volunteer_vacancies FOR ALL USING (auth.uid() IS NOT NULL);
```

### Rolslug toevoegen

```sql
INSERT INTO roles (slug, label) VALUES ('vrijwilligers', 'Vrijwilligers');
```

**Contactpersoon logica:** Als `contact_member_id` is ingevuld, wordt de naam/e-mail uit `committee_members` getoond. Als `contact_member_id` NULL is maar `contact_naam` is ingevuld, worden de vrije velden getoond. Als beide leeg, geen contactpersoon.

## 4. Service Layer

### `src/services/volunteers.js`

```js
// --- Groepen ---
fetchVolunteerGroups()
// SELECT *, volunteer_vacancies(*) FROM volunteer_groups
// ORDER BY sort_order, vacancies ordered by sort_order
// Returns { data, error }

createVolunteerGroup({ naam, sort_order })
updateVolunteerGroup(id, { naam, sort_order })
deleteVolunteerGroup(id)

// --- Vacatures ---
createVolunteerVacancy({ group_id, titel, beschrijving, contact_member_id, contact_naam, contact_email, sort_order, actief })
updateVolunteerVacancy(id, { titel, beschrijving, contact_member_id, contact_naam, contact_email, sort_order, actief })
deleteVolunteerVacancy(id)

// --- Bulk sort ---
updateVolunteerGroupOrder(updates)  // [{ id, sort_order }]
updateVolunteerVacancyOrder(updates)  // [{ id, sort_order }]

// --- Contact lookup ---
fetchCommitteeMembersFlat()
// SELECT id, naam, emailadres FROM committee_members ORDER BY naam
// For the contact person dropdown
```

Alle functies volgen het `{ data, error }` patroon.

## 5. UI/UX Design

### 5.1 Publieke Pagina: `/vrijwilliger`

**Component:** `VrijwilligerWordenPage.jsx`

- Vervang de huidige `PlaceholderPage` route
- Header: "Vrijwilliger worden?" met korte introductietekst (hardcoded of later CMS)
- Per groep een sectie met groepsnaam als `<h2>`
- Per vacature een card met:
  - Titel als `<h3>`
  - Beschrijving (gerenderd als HTML via `dangerouslySetInnerHTML` met DOMPurify)
  - Contactpersoon: naam + mailto-link als aanwezig
- Lege staat: "Er zijn momenteel geen vacatures." melding
- Inactieve vacatures (`actief = false`) worden niet getoond

### 5.2 Beheer Pagina: `/beheer/vrijwilligers`

**Component:** `VrijwilligersBeheerPage.jsx`

Volgt het patroon van `WieDoetWatBeheerPage`:
- Accordeon-achtige groepen, elk met lijst van vacatures
- Drag-and-drop voor zowel groepen als vacatures (HTML5 native drag, zie bestaand patroon in WieDoetWatBeheerPage)
- Knoppen per groep: bewerken, verwijderen, vacature toevoegen
- Knoppen per vacature: bewerken, verwijderen, actief/inactief toggle

**Modals:**
- Groep modal: naam
- Vacature modal:
  - Titel (verplicht)
  - Beschrijving (TipTap RichTextEditor)
  - Contactpersoon type: radio "Uit Wie doet wat" / "Vrij invoeren" / "Geen"
  - Bij "Uit Wie doet wat": dropdown met committee_members
  - Bij "Vrij invoeren": naam + e-mail velden

### 5.3 Route Integratie

In `App.jsx`:
- Vervang: `<Route path="vrijwilliger" element={<PlaceholderPage ... />} />` met `<VrijwilligerWordenPage />`
- Toevoegen onder `/beheer`: `<Route path="vrijwilligers" element={<ProtectedRoute requiredRole="vrijwilligers"><VrijwilligersBeheerPage /></ProtectedRoute>} />`

### 5.4 Dashboard Tile

Toevoegen aan `BeheerDashboardPage.jsx` TILES array:

```js
{
  title: 'Vrijwilligers',
  description: 'Vrijwilligersvacatures beheren',
  to: '/beheer/vrijwilligers',
  role: 'vrijwilligers',
  icon: /* hand-raised SVG icon */,
}
```

## 6. Implementatieplan

| # | Taak | Grootte | Afhankelijkheid |
|---|------|---------|-----------------|
| 1 | SQL: tabellen + RLS + rolslug aanmaken in Supabase | S | - |
| 2 | `src/services/volunteers.js` schrijven | S | 1 |
| 3 | `VrijwilligersBeheerPage.jsx` - groepen CRUD + drag-and-drop | L | 2 |
| 4 | Vacature modal met TipTap + contactpersoon keuze | M | 2, 3 |
| 5 | `VrijwilligerWordenPage.jsx` publieke pagina | M | 2 |
| 6 | Route integratie in `App.jsx` | S | 3, 5 |
| 7 | Dashboard tile in `BeheerDashboardPage.jsx` | S | 6 |

## 7. Out of Scope

- Publieke sollicitatie/aanmeldformulier (bezoekers nemen contact op via contactpersoon)
- Notificaties bij nieuwe vacatures
- Vacature-archief of historie
- Introductietekst bovenaan de publieke pagina beheerbaar maken via CMS (kan later via content-pagina)
