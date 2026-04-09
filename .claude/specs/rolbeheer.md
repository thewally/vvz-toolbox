# Feature Spec: Rolbeheer

> Granulaire toegangscontrole per beheer-onderdeel

---

## 1. Feature Understanding

### Huidige situatie

Het systeem kent drie gebruikerstypes:
- **Beheerder** — `app_metadata.role === 'admin'` in Supabase Auth, volledige toegang
- **Gebruiker** — ingelogd maar geen admin, kan niets beheren
- **Anoniem** — niet ingelogd, alleen publieke pagina's

Gebruikers worden aangemaakt via `/beheer/gebruikers`. De "Beheer" link in TopNav is alleen zichtbaar als `user.app_metadata?.role === 'admin'`. Alle beheerroutes zitten onder `/beheer` met een `<ProtectedRoute adminOnly>` wrapper.

### Gewenste situatie

Beheerders blijven zoals ze zijn — volledige toegang. Daarnaast krijgen individuele gebruikers **granulaire rollen** per beheer-onderdeel. Een gebruiker met alleen de rol `activiteiten` kan alleen `/beheer/activiteiten` gebruiken, niet de rest.

**Primaire gebruikers:**
- **Beheerder** (`app_metadata.role === 'admin'`) — superadmin, passeert automatisch elke rolcheck
- **Gebruiker met rollen** — heeft toegang tot specifieke beheer-onderdelen
- **Gebruiker zonder rollen** — ziet "Beheer" niet in het menu

**Aannames:**
- Rollen worden opgeslagen in een aparte Supabase-tabel (niet in JWT claims); eenvoudiger te beheren, geen token-refresh nodig
- Een gebruiker kan meerdere rollen hebben
- Beheerder (`app_metadata.role === 'admin'`) fungeert als superadmin en passeert elke rolcheck
- Nieuwe rollen kunnen via de database worden toegevoegd zonder codewijzigingen

---

## 2. Functionele Eisen

### Must-have (MVP)

- **Rolcontrole per beheer-onderdeel**: gebruikers zonder de juiste rol zien een "Geen toegang" melding
- **Beheerder-bypass**: `app_metadata.role === 'admin'` passeert elke rolcheck automatisch
- **Beheerknop zichtbaarheid**: de "Beheer" link in TopNav is zichtbaar als de gebruiker beheerder is OF minstens één rol heeft
- **Roltoekenning in gebruikersbeheer**: op `/beheer/gebruikers` opent een modal per gebruiker met 7 toggle-sliders (zelfde stijl als beheerder-toggle) voor het aan/uit zetten van rollen. Touch targets ≥ 44px, mobiel-vriendelijk.
- **Rolweergave in gebruikerslijst**: per gebruiker toont een compacte teller ("3 rollen") of "Geen rollen" — details via de modal
- **Bestaande flows intact**: login/logout en ProtectedRoute blijven werken

### Nice-to-have

- Audit log van rolwijzigingen
- Lockout-preventie: laatste beheerder kan niet worden gedegradeerd
- E-mail notificatie bij roltoekenning

### Edge cases

- Gebruiker zonder enige rol en niet-beheerder: ziet "Beheer" niet in het menu
- Gebruiker wordt rol ontnomen terwijl sessie actief is: bij volgende navigatie wordt toegang geweigerd
- Lege staat: geen gebruikers met rollen — gebruikerslijst toont gewoon geen rol-badges

---

## 3. Data Model

### Keuze: aparte `user_roles` tabel met vaste rol-slugs

**Overwogen alternatieven:**
1. **JSONB array op `profiles`** — simpeler, maar lastig te queryen in RLS policies en geen referentiële integriteit
2. **Aparte `roles` + `user_roles` tabellen** — flexibel, maar overkill als rollen vast staan
3. **Aparte `user_roles` tabel met vaste slug-enum** — eenvoudig, goed querybaar in RLS, geen extra join nodig

**Gekozen: optie 3** — een `user_roles` koppeltabel met een `role_slug` TEXT kolom. De geldige slugs worden afgedwongen via een CHECK constraint. Dit is simpeler dan een aparte `roles` tabel omdat de rollen vast staan en direct corresponderen met beheer-secties.

### Beschikbare rollen (role slugs)

| Slug | Label | Beheer-sectie(s) |
|---|---|---|
| `activiteiten` | Activiteiten | `/beheer/activiteiten` |
| `trainingsschema` | Trainingsschema | `/beheer/trainingsschema/*` |
| `sponsoring` | Sponsoring | `/beheer/sponsoring` |
| `ereleden` | Ereleden | `/beheer/club/ereleden` |
| `contact` | Contact | `/beheer/contact`, `/beheer/contact/wie-doet-wat` |
| `content` | Pagina's & Nieuws | `/beheer/content/*`, `/beheer/nieuws/*`, `/beheer/menu` |
| `gebruikers` | Gebruikers | `/beheer/gebruikers` |

