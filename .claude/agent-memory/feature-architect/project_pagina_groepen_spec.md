---
name: Pagina Groepen spec
description: Feature spec voor pagina groepen in CMS — page_groups tabel, gegroepeerde beheer-UI, dynamische menu integratie
type: project
---

Feature spec geschreven naar `.claude/specs/pagina-groepen.md`.

Key design decisions:
- Platte URL's (`/pagina/:slug`) zonder groep-prefix — voorkomt broken links bij verplaatsingen
- `page_groups` tabel met `ON DELETE SET NULL` op pages.group_id
- Menu integratie via nieuw type `page_group` op `menu_items` met `page_group_id` kolom — pagina's worden dynamisch opgehaald bij menu-rendering
- Volgorde via `position` kolom (geen drag-and-drop), omhoog/omlaag knoppen
- Max 1 niveau diep, pagina kan in max 1 groep

**Why:** Gebruiker wil pagina's logisch groeperen (bijv. "Normen & Waarden") en als dropdown in menu tonen.
**How to apply:** Bij implementatie van CMS-gerelateerde features, rekening houden met group_id op pages tabel.
