# Feature Spec: Gebruikersregistratie

> Zelfregistratie met e-mailverificatie, gebruikersprofiel en voorkeursteam

---

## 1. Feature Understanding

Momenteel kunnen alleen beheerders inloggen via accounts die handmatig in het Supabase dashboard worden aangemaakt. Deze feature voegt **zelfregistratie** toe zodat leden en bezoekers van VVZ'49 zelf een account kunnen aanmaken.

**Primaire gebruikers:**
- **Bezoeker (niet ingelogd)** -- kan het registratieformulier openen en invullen
- **Geregistreerde gebruiker (ingelogd)** -- heeft dezelfde leesrechten als een bezoeker, maar kan een profiel beheren
- **Beheerder** -- ongewijzigd; bestaande admin-flow blijft intact

**Aannames:**
- Geregistreerde gebruikers krijgen **geen** toegang tot beheeromgevingen; daarvoor is de (toekomstige) rolbeheer-feature nodig
- E-mailverificatie verloopt via Supabase Auth's ingebouwde `signUp` met `emailRedirectTo`
- De bevestigingslink stuurt de gebruiker terug naar de VVZ Toolbox (HashRouter-compatibel)
- Er is geen wachtwoord-vergeten flow in scope (Supabase Auth heeft dit ingebouwd, maar we bouwen er geen UI voor in MVP)
- Het `profiles`-tabel wordt automatisch aangemaakt via een database trigger bij registratie

---

## 2. Functionele Eisen

### Must-have (MVP)

1. **Registratieformulier** op `/registreren`:
   - Velden: naam (verplicht), e-mailadres (verplicht), wachtwoord (verplicht, min 8 tekens), wachtwoord bevestigen
   - Client-side validatie: matching wachtwoorden, e-mail formaat, minimum lengte
   - Bij succes: melding "Controleer je e-mail om je registratie te bevestigen"
   - Bij fout (bijv. e-mail al in gebruik): duidelijke foutmelding in het Nederlands

2. **E-mailverificatie**:
   - Supabase stuurt automatisch een bevestigingsmail bij `signUp`
   - De `emailRedirectTo` URL wijst naar `https://thewally.github.io/vvz-toolbox/#/email-bevestigd`
   - Op `/email-bevestigd`: bevestigingspagina met tekst "Je account is bevestigd! Je kunt nu inloggen." en link naar `/login`

3. **Gebruikersprofiel** op `/profiel`:
   - Alleen toegankelijk voor ingelogde gebruikers (ProtectedRoute)
   - Toont: naam, e-mailadres (readonly), voorkeursteam
   - Bewerkbaar: voorkeursteam (dropdown met alle teams uit `teams`-tabel)
   - Opslaan-knop met succes/foutmelding
   - Naam is voorlopig readonly na registratie (wijzigen = nice-to-have)

4. **Navigatie-integratie**:
   - "Registreren" link naast bestaande login-functionaliteit in TopNav (wanneer niet ingelogd)
   - Wanneer ingelogd: gebruikersnaam tonen met dropdown: "Mijn profiel" + "Uitloggen"
   - Link naar `/registreren` op de LoginPage ("Nog geen account? Registreer je hier")

5. **LoginPage aanpassing**:
   - Na succesvol inloggen: redirect naar vorige pagina (bestaand gedrag) of homepage
   - Link naar registratiepagina toevoegen

6. **AuthContext uitbreiding**:
   - `signUp` functie toevoegen
   - `profile` object beschikbaar maken (naam, voorkeursteam)
   - `profile` wordt opgehaald na inloggen en gecached in context

7. **Wachtwoord vergeten** op `/wachtwoord-vergeten`:
   - Veld: e-mailadres (verplicht)
   - Roept `supabase.auth.resetPasswordForEmail()` aan met `redirectTo` naar `/wachtwoord-resetten`
   - Bij succes: melding "Als dit e-mailadres bij ons bekend is, ontvang je een e-mail met een link om je wachtwoord te resetten." (bewust vaag om e-mail enumeration te voorkomen)
   - Bij fout (rate limit, netwerk): foutmelding in het Nederlands
   - Link op LoginPage: "Wachtwoord vergeten?" boven of onder de inlogknop
   - Toegankelijk zonder login (publieke route)

8. **Wachtwoord resetten** op `/wachtwoord-resetten`:
   - De gebruiker komt hier via de reset-link uit de e-mail
   - Supabase zet automatisch een tijdelijke sessie; de gebruiker is technisch "ingelogd" met een recovery-token
   - Velden: nieuw wachtwoord (min 8 tekens), nieuw wachtwoord bevestigen
   - Client-side validatie: matching wachtwoorden, minimum lengte
   - Roept `supabase.auth.updateUser({ password })` aan
   - Bij succes: melding "Je wachtwoord is gewijzigd! Je kunt nu inloggen." met link naar `/login`
   - Bij fout (verlopen link, ongeldig token): foutmelding "Deze link is verlopen of ongeldig. Vraag een nieuwe link aan." met link naar `/wachtwoord-vergeten`
   - Edge case: als er geen recovery-sessie actief is (gebruiker navigeert direct naar deze URL), toon melding met link naar `/wachtwoord-vergeten`

9. **Wachtwoord wijzigen** op `/profiel` (subsectie):
   - Alleen voor ingelogde gebruikers met een e-mail/wachtwoord-account (niet voor OAuth-only gebruikers)
   - Sectie onderaan de profielpagina met kop "Wachtwoord wijzigen"
   - Velden: nieuw wachtwoord (min 8 tekens), nieuw wachtwoord bevestigen
   - Geen "huidig wachtwoord" veld nodig: `supabase.auth.updateUser({ password })` werkt op de actieve sessie
   - Bij succes: groene melding "Je wachtwoord is gewijzigd."
   - Bij fout: rode melding met foutomschrijving
   - Verberg deze sectie voor OAuth-only gebruikers (detectie: `user.app_metadata.provider !== 'email'` of `user.identities` bevat geen `email`-provider)

