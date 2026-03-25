---
name: GitHub Pages deployment setup
description: Deployment strategy and configuration for vvz-agenda on GitHub Pages (project page at thewally.github.io/vvz-agenda)
type: project
---

GitHub Pages deployment uses the official `actions/deploy-pages` action (not gh-pages branch).

Activities are fetched from Supabase at runtime, not from static Markdown files. The `public/activities/` directory no longer exists (migrated circa March 2026).

**Why:** Project page at `thewally.github.io/vvz-agenda` requires `base: '/vvz-agenda/'` in vite.config.ts.

**How to apply:**
- The IIFE library build does not produce index.html; the deploy workflow copies `index.prod.html` into `dist/index.html` before uploading the Pages artifact.
- Do not reference `public/activities/` in build/deploy pipelines — activities come from Supabase at runtime.
- Tests run via `npx vitest run` before build.
- Workflow file: `.github/workflows/deploy.yml`