### Nieuwe tabel

```sql
CREATE TABLE user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_slug TEXT NOT NULL CHECK (role_slug IN (
    'activiteiten', 'trainingsschema', 'sponsoring',
    'ereleden', 'contact', 'content', 'gebruikers'
  )),
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role_slug)
);
```

### Database function: rolcheck met beheerder-bypass

```sql
CREATE OR REPLACE FUNCTION user_has_role(check_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    -- Beheerder (app_metadata.role = 'admin') passeert alles
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
      false
    )
    OR
    -- Of gebruiker heeft de specifieke rol
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role_slug = check_slug
    );
$$;
```

### Database function: check of gebruiker enige rol heeft

```sql
CREATE OR REPLACE FUNCTION user_has_any_role()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
      false
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
    );
$$;
```

### Helper function: rollen per gebruiker ophalen (voor beheer-UI)

```sql
CREATE OR REPLACE FUNCTION get_user_roles_for_management()
RETURNS TABLE (
  user_id UUID,
  role_slug TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT user_id, role_slug
  FROM user_roles
  ORDER BY user_id, role_slug;
$$;
```

### RLS Policies

```sql
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Ingelogde gebruikers mogen hun eigen rollen lezen
CREATE POLICY "Eigen rollen lezen"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Beheerders mogen alle rollen lezen
CREATE POLICY "Beheerders mogen alle rollen lezen"
  ON user_roles FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Beheerders mogen rollen toekennen
CREATE POLICY "Beheerders mogen rollen toekennen"
  ON user_roles FOR INSERT
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Beheerders mogen rollen verwijderen
CREATE POLICY "Beheerders mogen rollen verwijderen"
  ON user_roles FOR DELETE
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Gebruikers met 'gebruikers' rol mogen ook rollen beheren
CREATE POLICY "Gebruikersbeheerders mogen rollen lezen"
  ON user_roles FOR SELECT
  USING (user_has_role('gebruikers'));

CREATE POLICY "Gebruikersbeheerders mogen rollen toekennen"
  ON user_roles FOR INSERT
  WITH CHECK (user_has_role('gebruikers'));

CREATE POLICY "Gebruikersbeheerders mogen rollen verwijderen"
  ON user_roles FOR DELETE
  USING (user_has_role('gebruikers'));
```

---

## 4. Service Layer

### `src/services/roles.js`

```js
import { supabase } from '../lib/supabaseClient';

// Alle beschikbare rol-slugs (constante, matcht CHECK constraint)
export const AVAILABLE_ROLES = [
  { slug: 'activiteiten', label: 'Activiteiten' },
  { slug: 'trainingsschema', label: 'Trainingsschema' },
  { slug: 'sponsoring', label: 'Sponsoring' },
  { slug: 'ereleden', label: 'Ereleden' },
  { slug: 'contact', label: 'Contact' },
  { slug: 'content', label: "Pagina's & Nieuws" },
  { slug: 'gebruikers', label: 'Gebruikers' },
];

// Rollen van de huidige ingelogde gebruiker ophalen
export async function getMyRoles() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: null };

  const { data, error } = await supabase
    .from('user_roles')
    .select('role_slug')
    .eq('user_id', user.id);
  return { data: data?.map(r => r.role_slug) ?? [], error };
}

// Alle user-rol koppelingen ophalen (voor gebruikersbeheer)
export async function getAllUserRoles() {
  const { data, error } = await supabase.rpc('get_user_roles_for_management');
  return { data, error };
}

// Rol toekennen aan gebruiker
export async function assignRole(userId, roleSlug) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role_slug: roleSlug,
      assigned_by: user?.id,
    })
    .select()
    .single();
  return { data, error };
}

// Rol verwijderen van gebruiker
export async function removeRole(userId, roleSlug) {
  const { data, error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_slug', roleSlug);
  return { data, error };
}
```

---

## 5. UI/UX Design

### AuthContext uitbreiding

`src/context/AuthContext.jsx` wordt uitgebreid met:
- **`userRoles`**: array van role slugs van de ingelogde gebruiker (geladen bij login)
- **`hasRole(slug)`**: synchrone helper die checkt of de gebruiker beheerder is of de specifieke rol heeft
- **`hasAnyRole()`**: synchrone helper die checkt of de gebruiker beheerder is of enige rol heeft

```jsx
const [userRoles, setUserRoles] = useState([]);

// Na succesvolle login / auth state change:
const { data } = await getMyRoles();
setUserRoles(data ?? []);

const isAdmin = user?.app_metadata?.role === 'admin';

const hasRole = (slug) => isAdmin || userRoles.includes(slug);
const hasAnyRole = () => isAdmin || userRoles.length > 0;
```

