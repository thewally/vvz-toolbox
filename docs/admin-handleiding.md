# Admin-handleiding VVZ'49 Toolbox

Deze handleiding beschrijft hoe je als beheerder de VVZ'49 Toolbox beheert.

---

## Toegang

De beheeromgeving is bereikbaar via de **Beheer**-knop in de navigatie (alleen zichtbaar als je ingelogd bent en minstens één rol hebt).

**Directe URL:** [https://thewally.github.io/vvz-toolbox/beheer](https://thewally.github.io/vvz-toolbox/beheer)

### Inloggen

1. Ga naar [https://thewally.github.io/vvz-toolbox/login](https://thewally.github.io/vvz-toolbox/login)
2. Vul je e-mailadres en wachtwoord in
3. Klik op **Inloggen**

Na het inloggen verschijnt de **Beheer**-knop in de navigatie.

### Eerste keer inloggen (uitnodiging)

Als je bent uitgenodigd door een beheerder:

1. Open de link in de uitnodigingsmail
2. Je wordt doorgestuurd naar de toolbox
3. Stel een wachtwoord in op de pagina die verschijnt
4. Na het instellen kun je direct aan de slag

### Wachtwoord vergeten

1. Ga naar de inlogpagina
2. Klik op **Wachtwoord vergeten?**
3. Vul je e-mailadres in en klik op **Verstuur reset-link**
4. Open de link in de ontvangen e-mail
5. Stel een nieuw wachtwoord in

---

## Beheerdashboard

Na het inloggen zie je het beheerdashboard met tegels voor de onderdelen waartoe je toegang hebt. Klik op een tegel om naar dat onderdeel te gaan.

Je ziet alleen de onderdelen waarvoor je een rol hebt gekregen. Beheerders met de admin-rol zien alles.

---

## Activiteiten beheren

### Activiteit toevoegen

1. Ga naar **Beheer → Activiteiten**
2. Klik op **Nieuwe activiteit**
3. Vul het formulier in (zie "Velden" hieronder)
4. Klik op **Opslaan**

### Velden

| Veld | Verplicht | Omschrijving |
|---|---|---|
| **Titel** | ja | Naam van de activiteit |
| **Type datum** | ja | Kies uit: *Enkele datum*, *Periode* of *Datumlijst* |
| **Datum** | ja* | Datum (bij enkele datum) |
| **Startdatum / Einddatum** | ja* | Startdatum verplicht, einddatum optioneel (bij periode) |
| **Datums** | ja* | Lijst van losse datums in `jjjj-mm-dd`-formaat, een per regel (bij datumlijst) |
| **Starttijd** | nee | Bijv. `14:00` |
| **Eindtijd** | nee | Bijv. `16:00` |
| **Omschrijving** | nee | Korte beschrijving |
| **URL** | nee | Link naar meer informatie |

*Afhankelijk van het gekozen datumtype is een van deze groepen verplicht.

### Datumtypen

**Enkele datum** — activiteit op een dag, zoals een wedstrijd of vergadering.

**Periode** — aaneengesloten meerdaagse activiteit, zoals een zomerkamp. Vul een startdatum in; de einddatum is optioneel.

**Datumlijst** — terugkerende activiteit op losse datums. Voer de datums in het formaat `jjjj-mm-dd` in, een per regel. Elke datum verschijnt als aparte kaart in de agenda, maar wordt als groep beheerd.

### Activiteit bewerken

1. Ga naar **Beheer → Activiteiten**
2. Klik op het potlood-icoon bij de gewenste activiteit
3. Pas de gegevens aan en klik op **Wijziging opslaan**

### Activiteit verwijderen

1. Ga naar **Beheer → Activiteiten**
2. Klik op het prullenbak-icoon bij de gewenste activiteit
3. Bevestig de verwijdering

Bij activiteiten van het type *Datumlijst* worden alle datums in de reeks verwijderd.

---

## Trainingsschema beheren

### Teams beheren

1. Ga naar **Beheer → Trainingsschema → Instellingen**
2. Klik op het tabblad **Teams**
3. Voeg teams toe, bewerk namen en categorie, of verwijder ze

Teams zijn ingedeeld in categorieen: **Pupillen**, **Junioren**, **Senioren** en **Veteranen**.

### Velden beheren

1. Ga naar **Beheer → Trainingsschema → Instellingen**
2. Klik op het tabblad **Velden**
3. Voeg velden toe, bewerk namen en volgorde, of zet velden op inactief

---

## Gebruikers en rollen beheren

> Vereiste rol: `gebruikers` of admin

### Gebruiker uitnodigen

1. Ga naar **Beheer → Gebruikers**
2. Klik op **Gebruiker uitnodigen**
3. Vul het e-mailadres in
4. Klik op **Uitnodigen**

De gebruiker ontvangt een e-mail met een link om een wachtwoord in te stellen.

### Rollen toekennen

1. Ga naar **Beheer → Gebruikers**
2. Klik op het rol-icoon naast de gebruiker
3. In de modal verschijnen toggles voor alle beschikbare rollen
4. Zet de gewenste rollen aan of uit

Beschikbare rollen:

| Rol | Geeft toegang tot |
|---|---|
| Activiteiten | Activiteitenbeheer |
| Trainingsschema | Trainingsschemabeheer |
| Sponsoring | Sponsoringbeheer |
| Ereleden | Ereledenbeheer |
| Contact | Contact en wie-doet-wat beheer |
| Pagina's & Nieuws | Pagina's, nieuws en menubeheer |
| Gebruikers | Gebruikers- en rollenbeheer |

### Admin-rol toekennen

De admin-rol geeft toegang tot alle beheeronderdelen. In de gebruikerstabel staat een toggle om iemand als admin in te stellen. Dit wijzigt de `app_metadata` van de gebruiker in Supabase.

### Gebruiker verwijderen

1. Ga naar **Beheer → Gebruikers**
2. Klik op het verwijder-icoon naast de gebruiker
3. Bevestig de verwijdering

---

## Sponsoring beheren

> Vereiste rol: `sponsoring` of admin

Beheer sponsors, hun logo's, en de "sponsor worden"-pagina via **Beheer → Sponsoring**.

---

## Ereleden beheren

> Vereiste rol: `ereleden` of admin

Beheer de ereledenlijst via **Beheer → Club → Ereleden**.

---

## Contact beheren

> Vereiste rol: `contact` of admin

Beheer contactgegevens en de "wie doet wat"-lijst via **Beheer → Contact**.

---

## Pagina's en nieuws beheren

> Vereiste rol: `content` of admin

- **Pagina's**: vrije contentpagina's aanmaken en bewerken met een rich text editor (TipTap)
- **Nieuws**: nieuwsberichten aanmaken, bewerken en publiceren
- **Menu**: menu-items beheren die in de navigatie verschijnen

---

## Veelgemaakte fouten

| Probleem | Oorzaak | Oplossing |
|---|---|---|
| Beheer-knop niet zichtbaar | Geen rollen toegekend | Vraag een admin om je rollen toe te kennen |
| "Geen toegang" melding | Ontbrekende rol voor dit onderdeel | Vraag een admin om de juiste rol toe te kennen |
| Inloggen lukt niet | Verkeerde gegevens of account bestaat niet | Gebruik "Wachtwoord vergeten?" of neem contact op met een admin |
| Uitnodigingsmail niet ontvangen | E-mail in spam, of verkeerd adres | Controleer de spamfolder; vraag de admin het adres te checken |
| Activiteit niet zichtbaar in agenda | Datum is verstreken | Controleer of de datum in de toekomst ligt |
| Trainingsslot verschijnt niet | Veld staat op inactief | Activeer het veld via Beheer → Trainingsschema → Instellingen → Velden |
