# Admin-handleiding VVZ'49 Toolbox

Deze handleiding beschrijft hoe je als beheerder de Agenda en het Trainingsschema beheert.

---

## Toegang

De admin-omgeving is bereikbaar via de **Inloggen**-knop rechtsboven in de toolbox, of direct via:

- **Agenda beheer:** [https://thewally.github.io/vvz-toolbox/#/agenda/beheer](https://thewally.github.io/vvz-toolbox/#/agenda/beheer)
- **Trainingsschema beheer:** [https://thewally.github.io/vvz-toolbox/#/trainingsschema/beheer](https://thewally.github.io/vvz-toolbox/#/trainingsschema/beheer)

### Inloggen

Je hebt een account nodig (e-mailadres en wachtwoord), aangemaakt door de projectbeheerder.

1. Klik op **Inloggen** rechtsboven
2. Vul je e-mailadres en wachtwoord in
3. Klik op **Inloggen**

Na het inloggen verschijnt een **Uitloggen**-knop rechtsboven.

---

## Agenda beheren

### Activiteit toevoegen

1. Ga naar **Agenda → Beheer**
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
| **Datums** | ja* | Lijst van losse datums in `jjjj-mm-dd`-formaat, één per regel (bij datumlijst) |
| **Starttijd** | nee | Bijv. `14:00` |
| **Eindtijd** | nee | Bijv. `16:00` |
| **Omschrijving** | nee | Korte beschrijving |
| **URL** | nee | Link naar meer informatie |

*Afhankelijk van het gekozen datumtype is één van deze groepen verplicht.

### Datumtypen

**Enkele datum** — activiteit op één dag, zoals een wedstrijd of vergadering.

**Periode** — aaneengesloten meerdaagse activiteit, zoals een zomerkamp. Vul een startdatum in; de einddatum is optioneel.

**Datumlijst** — terugkerende activiteit op losse datums. Voer de datums in het formaat `jjjj-mm-dd` in, één per regel. Elke datum verschijnt als aparte kaart in de agenda, maar wordt als groep beheerd.

### Activiteit bewerken

1. Ga naar **Agenda → Beheer**
2. Klik op het potlood-icoontje bij de gewenste activiteit in de lijst
3. Pas de gegevens aan en klik op **Wijziging opslaan**

### Activiteit verwijderen

1. Ga naar **Agenda → Beheer**
2. Klik op het prullenbak-icoontje bij de gewenste activiteit in de lijst
3. Bevestig de verwijdering

Bij activiteiten van het type *Datumlijst* worden alle datums in de reeks verwijderd.

---

## Trainingsschema beheren

De beheerpagina voor het trainingsschema bevat twee tabbladen: **Teams** en **Velden**.

### Teams beheren

1. Ga naar **Trainingsschema → Beheer** (het tabblad "Beheer" verschijnt alleen als je ingelogd bent)
2. Klik op het tabblad **Teams**
3. Voeg teams toe, bewerk namen en categorie, of verwijder ze via de tabelrijen

Teams zijn ingedeeld in categorieën: **Pupillen**, **Junioren**, **Senioren** en **Veteranen**. Bij het toevoegen of bewerken van een team kun je een categorie kiezen.

Teams die nog aan geen enkel trainingsslot zijn gekoppeld, worden gemarkeerd met "Niet ingepland in een training".

### Velden beheren

1. Ga naar **Trainingsschema → Beheer**
2. Klik op het tabblad **Velden**
3. Voeg velden toe, bewerk namen en volgorde, of zet velden op inactief zodat ze niet zichtbaar zijn in het schema

---

## Beheerders toevoegen

Nieuwe beheerders worden aangemaakt via het [Supabase dashboard](https://supabase.com/dashboard):

1. Open je Supabase project
2. Ga naar **Authentication → Users**
3. Klik op **Add user → Create new user**
4. Vul e-mailadres en wachtwoord in en klik op **Create user**

---

## Veelgemaakte fouten

| Probleem | Oorzaak | Oplossing |
|---|---|---|
| Inloggen lukt niet | Verkeerde gegevens of account bestaat niet | Controleer je gegevens of neem contact op met de projectbeheerder |
| Activiteit niet zichtbaar in agenda | Datum is verstreken | Controleer of de datum in de toekomst ligt |
| Trainingsslot verschijnt niet | Veld staat op inactief | Activeer het veld via Beheer → Velden |
| Foutmelding bij opslaan | Netwerkprobleem of ontbrekende verplichte velden | Controleer je verbinding en vul alle verplichte velden in |