### TopNav: Beheerknop zichtbaarheid

De huidige check `user.app_metadata?.role === 'admin'` wordt vervangen door `hasAnyRole()` uit AuthContext:

```jsx
// Was:
{user.app_metadata?.role === 'admin' && (<Link to="/beheer">Beheer</Link>)}

// Wordt:
{hasAnyRole() && (<Link to="/beheer">Beheer</Link>)}
```

### ProtectedRoute uitbreiding

`src/components/ProtectedRoute.jsx` krijgt een optionele `requiredRole` prop:

```jsx
<ProtectedRoute requiredRole="activiteiten">
  <ActiviteitenBeheerPage />
</ProtectedRoute>
```

- Zonder `requiredRole` maar met `adminOnly`: gedrag als voorheen (alleen beheerder)
- Met `requiredRole`: controleert `hasRole(requiredRole)` uit AuthContext
- Bij ontbrekende rol: toont "Geen toegang" melding met terugknop naar `/beheer`

### Routing aanpassingen

De huidige `<ProtectedRoute adminOnly>` wrapper rond `/beheer` wordt vervangen door een check op `hasAnyRole()` (mag het beheergedeelte betreden). Individuele routes krijgen `requiredRole`:

| Route | Rol vereist |
|---|---|
| `/beheer` (dashboard) | Enige rol (of beheerder) |
| `/beheer/activiteiten` | `activiteiten` |
| `/beheer/trainingsschema/*` | `trainingsschema` |
| `/beheer/sponsoring` | `sponsoring` |
| `/beheer/club/ereleden` | `ereleden` |
| `/beheer/contact/*` | `contact` |
| `/beheer/content/*`, `/beheer/nieuws/*`, `/beheer/menu` | `content` |
| `/beheer/gebruikers` | `gebruikers` |

### BeheerDashboardPage aanpassing

Het beheerdashboard toont alleen de kaartjes waarvoor de gebruiker een rol heeft. Een beheerder ziet alles. Een gebruiker met alleen `activiteiten` ziet alleen het Activiteiten-kaartje.

### GebruikersBeheerPage: rollen toekennen

De bestaande pagina `/beheer/gebruikers` wordt uitgebreid.

#### Gekozen UI-patroon: Modal met toggles (optie D)

**Afweging van alternatieven:**

| Optie | Voordeel | Nadeel | Oordeel |
|---|---|---|---|
| A. Uitklapbare rijen (accordion) | Alles op één pagina | Tabel al krap op mobiel; 7 toggles in een uitklaprij wordt rommelig | Afgewezen |
| B. Slide-over / drawer | Ruim, clean scheiding | Nieuw UI-patroon, complexer te bouwen | Te veel overhead |
| C. Aparte detailpagina | Maximale ruimte | Navigatie heen-en-terug voor 7 toggles is overkill | Afgewezen |
| **D. Modal met toggles** | **Consistent met bestaande modals (verwijder, uitnodig), mobiel-vriendelijk, toggles passen bij beheerder-slider** | Extra UI-laag | **Gekozen** |

#### Trigger: "Rollen bewerken" icoon in de tabelrij

Per gebruiker komt een **tandwiel-icoon** (of `PencilSquareIcon`) naast het verwijder-icoon in de actiekolom. Dit icoon opent de rollen-modal. Het icoon is alleen zichtbaar als:
- De gebruiker NIET "Jijzelf" is (je kunt je eigen rollen niet bewerken)
- De gebruiker GEEN beheerder is (beheerders hebben automatisch alle toegang, rollen zijn irrelevant)

Voor beheerders toont de rij in plaats van het icoon niets extra — de tekst "Beheerder" bij de toggle is voldoende.

#### Rollen-modal: layout

De modal volgt exact het bestaande patroon (`fixed inset-0 z-50 flex items-center justify-center bg-black/40` + `bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4`):

```
┌─────────────────────────────────────┐
│ Rollen voor Piet Jansen             │
│ piet@vvz.nl                         │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Activiteiten          [====○ ] │ │
│ ├─────────────────────────────────┤ │
│ │ Trainingsschema       [ ○====] │ │
│ ├─────────────────────────────────┤ │
│ │ Sponsoring            [====○ ] │ │
│ ├─────────────────────────────────┤ │
│ │ Ereleden              [====○ ] │ │
│ ├─────────────────────────────────┤ │
│ │ Contact               [====○ ] │ │
│ ├─────────────────────────────────┤ │
│ │ Pagina's & Nieuws     [====○ ] │ │
│ ├─────────────────────────────────┤ │
│ │ Gebruikers            [====○ ] │ │
│ └─────────────────────────────────┘ │
│                                     │
│                          [Sluiten]  │
└─────────────────────────────────────┘
```

