# Feature Spec: Rolbeheer

> Granulaire toegangscontrole per toolbox-onderdeel

---

## 1. Feature Understanding

Het huidige systeem kent slechts een binair onderscheid: ingelogd of niet ingelogd. Elke ingelogde gebruiker heeft toegang tot alle beheeromgevingen. Deze feature introduceert **rolgebaseerde toegangscontrole** zodat per toolbox-onderdeel bepaald kan worden wie beheertoegang heeft.

**Primaire gebruikers:**
- **Superadmin / Rol-beheerder** (`rol_beheerder`) — beheert wie welke rol heeft, en passeert automatisch elke rolcheck
- **Agenda-beheerder** (`agenda_beheerder`) — mag alleen `/agenda/beheer` gebruiken
- **Trainingsschema-beheerder** (`trainingsschema_beheerder`) — mag alleen `/trainingsschema/beheer` gebruiken

**Aannames:**
- Rollen worden opgeslagen in aparte Supabase-tabellen (geen JWT custom claims); dit is eenvoudiger te beheren en vereist geen token-refresh
- Een gebruiker kan meerdere rollen hebben
- `rol_beheerder` fungeert als **superadmin**: passeert automatisch elke rolcheck, ook voor toekomstige rollen
- Nieuwe rollen (bijv. `plattegrond_beheerder`) kunnen later via de database worden toegevoegd zonder codewijzigingen

---

## 2. Functionele Eisen

### Must-have (MVP)

- **Rolcontrole per beheeromgeving**: gebruikers zonder de juiste rol zien een "Geen toegang" melding of worden doorgestuurd
- **Superadmin-bypass**: `rol_beheerder` passeert elke rolcheck automatisch
- **Rolbeheer-UI**: een pagina op `/beheer/rollen` waar de `rol_beheerder` kan:
  - Alle gebruikers met hun rollen bekijken
  - Rollen toekennen aan en verwijderen van gebruikers
- **Bestaande flows intact**: huidige login/logout en ProtectedRoute blijven werken
- **Foutafhandeling**: duidelijke foutmeldingen bij ontbrekende rechten

### Nice-to-have

- Audit log van rolwijzigingen
- Rollen aanmaken/verwijderen via de UI (nu alleen via database)
- E-mail notificatie bij roltoekenning

### Edge cases

- Gebruiker zonder enige rol: ziet geen enkele beheeromgeving
- Gebruiker wordt rol ontnomen terwijl sessie actief is: bij volgende navigatie of refresh wordt toegang geweigerd
- Laatste `rol_beheerder` kan niet worden verwijderd (voorkomen lockout) — nice-to-have, niet in MVP
- Lege staat: geen gebruikers met rollen — rolbeheer-pagina toont lege lijst met uitleg

---

## 3. Data Model

### Nieuwe tabellen

```sql
-- Beschikbare rollen
CREATE TABLE roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,          -- 'rol_beheerder', 'agenda_beheerder', etc.
  label TEXT NOT NULL,                -- 'Rolbeheerder', 'Agendabeheerder', etc.
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Koppeltabel: welke gebruiker heeft welke rol
CREATE TABLE user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role_id)
);
```

### Seed data

```sql
INSERT INTO roles (slug, label, description) VALUES
  ('rol_beheerder', 'Rolbeheerder', 'Superadmin: beheert rollen en heeft automatisch toegang tot alle beheeromgevingen'),
  ('agenda_beheerder', 'Agendabeheerder', 'Kan activiteiten aanmaken, wijzigen en verwijderen'),
  ('trainingsschema_beheerder', 'Trainingsschemabeheerder', 'Kan trainingsslots en veldindeling beheren');
```

### Database function: rolcheck met superadmin-bypass

```sql
CREATE OR REPLACE FUNCTION user_has_role(check_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND (r.slug = check_slug OR r.slug = 'rol_beheerder')
  );
$$;
```

De `OR r.slug = 'rol_beheerder'` clause zorgt ervoor dat een superadmin automatisch elke rolcheck passeert, ongeacht welke `check_slug` wordt opgevraagd. Dit schaalt automatisch mee met toekomstige rollen.

### Helper function: gebruikers ophalen voor rolbeheer

```sql
CREATE OR REPLACE FUNCTION get_managed_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, email, created_at
  FROM auth.users
  ORDER BY email;
$$;
```

### RLS Policies

```sql
-- roles: iedereen mag lezen, niemand mag schrijven via client
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rollen zijn publiek leesbaar"
  ON roles FOR SELECT
  USING (true);

-- user_roles: alleen lezen als ingelogd, schrijven alleen voor rol_beheerder
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ingelogde gebruikers mogen user_roles lezen"
  ON user_roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Alleen rol_beheerder mag rollen toekennen"
  ON user_roles FOR INSERT
  WITH CHECK (user_has_role('rol_beheerder'));

CREATE POLICY "Alleen rol_beheerder mag rollen verwijderen"
  ON user_roles FOR DELETE
  USING (user_has_role('rol_beheerder'));
```

---

## 4. Service Layer

### `src/services/roles.js`