10. **Account verwijderen** vanuit ProfielPage:
    - Onderaan de profielpagina een "Account verwijderen" knop (rood, destructief)
    - Klikken opent een bevestigingsmodal met waarschuwing: "Weet je zeker dat je je account wilt verwijderen? Dit kan niet ongedaan worden gemaakt. Al je gegevens worden permanent verwijderd."
    - Bevestigingsknop in modal: "Ja, verwijder mijn account" (rood)
    - Annuleerknop: "Annuleren"
    - Na bevestiging: aanroep naar Supabase Edge Function `delete-account`
    - De Edge Function verifieert via de JWT dat de gebruiker zichzelf verwijdert
    - De Edge Function controleert dat de gebruiker **geen admin** is (admin-accounts mogen zichzelf niet verwijderen via deze flow)
    - Bij succes: het `profiles`-record wordt automatisch verwijderd via `ON DELETE CASCADE` op de FK naar `auth.users`
    - Na succesvolle verwijdering: gebruiker wordt uitgelogd en doorgestuurd naar de homepage (`/`)
    - Bij fout (Edge Function faalt, netwerk, admin-check): toon rode foutmelding in de modal, account blijft bestaan
    - Laadstate: knop disabled met spinner tijdens verwijdering

### Nice-to-have

- Naam wijzigen in profiel
- Profielfoto (avatar)
- E-mailadres wijzigen
- Admin-overzicht van alle geregistreerde gebruikers (past bij rolbeheer-feature)

---

## 3. Data Model

### Nieuwe tabel: `profiles`

Slaat aanvullende gebruikersgegevens op die niet in Supabase Auth `auth.users` zitten.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  favorite_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index voor snelle lookups
CREATE INDEX idx_profiles_favorite_team ON profiles(favorite_team_id);

-- Automatisch updated_at bijwerken
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### Trigger: profiel automatisch aanmaken bij registratie

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Gebruiker')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

**Toelichting:** Bij `signUp` sturen we `display_name` mee in `options.data`. De trigger leest dit uit `raw_user_meta_data` en maakt het profiel aan.

### RLS Policies

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Iedereen mag profielen lezen (nodig voor het tonen van gebruikersnamen)
CREATE POLICY "Profielen zijn publiek leesbaar"
  ON profiles FOR SELECT
  USING (true);

-- Gebruiker mag alleen eigen profiel bijwerken
CREATE POLICY "Gebruiker mag eigen profiel bijwerken"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Insert alleen via trigger (SECURITY DEFINER), geen directe insert nodig
-- Maar voor de zekerheid: gebruiker mag eigen profiel inserten
CREATE POLICY "Gebruiker mag eigen profiel aanmaken"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

---

## 4. Service Layer

### Nieuw bestand: `src/services/profiles.js`

```js
import { supabase } from '../lib/supabaseClient'

/**
 * Haal het profiel op van de ingelogde gebruiker, inclusief team-naam.
 * @param {string} userId
 * @returns {{ data: Profile | null, error: Error | null }}
 */
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, favorite_team_id, teams(id, name)')
    .eq('id', userId)
    .single()
  return { data, error }
}

/**
 * Werk het voorkeursteam bij.
 * @param {string} userId
 * @param {string|null} favoriteTeamId
 * @returns {{ data, error }}
 */
export async function updateFavoriteTeam(userId, favoriteTeamId) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ favorite_team_id: favoriteTeamId })
    .eq('id', userId)
    .select('id, display_name, favorite_team_id, teams(id, name)')
    .single()
  return { data, error }
}

/**
 * Werk het profiel bij (toekomstig: meer velden).
 * @param {string} userId
 * @param {object} updates - { display_name?, favorite_team_id? }
 * @returns {{ data, error }}
 */
export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('id, display_name, favorite_team_id, teams(id, name)')
    .single()
  return { data, error }
}
```

### Nieuw bestand: `src/services/auth.js`

Wachtwoord-gerelateerde functies en accountbeheer die direct de Supabase Auth API aanroepen.

```js
import { supabase } from '../lib/supabaseClient'

/**
 * Stuur een wachtwoord-reset e-mail.
 * @param {string} email
 * @returns {{ data, error }}
 */
export async function sendPasswordReset(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://thewally.github.io/vvz-toolbox/auth/callback?type=recovery&next=/wachtwoord-resetten',
  })
  return { data, error }
}

/**
 * Wijzig het wachtwoord van de huidige ingelogde gebruiker.
 * Werkt zowel voor password-reset flow als voor wachtwoord-wijzigen in profiel.
 * @param {string} newPassword
 * @returns {{ data, error }}
 */
export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  return { data, error }
}

/**
 * Controleer of de huidige gebruiker een e-mail/wachtwoord-account heeft
 * (in tegenstelling tot OAuth-only).
 * @param {object} user - Supabase user object
 * @returns {boolean}
 */
export function hasEmailProvider(user) {
  if (!user?.identities) return false
  return user.identities.some((id) => id.provider === 'email')
}

/**
 * Verwijder het account van de ingelogde gebruiker via de Supabase Edge Function.
 * De Edge Function verifieert de JWT en verwijdert het auth.users-record.
 * Het profiles-record wordt automatisch verwijderd via ON DELETE CASCADE.
 *
 * @returns {{ data: { success: boolean }, error: Error | null }}
 */
export async function deleteAccount() {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData?.session?.access_token
  if (!accessToken) {
    return { data: null, error: new Error('Geen actieve sessie gevonden.') }
  }

  try {
    const { data, error } = await supabase.functions.invoke('delete-account', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (error) return { data: null, error }
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}
```

### Wijziging: `src/context/AuthContext.jsx`

