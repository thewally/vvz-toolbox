---
name: Nieuws spec
description: Feature spec voor nieuwssectie — news_items tabel, publieke/beheer pagina's, homepage sidebar, cleanup workflow
type: project
---

Nieuws feature spec opgeslagen in `.claude/specs/nieuws.md`.

**Why:** Gebruiker wil nieuwsberichten met rich text (TipTap), afbeeldingen, homepage sidebar, en automatische cleanup.

**How to apply:** Nieuws volgt exact hetzelfde patroon als Vrije Content (pages tabel) — zelfde RLS, zelfde storage bucket (page-images), zelfde slugify, zelfde TipTap editor. Beheer routes onder `/beheer/nieuws`. Cleanup via aparte GitHub Actions workflow met service role key.
