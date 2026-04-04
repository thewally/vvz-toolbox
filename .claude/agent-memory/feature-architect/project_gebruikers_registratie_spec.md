---
name: Gebruikersregistratie spec
description: feature spec voor zelfregistratie, e-mailverificatie, profiles tabel en profielpagina in .claude/specs/gebruikers-registratie.md
type: project
---

Gebruikersregistratie feature spec opgeleverd op 2026-04-04.

**Why:** VVZ Toolbox had alleen handmatig aangemaakte admin-accounts. Leden en bezoekers moeten zelf een account kunnen aanmaken met e-mailverificatie.

**How to apply:** De spec introduceert een `profiles` tabel (gekoppeld aan auth.users via trigger), services/profiles.js, en drie nieuwe pagina's (RegistrerenPage, EmailBevestigdPage, ProfielPage). Belangrijk aandachtspunt: HashRouter + Supabase email redirect kan conflicteren -- mogelijk is een statisch callback HTML-bestand nodig. De profiles tabel is de basis voor toekomstige rolbeheer (user_roles linkt aan dezelfde auth.users(id)).