Voeg toe:
- `signUp(email, password, displayName)` functie
- `profile` state die na login wordt opgehaald via `fetchProfile`
- `refreshProfile()` functie om profiel te herladen na wijziging

```js
// Nieuwe signUp functie
const signUp = async (email, password, displayName) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: 'https://thewally.github.io/vvz-toolbox/#/email-bevestigd',
    },
  })
  return { data, error }
}
```

De `profile` wordt opgehaald in de `onAuthStateChange` handler wanneer een sessie actief is, en op `null` gezet wanneer de gebruiker uitlogt.

**Context value wordt:**
```js
{ user, profile, loading, signIn, signUp, signOut, refreshProfile }
```

---

## 5. UI/UX Design

### 5.1 Registratiepagina (`/registreren`)

**Bestand:** `src/pages/RegistrerenPage.jsx`

- Zelfde visuele stijl als LoginPage (centered card, max-w-sm, shadow-lg)
- Formuliervelden:
  - Naam (`text`, required)
  - E-mailadres (`email`, required)
  - Wachtwoord (`password`, required, minLength 8)
  - Wachtwoord bevestigen (`password`, required, moet matchen)
- Knop: "Registreren" (vvz-green, zelfde styling als login-knop)
- Link onderaan: "Al een account? [Inloggen](/login)"
- **Successtate**: formulier verdwijnt, groene melding: "We hebben een bevestigingsmail gestuurd naar {email}. Klik op de link in de e-mail om je account te activeren."
- **Foutstate**: rode melding boven formulier (zelfde patroon als LoginPage)

### 5.2 E-mail bevestigingspagina (`/email-bevestigd`)

**Bestand:** `src/pages/EmailBevestigdPage.jsx`

- Simpele centered card
- Groen vinkje icoon (SVG inline of Heroicons)
- Tekst: "Je account is bevestigd!"
- Subtekst: "Je kunt nu inloggen met je e-mailadres en wachtwoord."
- Knop: "Naar inloggen" (link naar `/login`)

### 5.3 Profielpagina (`/profiel`)

**Bestand:** `src/pages/ProfielPage.jsx`

- Beschermd via ProtectedRoute
- Card-layout (max-w-md, centered)
- Titel: "Mijn profiel"
- Velden:
  - Naam: readonly tekstveld met grijze achtergrond
  - E-mail: readonly tekstveld met grijze achtergrond (uit `user.email`)
  - Voorkeursteam: `<select>` dropdown met alle teams, plus lege optie "Geen voorkeur"
- Knop: "Opslaan" (alleen actief als voorkeursteam is gewijzigd)
- Succes-toast of inline melding na opslaan

### 5.4 Wachtwoord vergeten pagina (`/wachtwoord-vergeten`)

**Bestand:** `src/pages/WachtwoordVergetenPage.jsx`

- Publieke route, zelfde visuele stijl als LoginPage (centered card, max-w-sm, shadow-lg)
- Titel: "Wachtwoord vergeten"
- Subtekst: "Vul je e-mailadres in en we sturen je een link om je wachtwoord te resetten."
- Formulierveld:
  - E-mailadres (`email`, required)
- Knop: "Verstuur resetlink" (vvz-green, zelfde styling als login-knop)
- Link onderaan: "Terug naar [Inloggen](/login)"
- **Successtate**: formulier verdwijnt, groene melding: "Als dit e-mailadres bij ons bekend is, ontvang je een e-mail met een link om je wachtwoord te resetten."
- **Foutstate**: rode melding boven formulier (netwerk/rate-limit fouten)
- **Loading state**: knop disabled met spinner tijdens API-call

### 5.5 Wachtwoord resetten pagina (`/wachtwoord-resetten`)

**Bestand:** `src/pages/WachtwoordResettenPage.jsx`

- Publieke route (de gebruiker heeft een tijdelijke recovery-sessie via de e-maillink)
- Zelfde visuele stijl als LoginPage (centered card, max-w-sm, shadow-lg)
- Titel: "Nieuw wachtwoord instellen"
- Formuliervelden:
  - Nieuw wachtwoord (`password`, required, minLength 8)
  - Nieuw wachtwoord bevestigen (`password`, required, moet matchen)
- Client-side validatie: matching wachtwoorden, minimum lengte (zelfde logica als RegistrerenPage)
- Knop: "Wachtwoord opslaan" (vvz-green)
- **Successtate**: formulier verdwijnt, groene melding: "Je wachtwoord is gewijzigd!" met knop "Naar inloggen" (link naar `/login`)
- **Foutstate (verlopen/ongeldig token)**: formulier verborgen, rode melding: "Deze link is verlopen of ongeldig." met link "Vraag een nieuwe link aan" naar `/wachtwoord-vergeten`
- **Edge case geen sessie**: bij mount checken of er een actieve sessie is (`supabase.auth.getSession()`). Zo niet, toon "Geen geldige resetlink gevonden." met link naar `/wachtwoord-vergeten`
- **Edge case al ingelogd met normale sessie (niet recovery)**: redirect naar `/profiel` met hint om daar het wachtwoord te wijzigen

### 5.6 Wachtwoord wijzigen sectie op Profielpagina

**Aanpassing in:** `src/pages/ProfielPage.jsx`

- Sectie onderaan de bestaande profielpagina, gescheiden door een `<hr>` of `border-t`
- Kop: "Wachtwoord wijzigen" (`text-lg font-semibold`)
- **Alleen zichtbaar** als de gebruiker een e-mail/wachtwoord-provider heeft (gebruik `hasEmailProvider(user)` uit `src/services/auth.js`)
- Formuliervelden:
  - Nieuw wachtwoord (`password`, required, minLength 8)
  - Nieuw wachtwoord bevestigen (`password`, required, moet matchen)