**Toggle-stijl:** Dezelfde slider-component als de beheerder-toggle (`relative inline-flex h-5 w-9 shrink-0 rounded-full` met `bg-vvz-green` actief / `bg-gray-200` inactief). Dit zorgt voor visuele consistentie.

**Elke rij is een `flex items-center justify-between` met:**
- Linker: rol-label (tekst, `text-sm text-gray-700`)
- Rechts: toggle-slider
- Minimale rijhoogte: `min-h-[44px]` (touch target ≥ 44px)
- Gescheiden door `divide-y divide-gray-100`

**Gedrag:**
- Elke toggle slaat direct op (geen "Opslaan" knop) — `assignRole()` of `removeRole()` per klik
- Loading state per individuele toggle: toggle wordt `disabled` + `opacity-50` tijdens de API call
- Error: rode tekst boven de toggles ("Rol wijzigen mislukt, probeer het opnieuw")
- Geen "Annuleren" knop nodig — er is alleen "Sluiten" want wijzigingen zijn direct opgeslagen

#### Rolweergave in de gebruikerslijst (op een oogopslag)

Onder de beheerder-toggle in de "Rol" kolom wordt een compacte samenvatting getoond:

- **Beheerder**: alleen "Beheerder" label (geen rollen nodig)
- **Gebruiker met rollen**: tellersbadge, bijv. `3 rollen` — Tailwind: `text-xs text-gray-500`
- **Gebruiker zonder rollen**: `Geen rollen` in `text-xs text-gray-300 italic`
- **Jijzelf**: "Jijzelf" label blijft zoals nu; geen rolbadge of tellersbadge

De volledige rolnamen worden NIET in de tabel getoond — dat is precies waarom de modal bestaat. De teller geeft voldoende inzicht. Op mobiel blijft de tabel compact.

#### "Jijzelf" (huidige gebruiker)

- Je kunt je eigen rollen NIET bewerken (geen tandwiel-icoon)
- Je kunt je eigen beheerder-toggle NIET wijzigen (bestaand gedrag)
- Reden: voorkomt dat je jezelf per ongeluk buiten sluit

---

## 6. Implementatieplan

| # | Taak | Afhankelijk van | Grootte |
|---|---|---|---|
| 1 | SQL: `user_roles` tabel met CHECK constraint | - | S |
| 2 | SQL: `user_has_role()` en `user_has_any_role()` functions | 1 | S |
| 3 | SQL: `get_user_roles_for_management()` function | 1 | S |
| 4 | SQL: RLS policies op `user_roles` | 1, 2 | S |
| 5 | `src/services/roles.js` met AVAILABLE_ROLES constante | 1-4 | S |
| 6 | AuthContext uitbreiden met `userRoles`, `hasRole()`, `hasAnyRole()` | 5 | M |
| 7 | ProtectedRoute uitbreiden met `requiredRole` prop | 6 | S |
| 8 | TopNav: Beheerknop zichtbaarheid op `hasAnyRole()` | 6 | S |
| 9 | Routes aanpassen: `requiredRole` per beheerroute | 7 | M |
| 10 | BeheerDashboardPage: conditionele kaartjes | 6 | S |
| 11 | GebruikersBeheerPage: roltellersbadge per gebruiker in tabelrij | 5, 6 | S |
| 12 | GebruikersBeheerPage: rollen-modal met toggles (zelfde slider-stijl als beheerder-toggle) | 11 | M |
| 13 | RLS policies op bestaande tabellen updaten (optioneel, fase 2) | 2 | L |

### Migratiestrategie

Omdat het bestaande systeem op `app_metadata.role === 'admin'` draait, is er **geen breaking change**:
- Beheerders behouden volledige toegang via de `isAdmin` check in `user_has_role()`
- De `user_roles` tabel voegt granulaire rollen toe bovenop het bestaande systeem
- Bestaande beheerders hoeven geen rollen toegekend te krijgen

---

## 7. Out of Scope

- **Rollen aanmaken via UI**: de set rollen staat vast in de CHECK constraint en `AVAILABLE_ROLES` constante
- **Audit logging**: geen logging van rolwijzigingen
- **Lockout-preventie**: geen controle op degraderen van de laatste beheerder
- **Per-record autorisatie**: rollen gelden per feature, niet per individueel record
- **RLS op bestaande tabellen**: fase 2 — bestaande tabellen (activities, training_slots, etc.) krijgen later `user_has_role()` checks in hun RLS policies. In fase 1 is de bescherming alleen frontend (route guards)
- **Aparte rolbeheer-pagina**: rollen worden beheerd binnen de bestaande `/beheer/gebruikers` pagina, geen aparte `/beheer/rollen` route nodig
