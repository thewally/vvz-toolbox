---
name: Vrije Content & Dynamisch Menu spec
description: Architectuurbeslissingen voor CMS-achtige feature met contentpagina's, dynamisch menu, en Quick Links
type: project
---

Feature spec voor vrije content en dynamisch menubeheer is opgeslagen in `.claude/specs/vrije-content-toevoegen.md`.

Belangrijke architectuurbeslissingen:

1. **Rich text editor: TipTap** gekozen boven Quill vanwege headless/Tailwind-compatibiliteit en modulaire opzet. Content opgeslagen als HTML, niet JSON.
2. **Menu opgeslagen in `menu_items` tabel** met self-referencing `parent_id` en `ON DELETE CASCADE`. Max 2 niveaus diep (afgedwongen in applicatie, niet SQL).
3. **Quick Links als aparte tabel** `quick_links` -- geen nesting, apart beheerbaar, met optionele homepage-integratie (icon, description, show_on_home).
4. **Hardcoded fallback**: `navigation.js` blijft bestaan. TopNav probeert database te lezen, valt terug op hardcoded data bij fout.
5. **OG tags voor WhatsApp**: build-time generatie via uitbreiding van `generate-og-html.mjs` die Supabase queried. Beperking: OG tags pas bijgewerkt na deploy.
6. **3 onafhankelijke fases**: (1) Contentpagina's, (2) Menubeheer, (3) Quick Links + HomePage. Elke fase is apart releasbaar.
7. **Publieke content route**: `#/pagina/:slug`
8. **Beheer routes**: `#/beheer/content` en `#/beheer/menu`

**Why:** Grote feature die in fases opgeknipt moest worden voor incrementele waarde. TipTap past het best bij het bestaande Tailwind-only constraint.

**How to apply:** Bij implementatie altijd de fallback-logica in TopNav meenemen. Bij nieuwe tools/routes: voeg ze toe aan AVAILABLE_TOOLS lijst in menu service.