- Knop: "Wachtwoord wijzigen" (vvz-green, kleiner dan de profiel-opslaan-knop of zelfde stijl)
- **Successtate**: groene inline melding: "Je wachtwoord is gewijzigd." (verdwijnt na 5 seconden), velden worden geleegd
- **Foutstate**: rode inline melding met foutomschrijving
- **Loading state**: knop disabled met spinner
- Voor OAuth-only gebruikers: sectie volledig verborgen (geen lege ruimte)

### 5.7 Account verwijderen sectie op ProfielPage

**Aanpassing in:** `src/pages/ProfielPage.jsx`

- Sectie onderaan de profielpagina, **onder** de "Wachtwoord wijzigen" sectie, gescheiden door een `border-t border-red-200`
- Kop: "Account verwijderen" (`text-lg font-semibold text-red-700`)
- Waarschuwingstekst: "Als je je account verwijdert, worden al je gegevens permanent verwijderd. Dit kan niet ongedaan worden gemaakt."
- Knop: "Account verwijderen" (`bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg`)

**Bevestigingsmodal (`DeleteAccountModal.jsx` of inline in ProfielPage):**
- Overlay: `fixed inset-0 bg-black/50 z-50 flex items-center justify-center`
- Modal card: `bg-white rounded-lg shadow-xl max-w-sm mx-4 p-6`
- Titel: "Account verwijderen" (`text-lg font-bold text-red-700`)
- Waarschuwingstekst: "Weet je zeker dat je je account wilt verwijderen? Dit kan niet ongedaan worden gemaakt. Al je gegevens worden permanent verwijderd."
- Twee knoppen:
  - "Ja, verwijder mijn account" (`bg-red-600 hover:bg-red-700 text-white w-full py-2 rounded-lg`)
  - "Annuleren" (`bg-gray-100 hover:bg-gray-200 text-gray-700 w-full py-2 rounded-lg`)
- **Laadstate:** Bevestigingsknop wordt disabled met spinner-tekst "Bezig met verwijderen..." tijdens de API-call. Annuleerknop ook disabled.
- **Foutstate:** Rode foutmelding binnen de modal (`bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg`), bijv. "Er is iets misgegaan bij het verwijderen van je account. Probeer het later opnieuw." of "Beheerders kunnen hun account niet verwijderen via deze functie."
- **Succesflow:** Modal sluit, `signOut()` wordt aangeroepen, `navigate('/')` stuurt naar homepage

**Interactieflow:**
1. Gebruiker klikt "Account verwijderen" knop
2. Bevestigingsmodal opent
3. Gebruiker klikt "Ja, verwijder mijn account"
4. Laadstate: knoppen disabled, spinner
5a. Succes: `deleteAccount()` slaagt → `signOut()` → redirect naar `/`
5b. Fout: foutmelding in modal, knoppen weer actief, gebruiker kan annuleren of opnieuw proberen

### 5.8 TopNav aanpassingen

**Wanneer niet ingelogd:**
- Rechts in de navigatiebalk: "Inloggen" link (bestaand) + "Registreren" link

**Wanneer ingelogd als gewone gebruiker:**
- Rechts: gebruikersnaam (uit `profile.display_name`)
- Klik opent dropdown met:
  - "Mijn profiel" (link naar `/profiel`)
  - "Uitloggen" (roept `signOut` aan)

**Wanneer ingelogd als beheerder:**
- Zelfde dropdown als gewone gebruiker, plus "Beheer" link (bestaand gedrag)

### 5.9 LoginPage aanpassing

- Link onderaan formulier toevoegen: "Nog geen account? [Registreer je hier](/registreren)"
- Link toevoegen bij wachtwoord-veld of onder de inlogknop: "Wachtwoord vergeten?" (link naar `/wachtwoord-vergeten`)

---

## 6. Routing

Toevoegingen aan `App.jsx`:

```jsx
import RegistrerenPage from './pages/RegistrerenPage'
import EmailBevestigdPage from './pages/EmailBevestigdPage'
import ProfielPage from './pages/ProfielPage'
import WachtwoordVergetenPage from './pages/WachtwoordVergetenPage'
import WachtwoordResettenPage from './pages/WachtwoordResettenPage'

// Binnen <Route element={<Layout />}>:
<Route path="registreren" element={<RegistrerenPage />} />
<Route path="email-bevestigd" element={<EmailBevestigdPage />} />
<Route path="wachtwoord-vergeten" element={<WachtwoordVergetenPage />} />
<Route path="wachtwoord-resetten" element={<WachtwoordResettenPage />} />
<Route path="profiel" element={
  <ProtectedRoute>
    <ProfielPage />
  </ProtectedRoute>
} />
```

---

## 7. Supabase Configuratie

### E-mail templates

In het Supabase dashboard onder Authentication > Email Templates:

- **Confirm signup** template: Nederlandstalige tekst: "Welkom bij VVZ'49 Toolbox! Klik op de onderstaande link om je e-mailadres te bevestigen." De redirect URL wordt automatisch ingevuld vanuit de `emailRedirectTo` parameter.
- **Reset password** template: Nederlandstalige tekst: "Je hebt een wachtwoord-reset aangevraagd voor je VVZ'49 Toolbox account. Klik op de onderstaande link om een nieuw wachtwoord in te stellen. Als je dit niet hebt aangevraagd, kun je deze e-mail negeren."

### Site URL & Redirect URLs

In Supabase dashboard onder Authentication > URL Configuration:
- **Site URL**: `https://thewally.github.io/vvz-toolbox/`
- **Redirect URLs**: voeg toe:
  - `https://thewally.github.io/vvz-toolbox/#/email-bevestigd`
  - `https://thewally.github.io/vvz-toolbox/auth/callback?type=recovery&next=/wachtwoord-resetten`

**Let op:** HashRouter-compatibiliteit -- Supabase stuurt de access token als URL fragment (`#access_token=...`). Omdat de app al een `#` prefix gebruikt (HashRouter), moet de `emailRedirectTo` zorgvuldig worden ingesteld. Supabase Auth stuurt tokens als query params wanneer de redirect URL al een hash bevat. Test dit grondig.

