---
name: Content-verbeteringen spec
description: Feature spec voor 12 verbeteringen aan pagina's en nieuws CMS (depubliceren fix, unsaved changes, preview, dupliceren, slug validatie, TipTap uitbreidingen, image cleanup)
type: project
---

Feature spec geschreven in `.claude/specs/content-verbeteringen.md` met 12 concrete verbeteringen aan het bestaande contentbeheer, gegroepeerd in 4 implementatiefasen.

**Why:** Huidige CMS mist standaard UX-patronen (unsaved changes warning, succes-feedback, preview) en heeft een bug (depubliceren via `published_at = 9999-01-01` ipv `null`).

**How to apply:** Bij implementatiewerk aan content/nieuws-beheer, raadpleeg de spec voor prioritering en implementatiedetails.
