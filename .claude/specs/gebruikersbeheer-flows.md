# Feature Spec: Gebruikersbeheer Flows

> Referentiedocument voor de geimplementeerde uitnodigings- en wachtwoord-flows.

---

## 1. Overzicht

Dit document beschrijft twee authenticatie-flows in de VVZ Toolbox:

1. **Nieuwe gebruiker aanmaken** — Een beheerder nodigt een gebruiker uit; de gebruiker activeert het account door een wachtwoord in te stellen.
2. **Wachtwoord vergeten / resetten** — Een bestaande gebruiker reset het wachtwoord via e-mail.

Beide flows gebruiken Supabase Auth met een `auth/callback.html` tussenstap om redirect-tokens correct door te sluizen naar de HashRouter.

---

## 2. Functionele vereisten

### Flow 1: Uitnodiging nieuwe gebruiker

| # | User story |
|---|-----------|
| U1 | Als beheerder wil ik een gebruiker aanmaken met naam en e-mailadres via `/beheer/gebruikers`, zodat de gebruiker een uitnodigingsmail ontvangt. |
| U2 | Als uitgenodigde gebruiker wil ik op de activatieknop in de e-mail klikken en direct naar het wachtwoord-instellen scherm gaan. |
| U3 | Als uitgenodigde gebruiker wil ik NIET ingelogd zijn totdat ik mijn wachtwoord heb ingesteld. |
| U4 | Als uitgenodigde gebruiker wil ik na het instellen van mijn wachtwoord doorgestuurd worden naar het inlogscherm. |
| U5 | Als ingelogde gebruiker met `password_set = false` wil ik automatisch doorgestuurd worden naar `/wachtwoord-instellen`. |

### Flow 2: Wachtwoord vergeten

| # | User story |
|---|-----------|
| W1 | Als gebruiker wil ik op "Wachtwoord vergeten" klikken in het inlogscherm en mijn e-mailadres invoeren. |
| W2 | Als gebruiker wil ik een reset-mail ontvangen met een link naar `/wachtwoord-resetten`. |
| W3 | Als gebruiker wil ik NIET ingelogd zijn totdat ik mijn nieuwe wachtwoord heb opgeslagen. |
| W4 | Als gebruiker wil ik na het opslaan uitgelogd worden en doorgestuurd naar het inlogscherm. |
| W5 | Als ingelogde gebruiker met een actieve `PASSWORD_RECOVERY` sessie wil ik automatisch doorgestuurd worden naar `/wachtwoord-resetten`. |

---

## 3. Technische implementatie

### 3.1 Bestanden

| Bestand | Rol |
|---------|-----|
| `public/auth/callback.html` | Verwerkt Supabase redirect-tokens en stuurt door naar HashRouter |
| `src/pages/WachtwoordInstellenPage.jsx` | Wachtwoord instellen na uitnodiging (route: `/wachtwoord-instellen`) |
| `src/pages/WachtwoordVergetenPage.jsx` | E-mailadres invoeren voor reset (route: `/wachtwoord-vergeten`) |
| `src/pages/WachtwoordResettenPage.jsx` | Nieuw wachtwoord instellen na reset (route: `/wachtwoord-resetten`) |
| `src/services/auth.js` | Service-functies: `inviteUser`, `sendPasswordReset`, `updatePassword` |
| `src/services/profiles.js` | `markPasswordSet(userId)` — zet `password_set = true` |
| `src/context/AuthContext.jsx` | Beheert `pendingPasswordRecovery` state bij `PASSWORD_RECOVERY` event |
| `src/components/ProtectedRoute.jsx` | Redirect-logica voor `password_set === false` en `pendingPasswordRecovery` |
| Supabase Edge Function `invite-user` | Server-side uitnodiging met service role key |

### 3.2 Redirect-keten

#### Uitnodiging (invite)