**Alternatief als hash-conflict optreedt:** maak een simpele `/auth/callback` pagina die de tokens uit de URL haalt en doorverwijst naar `/#/email-bevestigd`. Dit kan een statisch HTML-bestand in `/public/auth/callback.html` zijn.

### Supabase Edge Function: `delete-account`

De `supabase.auth.admin.deleteUser()` functie vereist de **service role key**, die nooit in de frontend mag worden opgenomen. Daarom wordt het verwijderen van een account afgehandeld door een Supabase Edge Function.

**Bestandslocatie:** `supabase/functions/delete-account/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Haal de JWT uit de Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Geen autorisatie-header gevonden.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Verifieer de JWT en haal de gebruiker op via de anon key (gebruiker-context)
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Ongeldige sessie.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Admin-check: beheerders mogen zichzelf niet verwijderen via deze flow
    //    Controleer of de gebruiker de 'admin' role heeft in user_roles (indien de tabel bestaat)
    //    OF check app_metadata.role === 'admin'
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check via app_metadata (betrouwbaarder, niet manipuleerbaar door gebruiker)
    if (user.app_metadata?.role === 'admin') {
      return new Response(
        JSON.stringify({ error: 'Beheerders kunnen hun account niet verwijderen via deze functie. Neem contact op met een andere beheerder.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Optioneel: check ook user_roles tabel (wanneer rolbeheer is geïmplementeerd)
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
    if (roles?.some((r: { role: string }) => r.role === 'admin')) {
      return new Response(
        JSON.stringify({ error: 'Beheerders kunnen hun account niet verwijderen via deze functie. Neem contact op met een andere beheerder.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Verwijder het auth.users-record (profiles wordt automatisch verwijderd via CASCADE)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (deleteError) {
      return new Response(
        JSON.stringify({ error: 'Verwijderen mislukt. Probeer het later opnieuw.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Onverwachte fout. Probeer het later opnieuw.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

**Werking:**
1. De frontend stuurt de gebruikers-JWT mee in de `Authorization` header
2. De Edge Function verifieert de JWT via een Supabase client met de **anon key** (gebruiker-context)
3. Er wordt gecontroleerd of de gebruiker een admin is (via `app_metadata.role` en/of `user_roles`-tabel). Admins krijgen een 403-fout.
4. Het `auth.users`-record wordt verwijderd via `supabaseAdmin.auth.admin.deleteUser()` met de **service role key**
5. Het `profiles`-record wordt automatisch verwijderd via de `ON DELETE CASCADE` constraint op de foreign key

**Deployment:**
```bash
supabase functions deploy delete-account
```

De Edge Function heeft automatisch toegang tot `SUPABASE_URL`, `SUPABASE_ANON_KEY` en `SUPABASE_SERVICE_ROLE_KEY` als environment variables.

**Aandachtspunt:** Wanneer de `user_roles`-tabel nog niet bestaat (rolbeheer nog niet geïmplementeerd), gooit de query geen fout — Supabase retourneert een lege array of een 404 die we kunnen negeren. De `app_metadata.role`-check dient als primaire guard.

---

## 8. Implementatieplan

| # | Taak | Complexiteit | Afhankelijkheid |
|---|------|-------------|-----------------|
| 1 | SQL: `profiles` tabel, trigger, RLS policies aanmaken in Supabase | S | - |
| 2 | Supabase dashboard: e-mail template NL, redirect URLs configureren | S | - |
| 3 | `src/services/profiles.js` aanmaken | S | #1 |
| 4 | `AuthContext.jsx` uitbreiden met `signUp`, `profile`, `refreshProfile` | M | #3 |
| 5 | `RegistrerenPage.jsx` bouwen | M | #4 |
| 6 | `EmailBevestigdPage.jsx` bouwen | S | - |
| 7 | `ProfielPage.jsx` bouwen | M | #3, #4 |
| 8 | `LoginPage.jsx` aanpassen (link naar registreren) | S | #5 |
| 9 | `TopNav.jsx` aanpassen (user dropdown met profiel/uitloggen) | M | #4 |
| 10 | `App.jsx` routes toevoegen | S | #5, #6, #7, #10a, #10b |
| 10a | `src/services/auth.js` aanmaken (sendPasswordReset, updatePassword, hasEmailProvider) | S | - |
| 10b | `WachtwoordVergetenPage.jsx` bouwen | M | #10a |
| 10c | `WachtwoordResettenPage.jsx` bouwen | M | #10a, #11 |
| 10d | `ProfielPage.jsx` uitbreiden met "Wachtwoord wijzigen" sectie | M | #10a, #7 |
| 10e | `LoginPage.jsx` aanpassen: "Wachtwoord vergeten?" link toevoegen | S | #10b |
| 10f | Supabase dashboard: Reset password e-mail template in het Nederlands + redirect URL | S | #2 |
| 11 | HashRouter + Supabase e-mail redirect testen en eventueel callback-pagina (inclusief recovery flow) | M | #2, #10f |
| 12 | End-to-end test: registreren, e-mail bevestigen, inloggen, profiel bewerken, wachtwoord vergeten, wachtwoord resetten, wachtwoord wijzigen, account verwijderen | M | alles |
| 12a | Supabase Edge Function `delete-account` bouwen en deployen | M | - |
| 12b | `deleteAccount()` functie toevoegen aan `src/services/auth.js` | S | #12a |
| 12c | `ProfielPage.jsx` uitbreiden met "Account verwijderen" knop en bevestigingsmodal | M | #12b, #7 |
| 12d | `AuthContext.jsx`: na account-verwijdering signOut aanroepen en redirect naar homepage | S | #12c, #4 |
| 12e | Edge Function testen: succesvolle verwijdering, admin-blokkering, ongeldige JWT, netwerk-fout | M | #12a |

**Kritiek pad:** #1 > #3 > #4 > #5/#7/#9 > #10 > #11 > #12

**Wachtwoord-pad:** #10a > #10b/#10c/#10d (parallel) > #10e > #12

**Account-verwijdering-pad:** #12a > #12b > #12c > #12d > #12e

---

## 9. Risico's en Aandachtspunten

1. **HashRouter + Supabase e-mail redirect**: De combinatie van HashRouter (`/#/`) en Supabase's token-fragment kan conflicteren. Dit moet vroeg getest worden (taak #11). Fallback: statisch callback HTML-bestand.

