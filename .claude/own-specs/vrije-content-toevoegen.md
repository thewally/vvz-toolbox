# Vrije content toevoegen
Op dit moment is het alleen mogelijk om "vaste" content aan te passem, zoals activiteiten toevoegen of trainingschema aanpassen. Ik wil het graag mogelijk maken dat er ook content toegevoegd kan worden aan de website.

## Eisen
- Beheerder kan pagina's maken en vullen met content
- Beheerder kan menuitems maken en naar de betreffende pagina linken
- Beheerder kan ook hoofdmenu items maken
- Beheerder kan (sub)menuitems onder de bestaande menuitems zetten
- Beheerder kan Quick Links maken naar pagina's

## Huidige situatie
De hoofdmenustructuur ziet er nu zo uit:
- Wedstrijdinformatie
-- Programma
-- Uitslagen
-- Afgelastingen
-- Wedstrijdverslagen (nog niet geimplementeerd)
-- Topscorers & Keeperstrofee (nog niet geimplementeerd)

- Teams
-- Senioren
-- Veteranen
-- Junioren
-- Pupillen
-- Zaalvoetbal

- Trainen
-- Trainingsschema
-- Veldindeling
-- Techniektraining

- Sponsoring
-- Sponsors
-- Sponsor worden? 
-- Sponsor Acties

- Clubinformatie
-- Plattegrond
-- Huisstijl
-- Historie
-- Ereleden
-- Reglementen

- Lidmaatschap
-- Lid worden?
-- Contributie
-- Vrijwilliger worden?

- Contact
-- Contactgegevens
-- Locatie & Routebeschrijving
-- Wie doet wat?

Quicklinks:
- Nieuws (nog niet geimplementeerd)
- Activiteiten
- Vrijwilliger worden?
- Ledenshop
- Lid worden?

## Toevoegen menu items
Het volgende moet mogelijk zijn bij het creeeren van menu items:
- een verzamel menu item maken waaronder meerdere items vallen (zoals nu ook voor Wedstrijdinformatie, Teams, Trainen, etc)
- het is ook mogelijk om een (sub)verzamel menu item te maken onder een andere verzamelitems. Dus dan kan je een structuur met dit als voorbeeld krijgen:
    =========
    Verzamelitem v
    - subverzamelitem v (openen submenu)
    -- item 1 (link naar pagina)
    -- item 2 (link naar pagina)
    - subverzamelitem v (openen submenu)
    -- item 3 (link naar pagina)
    -- item 4 (link naar pagina)
    - item 5 (link naar pagina)
    =========
- content selecteren van een aangemaakte pagina
- een tool selecteren als programma, uitslagen, senioren verzamel pagina, junioren verzamelpagina, sponsoring, contactgegegevens, etc (eigenlijk alle "hardcoded" tools)
- een externe url invoeren naar bijvoorbeeld de Stanno Ledenshop
- de volgorde van tonen van de menuitems kan in het beheerscherm ook bepaald worden

De beheerder kan dezelfde pagina's ook koppelen aan QuickLinks, dit werkt op dezelfde manier als hierboven, maar dan kan de beheerder geen sub menu items maken.

## Toevoegen van Content
De beheerder kan content maken, zodat het, zoals hierboven al beschreven, bij menu items geselecteerd kan worden als pagina achter een menuitem.

Eisen lijst met pagina's:
- De beheerder kan een lijst met alle pagina's kunnen zien
- In de lijst is het mogelijk om pagina's toe te voegen, te wijzigen en te verwijderen
- Als een pagina wel gekoppeld is aan één of meerdere menu items, dan ziet de beheerder in de lijst welke menu items dat zijn
- Als een pagina (nog) niet gekoppeld is aan een menu item, dan ziet de beheerder een waarschuwing in de lijst bij de pagina
- Een pagina is wel opvraagbaar zonder dat het toegevoegd is aan ee menuitem

Eisen per pagina:
- Er komt een pagina view waarin de beheerder de pagina kan opbouwen en opslaan
- Titel moet opgegeven kunnen worden
- Publicatiedatum moet opgeslagen worden
- Wijzigingsdatum moet opgeslagen worden
- Optioneel moet er opgeslagen worden tot wanneer de pagina van toepassing is
- Content moet opgegegeven kunnen worden met plaatjes (inclusief uploaden naar Supabase storage) & embedded youtube filmpjes
- Als een pagina wel gekoppeld is aan één of meerdere menu items, dan ziet de beheerder welke menu items dat zijn in de pagina edit view
- Als een pagina (nog) niet gekoppeld is aan één of meerdere menu items, dan ziet de beheerder een waarschuwing in de pagina edit view
- Zodra de pagina gedeeld wordt via Whatsapp dan wordt wordt er een ""