```
Beheerder maakt gebruiker aan
  → Edge Function `invite-user` roept supabase.auth.admin.inviteUserByEmail() aan
  → redirectTo: https://thewally.github.io/vvz-toolbox/auth/callback?type=invite&next=/wachtwoord-instellen
  → auth/callback.html parseert tokens en redirect naar:
    /vvz-toolbox/?code=...#/wachtwoord-instellen&access_token=...
  → WachtwoordInstellenPage luistert op SIGNED_IN event
  → Slaat sessie-tokens op in component state
  → Roept supabase.auth.signOut() aan (gebruiker is uitgelogd)
  → Toont wachtwoord-formulier
  → Bij opslaan: supabase.auth.setSession() → updatePassword() → markPasswordSet() → signOut()
  → Redirect naar /login
```

#### Wachtwoord resetten (recovery)

```
Gebruiker vraagt reset aan via /wachtwoord-vergeten
  → sendPasswordReset() roept supabase.auth.resetPasswordForEmail() aan
  → redirectTo: https://thewally.github.io/vvz-toolbox/auth/callback?type=recovery&next=/wachtwoord-resetten
  → auth/callback.html parseert tokens en redirect naar HashRouter
  → AuthContext vangt PASSWORD_RECOVERY event op → pendingPasswordRecovery = true
  → WachtwoordResettenPage luistert op PASSWORD_RECOVERY event → hasSession = true
  → Bij opslaan: updatePassword() → supabase.auth.signOut()
  → Redirect naar /login
```

### 3.3 auth/callback.html mechanisme

De `callback.html` pagina is een statisch HTML-bestand in `/public/auth/` dat:

1. De `next` parameter uit de query string leest (met validatie: moet starten met `/`, niet met `//`)
2. De `type` parameter verwijdert uit de doorgestuurde params
3. De resterende query params en hash fragment combineert tot een HashRouter-compatibele URL
4. Redirect via `window.location.replace()` naar: `base + remainingSearch + '#' + nextPath + hashFragment`

### 3.4 WachtwoordInstellenPage — sessie-beveiliging

Het kernprobleem: bij een invite-link wordt de gebruiker automatisch ingelogd door Supabase (`SIGNED_IN` event), maar het wachtwoord is nog niet ingesteld. De oplossing:

1. Luister op `SIGNED_IN` event
2. Sla `access_token` en `refresh_token` op in component state (`savedSession`)
3. Roep **direct** `supabase.auth.signOut()` aan — de gebruiker is nu uitgelogd
4. Toon het wachtwoord-formulier
5. Bij submit: herstel de sessie via `supabase.auth.setSession(savedSession)`, stel wachtwoord in, en log weer uit
6. Timeout van 3 seconden: als er geen `SIGNED_IN` event binnenkomt, toon foutmelding

### 3.5 ProtectedRoute guards

`ProtectedRoute` bevat twee extra redirects:

1. **`pendingPasswordRecovery === true`** → redirect naar `/wachtwoord-resetten`
2. **`profile?.password_set === false`** → redirect naar `/wachtwoord-instellen` (alleen als `profile !== null`)

Deze guards zorgen ervoor dat gebruikers niet de applicatie kunnen gebruiken zonder eerst hun wachtwoord (opnieuw) in te stellen.

### 3.6 AuthContext — pendingPasswordRecovery

In `AuthContext.jsx`:

- Bij `PASSWORD_RECOVERY` event: `setPendingPasswordRecovery(true)`
- Bij `USER_UPDATED` of `SIGNED_OUT` event: `setPendingPasswordRecovery(false)`
- Wordt doorgegeven via context en gebruikt door `ProtectedRoute`

### 3.7 Service-functies

```javascript
// src/services/auth.js
inviteUser(email, displayName)     // POST naar Edge Function invite-user
sendPasswordReset(email)           // supabase.auth.resetPasswordForEmail()
updatePassword(newPassword)        // supabase.auth.updateUser({ password })

// src/services/profiles.js
markPasswordSet(userId)            // UPDATE profiles SET password_set = true WHERE id = userId
```

### 3.8 Database

De `profiles` tabel bevat:

| Kolom | Type | Default | Beschrijving |
|-------|------|---------|-------------|
| `password_set` | `BOOLEAN NOT NULL` | `false` | Geeft aan of de gebruiker een wachtwoord heeft ingesteld |