2. **Bestaande beheerders**: Huidige admin-accounts hebben mogelijk nog geen `profiles`-rij. Oplossing: voer een eenmalige migratie uit die voor bestaande `auth.users` een `profiles`-rij aanmaakt. Of: laat de UI graceful omgaan met ontbrekende profielen (fallback naar `user.email` als display name).

3. **Spam-registraties**: Supabase heeft ingebouwde rate limiting voor sign-ups. Overweeg voor de toekomst een CAPTCHA (Supabase ondersteunt hCaptcha). Buiten scope voor MVP.

4. **Wachtwoord-reset en recovery sessie**: Bij een wachtwoord-reset stuurt Supabase een `type=recovery` event via `onAuthStateChange`. De `WachtwoordResettenPage` moet luisteren naar dit event om te weten dat de gebruiker via een geldige resetlink is binnengekomen. Als de recovery-token verlopen is (standaard 1 uur in Supabase), faalt `updateUser` met een foutmelding. De UI moet dit graceful afhandelen met een link naar `/wachtwoord-vergeten`.

5. **OAuth-gebruikers en wachtwoord wijzigen**: Gebruikers die uitsluitend via OAuth zijn geregistreerd hebben geen wachtwoord in Supabase Auth. De "Wachtwoord wijzigen" sectie op de profielpagina moet voor deze gebruikers verborgen zijn. Detectie via `user.identities` — als er geen identity met `provider === 'email'` is, is het een OAuth-only account.

6. **Account verwijderen en Edge Function**: De `delete-account` Edge Function vereist dat `SUPABASE_SERVICE_ROLE_KEY` beschikbaar is als environment variable. Dit is standaard het geval in Supabase Edge Functions. De admin-check kijkt naar zowel `app_metadata.role` als de `user_roles`-tabel; wanneer `user_roles` nog niet bestaat, faalt de query graceful (lege resultaat). Test de Edge Function apart voordat de frontend wordt gebouwd.

7. **Relatie met rolbeheer**: De `profiles`-tabel is de basis voor toekomstige roltoekenning. Het rolbeheer-spec (`.claude/specs/rolbeheer.md`) definieert `user_roles` die aan `auth.users(id)` linkt. Deze specs zijn complementair; `profiles` voegt displaygegevens toe, `user_roles` voegt autorisatie toe.

---

## 10. Buiten Scope

- **Rolbeheer / autorisatie**: geregistreerde gebruikers krijgen geen extra rechten; dat is een aparte feature
- ~~**Social login** (Google, Facebook): niet in scope~~ **Verplaatst naar scope** — zie sectie 11 (OAuth Providers: Google, Microsoft, Facebook, X)
- **Admin-overzicht van gebruikers**: hoort bij rolbeheer-feature
- **Profielfoto / avatar**: nice-to-have voor later
- **E-mailadres wijzigen**: niet in MVP
- **Naam wijzigen in profiel**: niet in MVP (readonly na registratie)
- **CAPTCHA / anti-spam**: niet in MVP

---

## 11. OAuth Providers (Google, Microsoft, Facebook en X)

### 11.1 Overzicht

Naast e-mail/wachtwoord-registratie kunnen gebruikers inloggen via vier OAuth-providers. Alle verlopen via Supabase Auth, die als tussenlaag fungeert. De gebruiker klikt op een knop, wordt doorgestuurd naar de provider, en keert terug naar de app met een actieve sessie.

Bij eerste OAuth-login wordt automatisch een `auth.users`-rij aangemaakt door Supabase. De bestaande `handle_new_user()` trigger maakt vervolgens het `profiles`-record aan. De `display_name` wordt gelezen uit `raw_user_meta_data` — OAuth-providers vullen dit standaard met de naam van het account.

**Belangrijk:** OAuth-gebruikers hebben **geen wachtwoord** in Supabase Auth. Dit is volledig compatibel met het bestaande datamodel: de `profiles`-tabel refereert aan `auth.users(id)` en heeft geen wachtwoord-gerelateerde kolommen.

### 11.2 Supabase Configuratie per Provider

Alle providers worden ingeschakeld in het Supabase dashboard onder **Authentication > Providers**.

**Redirect URL voor alle providers:**
```
https://thewally.github.io/vvz-toolbox/auth/callback
```

