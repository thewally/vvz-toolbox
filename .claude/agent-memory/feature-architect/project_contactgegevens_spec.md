---
name: Contactgegevens spec
description: Feature spec voor Contact-sectie (gegevens, locatie, wie doet wat) met Supabase i.p.v. SportLink
type: project
---

Contact-sectie spec opgeleverd in `.claude/specs/contactgegevens.md` op 2026-03-28.

**Why:** ContactgegevensPage en LocatieRoutebeschrijvingPage haalden data uit SportLink API; wordt vervangen door Supabase-tabellen met beheeromgeving. WieDoetWatPage was nog een placeholder.

**How to apply:** Drie nieuwe Supabase-tabellen (`club_contact_info`, `committees`, `committee_members`). Beheerroutes onder `/beheer/contact/*`. Tegel op beheer-dashboard met multiAction pattern (3 acties).