---

## 4. Edge cases en foutscenario's

### Flow 1: Uitnodiging

| Scenario | Gedrag |
|----------|--------|
| Gebruiker opent pagina zonder invite-link (geen `access_token` in URL) | Redirect naar `/profiel` (als ingelogd) of `/login` (als niet ingelogd) |
| Invite-link is verlopen | Geen `SIGNED_IN` event binnen 3 seconden → foutmelding "Geen geldige uitnodigingslink gevonden" |
| Sessie verlopen tijdens invullen formulier | `supabase.auth.setSession()` faalt → foutmelding "Sessie verlopen. Gebruik de link uit de uitnodigingsmail opnieuw." |
| Wachtwoord korter dan 8 tekens | Client-side validatie: "Wachtwoord moet minimaal 8 tekens bevatten." |
| Wachtwoorden komen niet overeen | Client-side validatie: "Wachtwoorden komen niet overeen." |
| `savedSession` is null bij submit | Foutmelding "Sessie verlopen" |
| `markPasswordSet` faalt | Wachtwoord is wel ingesteld maar `password_set` blijft `false` — gebruiker wordt bij volgende login opnieuw naar `/wachtwoord-instellen` gestuurd (self-healing: ze stellen het wachtwoord opnieuw in) |

### Flow 2: Wachtwoord resetten

| Scenario | Gedrag |
|----------|--------|
| Onbekend e-mailadres | Succesbericht getoond (security: geen informatie over bestaan account) |
| Reset-link verlopen | Geen `PASSWORD_RECOVERY` event binnen 3 seconden → foutmelding "Geen geldige resetlink gevonden" met link naar "Vraag een nieuwe link aan" |
| Supabase fout bij wachtwoord wijzigen met "expired" of "invalid" | Foutmelding: "Deze link is verlopen of ongeldig." met link naar `/wachtwoord-vergeten` |
| Wachtwoord korter dan 8 tekens | Client-side validatie |
| Wachtwoorden komen niet overeen | Client-side validatie |

---

## 5. Supabase configuratie vereisten

### 5.1 Redirect URLs

De volgende URLs moeten geconfigureerd zijn in Supabase Dashboard > Authentication > URL Configuration > Redirect URLs:

```
https://thewally.github.io/vvz-toolbox/auth/callback?type=invite&next=/wachtwoord-instellen
https://thewally.github.io/vvz-toolbox/auth/callback?type=recovery&next=/wachtwoord-resetten
```

### 5.2 Edge Functions

| Functie | Doel | Authenticatie |
|---------|------|--------------|
| `invite-user` | Roept `supabase.auth.admin.inviteUserByEmail()` aan met service role key | Bearer token van ingelogde beheerder; functie zelf gebruikt `SUPABASE_SERVICE_ROLE_KEY` |
| `list-users` | Haalt alle gebruikers op via admin API | Bearer token van ingelogde beheerder |
| `delete-user` | Verwijdert een gebruiker via admin API | Bearer token van ingelogde beheerder |

De Edge Functions staan NIET in de repository (ze worden apart gedeployed naar Supabase). De `invite-user` functie stelt de `redirectTo` in op de callback URL met `type=invite`.

### 5.3 E-mail templates

Supabase stuurt automatisch de invite- en recovery-e-mails. De templates kunnen aangepast worden in Supabase Dashboard > Authentication > Email Templates:

- **Invite**: Bevat activatieknop met de `redirectTo` URL
- **Recovery**: Bevat resetknop met de `redirectTo` URL

---

## 6. Routes

| Route | Pagina | Publiek/Beschermd |
|-------|--------|-------------------|
| `/wachtwoord-instellen` | `WachtwoordInstellenPage` | Publiek (geen ProtectedRoute) |
| `/wachtwoord-vergeten` | `WachtwoordVergetenPage` | Publiek |
| `/wachtwoord-resetten` | `WachtwoordResettenPage` | Publiek (geen ProtectedRoute) |
| `/beheer/gebruikers` | Gebruikersbeheer | Beschermd (admin only) |