Dit is dezelfde callback-pagina die nodig is voor e-mailverificatie (zie sectie 7 / risico #1). De callback-pagina verwerkt de tokens en stuurt door naar de juiste HashRouter-route.

#### Google

1. Ga naar [Google Cloud Console](https://console.cloud.google.com/) > APIs & Services > Credentials
2. Maak een **OAuth 2.0 Client ID** aan (type: Web application)
3. Voeg als Authorized redirect URI toe: `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
4. Kopieer de **Client ID** en **Client Secret**
5. In Supabase dashboard > Authentication > Providers > Google:
   - Schakel in
   - Plak Client ID en Client Secret

**Aandachtspunten:**
- Het OAuth consent screen moet geconfigureerd worden (app-naam "VVZ'49 Toolbox", logo)
- Voor productie: consent screen publiceren (anders alleen test-users)

#### Microsoft

1. Ga naar [Azure Portal](https://portal.azure.com/) > Azure Active Directory > App registrations
2. Maak een nieuwe app registration aan
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback` (type: Web)
3. Onder Certificates & secrets: maak een **Client Secret** aan
4. Noteer de **Application (client) ID** en **Client Secret**
5. In Supabase dashboard > Authentication > Providers > Azure:
   - Schakel in
   - Plak Client ID en Client Secret
   - Azure Tenant: `common` (voor zowel organisatie- als persoonlijke accounts)

**Aandachtspunten:**
- Gebruik tenant `common` zodat zowel @outlook.com als organisatie-accounts werken
- De secret heeft een vervaldatum — stel een reminder in

#### Facebook

1. Ga naar [Meta for Developers](https://developers.facebook.com/) en maak een nieuwe app aan (type: Consumer)
2. Voeg het product **Facebook Login** toe aan de app
3. Onder Facebook Login > Settings: voeg als Valid OAuth Redirect URI toe: `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
4. Onder Settings > Basic: kopieer de **App ID** en **App Secret**
5. In Supabase dashboard > Authentication > Providers > Facebook:
   - Schakel in
   - Plak App ID en App Secret

**Aandachtspunten:**
- Voor productie moet de app door **Facebook App Review** — zonder review werkt de app alleen voor gebruikers met de Developer/Tester-rol in de Facebook App
- App Review vereist een privacybeleid-URL en een beschrijving van het datagebruik
- Vraag alleen de `email` en `public_profile` permissions aan (geen review nodig voor deze basis-permissions)

#### X (Twitter)

1. Ga naar [X Developer Portal](https://developer.twitter.com/) en maak een Project + App aan
2. De **Free tier** is voldoende voor OAuth 2.0 sign-in
3. Onder de App settings: schakel **OAuth 2.0** in
   - Type: Web App
   - Callback URL: `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
4. Kopieer de **Client ID** en **Client Secret** (OAuth 2.0)
5. In Supabase dashboard > Authentication > Providers > Twitter:
   - Schakel in
   - Plak Client ID en Client Secret

**Aandachtspunten:**
- De Free tier heeft rate limits; voor een kleine voetbalclub is dit ruim voldoende
- Supabase provider-naam is `'twitter'` (niet `'x'`)

### 11.3 HashRouter + OAuth Redirect

Dit is hetzelfde probleem als bij e-mailverificatie (sectie 7, risico #1), maar nu voor OAuth.

**Het probleem:** Na succesvolle OAuth-login stuurt Supabase de browser naar de redirect URL met tokens in de URL-fragment (`#access_token=...`). Maar de HashRouter gebruikt `#` al voor routing, wat conflicteert.

**Oplossing:** Een statisch HTML-bestand `/public/auth/callback.html` dat:
1. De tokens uit de URL haalt (Supabase plaatst ze als query params of fragment)
2. `supabase.auth.exchangeCodeForSession()` aanroept (voor PKCE flow)
3. Doorverwijst naar `/#/profiel` (of `/#/` voor homepage)

```html
<!-- public/auth/callback.html -->
<!DOCTYPE html>
<html>
<head><title>Bezig met inloggen...</title></head>
<body>
  <p>Bezig met inloggen...</p>
  <script>
    // Supabase JS client nodig voor token exchange
    // Verwijs door naar de app die het token oppikt via onAuthStateChange
    const hash = window.location.hash
    const search = window.location.search
    // Redirect naar de app root — de AuthContext's onAuthStateChange handler
    // pikt de sessie automatisch op
    const base = '/vvz-toolbox/'
    const params = new URLSearchParams(search)
    const nextPath = params.get('next') || '/profiel'
    params.delete('next')
    const remainingSearch = params.toString() ? '?' + params.toString() : ''
    window.location.replace(base + '#' + nextPath + remainingSearch + (hash ? '&' + hash.substring(1) : ''))
  </script>
</body>
</html>
```

**Let op:** De exacte implementatie van de callback hangt af van of Supabase PKCE (default sinds Supabase v2) of implicit flow gebruikt. Bij PKCE moet `exchangeCodeForSession(code)` worden aangeroepen. Test dit grondig met elke provider.

**Redirect URLs in Supabase dashboard** (Authentication > URL Configuration > Redirect URLs):
- `https://thewally.github.io/vvz-toolbox/auth/callback`

### 11.4 Trigger-aanpassing voor OAuth

De bestaande `handle_new_user()` trigger werkt al voor OAuth, maar de `display_name`-extractie kan robuuster:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',  -- e-mail registratie
      NEW.raw_user_meta_data->>'full_name',      -- Google, Microsoft
      NEW.raw_user_meta_data->>'name',           -- Facebook, X (Twitter)
      split_part(NEW.email, '@', 1),             -- fallback: deel voor @
      'Gebruiker'                                -- ultieme fallback
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

De veldnamen in `raw_user_meta_data` verschillen per provider:
- **Google**: `full_name`, `avatar_url`, `email`
- **Microsoft**: `full_name`, `email`
- **Facebook**: `name`, `email`
- **X (Twitter)**: `name`, `user_name`, `email` (e-mail is optioneel — gebruiker kan dit weigeren)

### 11.5 UI/UX: OAuth-knoppen

#### Op RegistrerenPage en LoginPage

Voeg boven het e-mail/wachtwoord-formulier een sectie toe met OAuth-knoppen, gescheiden door een divider.

**Layout (van boven naar beneden):**

```
┌─────────────────────────────────┐
│                                 │
│  [G] Doorgaan met Google        │  ← wit, grijze border, Google-logo
│  [⊞] Doorgaan met Microsoft    │  ← wit, grijze border, Microsoft-logo
│  [f] Doorgaan met Facebook      │  ← Facebook blauw (#1877F2), wit tekst
│  [𝕏] Doorgaan met X            │  ← zwart (#000000), wit tekst
│                                 │
│  ──────── of ────────           │  ← divider
│                                 │
│  E-mail: [_______________]      │
│  Wachtwoord: [___________]      │
│  ...                            │
│                                 │
└─────────────────────────────────┘
```

**Volgorde:** Google — Microsoft — Facebook — X

**Styling per knop:**
- **Google**: `bg-white border border-gray-300 text-gray-700 hover:bg-gray-50` — officieel Google "G" logo als SVG
- **Microsoft**: `bg-white border border-gray-300 text-gray-700 hover:bg-gray-50` — Microsoft vier-kleuren logo als SVG
- **Facebook**: `bg-[#1877F2] text-white hover:bg-[#166FE5]` — Facebook "f" logo als witte SVG
- **X (Twitter)**: `bg-black text-white hover:bg-gray-900` — X logo (𝕏) als witte SVG
- Alle knoppen: `w-full py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-3`
- Gebruik officiële brand-logo's als inline SVG (geen externe afbeeldingen)

**Divider:**
```jsx
<div className="flex items-center gap-4 my-4">
  <div className="flex-1 h-px bg-gray-300" />
  <span className="text-sm text-gray-500">of</span>
  <div className="flex-1 h-px bg-gray-300" />
</div>
```

**Tekst op LoginPage:** "Doorgaan met {provider}"
**Tekst op RegistrerenPage:** "Registreren met {provider}"

#### Service-functie voor OAuth login

Voeg toe aan `AuthContext.jsx`:

```js
const signInWithProvider = async (provider) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider, // 'google', 'azure', 'facebook', 'twitter'
    options: {
      redirectTo: 'https://thewally.github.io/vvz-toolbox/auth/callback',
    },
  })
  return { data, error }
}
```

**Context value wordt:**
```js
{ user, profile, loading, signIn, signUp, signInWithProvider, signOut, refreshProfile }
```

**Let op:** De Supabase provider-namen: Microsoft = `'azure'`, Facebook = `'facebook'`, X = `'twitter'`.

#### Nieuw component: `src/components/OAuthButtons.jsx`

Herbruikbaar component dat op zowel LoginPage als RegistrerenPage wordt gebruikt:

```jsx
/**
 * @param {'login' | 'register'} mode - Bepaalt de knoptekst
 */
export default function OAuthButtons({ mode = 'login' }) {
  // ...
}
```

### 11.6 Uitbreiding Implementatieplan

Voeg de volgende taken toe aan het bestaande plan (sectie 8):

| # | Taak | Complexiteit | Afhankelijkheid |
|---|------|-------------|-----------------|
| 13 | Provider-accounts aanmaken: Google Cloud OAuth client, Azure AD App Registration, Facebook App (Meta for Developers), X App (X Developer Portal) | M | - |
| 14 | Supabase dashboard: vier providers inschakelen met credentials | S | #13 |
| 15 | `handle_new_user()` trigger bijwerken met robuustere naam-extractie voor OAuth (incl. `name` voor Facebook/X) | S | #1 |
| 16 | `/public/auth/callback.html` callback-pagina bouwen (tokens verwerken, redirect naar HashRouter) | M | #14 |
| 17 | `OAuthButtons.jsx` component bouwen (vier knoppen met officiële logo's en brand-kleuren) | M | - |
| 18 | `AuthContext.jsx` uitbreiden met `signInWithProvider` functie | S | #4 |
| 19 | `RegistrerenPage.jsx` en `LoginPage.jsx` uitbreiden met OAuthButtons | S | #17, #18 |
| 20 | OAuth-flow end-to-end testen per provider (Google, Microsoft, Facebook, X) | M | #16, #19 |

**Aangepast kritiek pad:** #13 > #14 > #16 > #20 (parallel aan het e-mail registratiepad)

**Facebook-specifiek pad:** Facebook App aanmaken (#13) > App Review aanvragen (na MVP-launch, kan weken duren)

### 11.7 Risico's en Aandachtspunten (OAuth-specifiek)

1. **Microsoft secret vervaldatum**: Azure client secrets verlopen (max 2 jaar). Stel een reminder in en documenteer hoe de secret wordt geroteerd.

2. **PKCE flow**: Supabase v2 gebruikt standaard PKCE voor OAuth. De callback-pagina moet `exchangeCodeForSession` aanroepen. Dit werkt anders dan de implicit flow en moet per provider getest worden.

3. **Account linking**: Als een gebruiker eerst met e-mail registreert en later met Google inlogt (zelfde e-mailadres), worden dit **twee aparte accounts** in Supabase. Supabase biedt geen automatische account-linking. Documenteer dit voor gebruikers of overweeg in de toekomst handmatige linking via de admin.

4. **GitHub Pages + callback route**: Het bestand `/public/auth/callback.html` wordt door Vite meegenomen in de build. Het pad wordt `https://thewally.github.io/vvz-toolbox/auth/callback.html`. In Supabase moet de redirect URL exact overeenkomen, inclusief `.html` als GitHub Pages dat vereist. Test of GitHub Pages het pad met of zonder `.html` serveert.

5. **Facebook App Review**: Zonder App Review is Facebook-login alleen beschikbaar voor gebruikers met een Developer- of Tester-rol in de Facebook App. Voor publiek gebruik moet de app door het App Review-proces (vereist privacybeleid-URL en datagebruik-beschrijving). De basis-permissions `email` en `public_profile` hoeven geen review te doorlopen, maar de app zelf moet wel in "Live" modus staan.

6. **X (Twitter) Free tier rate limits**: De Free tier van het X Developer Portal heeft beperkte rate limits (bijv. 100 requests per 15 minuten voor user auth). Voor een kleine voetbalclub is dit ruim voldoende, maar houd er rekening mee bij grote evenementen of als het ledenaantal groeit.

7. **X (Twitter) e-mail niet altijd beschikbaar**: X-gebruikers kunnen hun e-mailadres privé houden. In dat geval ontvangt Supabase geen e-mail, wat kan leiden tot problemen bij account-linking of communicatie. Overweeg een fallback die de gebruiker vraagt om een e-mailadres in te vullen na eerste login.
