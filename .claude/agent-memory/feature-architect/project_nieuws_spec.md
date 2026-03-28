---
name: Nieuws feature spec
description: Feature spec voor Nieuws-module (artikelen op homepage, Markdown body, Supabase Storage images) in .claude/specs/nieuws.md
type: project
---

Nieuws feature spec geschreven op 2026-03-28. Nieuwsartikelen vervangen de tegels als prominent element op de homepage. Body in Markdown met YouTube embed support. Afbeeldingen via Supabase Storage bucket `news-images`. Tabel `news_articles` met slug-based routing.

**Why:** De homepage moet dynamischer worden met nieuwsberichten i.p.v. alleen statische tegels.

**How to apply:** Bij implementatie van de Nieuws-feature, raadpleeg `.claude/specs/nieuws.md` voor het volledige ontwerp.
