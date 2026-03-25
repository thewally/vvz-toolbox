---
name: Supabase migratie
description: Activiteiten worden opgeslagen in Supabase i.p.v. Markdown-bestanden; admin interface beschikbaar op /admin/
type: project
---

Het project is gemigreerd van Markdown-bestanden (met manifest.json) naar Supabase als databron voor activiteiten.

**Why:** Beheerders kunnen nu via een web-based admin interface activiteiten beheren zonder Git-kennis.

**How to apply:** Documentatie moet verwijzen naar Supabase (supabaseUrl, supabaseAnonKey) i.p.v. manifestUrl of .md-bestanden. De admin interface is een apart build target (vite.admin.config.ts). GitHub Secrets VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY zijn vereist voor de CI/CD-pipeline.