```js
import { supabase } from '../lib/supabaseClient';

// Alle beschikbare rollen ophalen
export async function getRoles() {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('label');
  return { data, error };
}

// Rollen van de huidige ingelogde gebruiker ophalen
export async function getMyRoles() {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role_id, roles(slug, label)')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
  return { data, error };
}

// Check of huidige gebruiker een specifieke rol heeft (via DB function)
export async function hasRole(slug) {
  const { data, error } = await supabase.rpc('user_has_role', { check_slug: slug });
  return { data, error };
}

// Alle gebruikers ophalen (voor rolbeheer-UI)
export async function getManagedUsers() {
  const { data, error } = await supabase.rpc('get_managed_users');
  return { data, error };
}

// Alle user-rol koppelingen ophalen
export async function getAllUserRoles() {
  const { data, error } = await supabase
    .from('user_roles')
    .select('*, roles(slug, label)');
  return { data, error };
}

// Rol toekennen aan gebruiker
export async function assignRole(userId, roleId) {
  const { data, error } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role_id: roleId,
      assigned_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .select()
    .single();
  return { data, error };
}

// Rol verwijderen van gebruiker
export async function removeRole(userRoleId) {
  const { data, error } = await supabase
    .from('user_roles')
    .delete()
    .eq('id', userRoleId);
  return { data, error };
}
```

---

## 5. UI/UX Design

### AuthContext uitbreiding

`src/context/AuthContext.jsx` wordt uitgebreid met:
- **`userRoles`**: array van role slugs van de ingelogde gebruiker (geladen bij login)
- **`hasRole(slug)`**: synchrone helper die checkt of `userRoles` de gevraagde slug bevat, of `'rol_beheerder'` bevat (client-side superadmin bypass, spiegelt de DB function)

```jsx
// Pseudocode toevoeging aan AuthContext
const [userRoles, setUserRoles] = useState([]);

// Na succesvolle login:
const { data } = await getMyRoles();
setUserRoles(data?.map(ur => ur.roles.slug) ?? []);

const hasRole = (slug) =>
  userRoles.includes(slug) || userRoles.includes('rol_beheerder');
```

### ProtectedRoute uitbreiding

`src/components/ProtectedRoute.jsx` krijgt een optionele `requiredRole` prop:

```jsx
<ProtectedRoute requiredRole="agenda_beheerder">
  <AgendaBeheerPage />
</ProtectedRoute>
```

- Zonder `requiredRole`: gedrag als voorheen (alleen login vereist)
- Met `requiredRole`: controleert `hasRole(requiredRole)` uit AuthContext
- Bij ontbrekende rol: toont "Geen toegang" melding met terugknop

### Routing aanpassingen

| Route | Rol vereist |
|---|---|
| `/agenda/beheer` | `agenda_beheerder` |
| `/trainingsschema/beheer` | `trainingsschema_beheerder` |
| `/beheer/rollen` | `rol_beheerder` |

### RolbeheerPage (`/beheer/rollen`)

Nieuwe pagina: `src/pages/RolbeheerPage.jsx`

**Layout:**
- Eigen route onder `/beheer/rollen`, beschermd met `requiredRole="rol_beheerder"`
- Geen sub-nav layout nodig (staat los van Agenda/Trainingsschema)
- Navigatie: bereikbaar via de homepage of een apart "Beheer" blok

**UI-elementen:**
- **Tabel** met alle gebruikers (email) en hun huidige rollen als badges/tags
- **Rol toekennen**: dropdown met beschikbare rollen + "Toevoegen" knop per gebruiker
- **Rol verwijderen**: kruisje op de rol-badge, met bevestigingsdialoog
- **Lege staat**: "Er zijn nog geen gebruikers met rollen." met uitleg
- **Loading state**: skeleton/spinner tijdens laden
- **Error state**: foutmelding bij mislukte acties

### Navigatie-integratie

- HomePage: nieuw kaartje "Rolbeheer" (alleen zichtbaar voor `rol_beheerder`)
- Bestaande beheerlinks in AgendaLayout en TrainingschemaLayout blijven ongewijzigd, maar de pagina's erachter controleren nu op de juiste rol

---

## 6. Implementatieplan

| # | Taak | Afhankelijk van | Grootte |
|---|---|---|---|
| 1 | SQL: `roles` en `user_roles` tabellen aanmaken | - | S |
| 2 | SQL: `user_has_role()` function met superadmin-bypass | 1 | S |
| 3 | SQL: `get_managed_users()` function | 1 | S |
| 4 | SQL: RLS policies | 1, 2 | S |
| 5 | SQL: seed data (3 initiële rollen) | 1 | S |
| 6 | `src/services/roles.js` | 1-5 | M |
| 7 | AuthContext uitbreiden met `userRoles` en `hasRole()` | 6 | M |
| 8 | ProtectedRoute uitbreiden met `requiredRole` prop | 7 | S |
| 9 | Routes aanpassen: `requiredRole` toevoegen aan beheerroutes | 8 | S |
| 10 | RolbeheerPage bouwen | 6, 7 | L |
| 11 | HomePage: rolbeheer-kaartje toevoegen (conditioneel) | 7 | S |
| 12 | Eerste `rol_beheerder` toekennen aan bestaande admin-gebruiker | 1, 5 | S |

---

## 7. Out of Scope

- **Gebruikersbeheer**: aanmaken/verwijderen van Supabase Auth-gebruikers (blijft via Supabase Dashboard)
- **Rollen aanmaken via UI**: nieuwe rollen worden via SQL/Supabase Dashboard toegevoegd
- **Audit logging**: geen logging van wie wanneer welke rol heeft toegekend/verwijderd
- **Lockout-preventie**: geen controle op verwijderen van de laatste `rol_beheerder`
- **JWT custom claims**: bewust niet gekozen; database-rollen zijn eenvoudiger te beheren
- **Per-record autorisatie**: rollen gelden per feature, niet per individueel record
