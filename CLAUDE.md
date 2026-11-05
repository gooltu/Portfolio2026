# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, no-build-step portfolio site: a landing page (`index.html`) and three case-study pages (`terraform-case-study.html`, `memory-profiler-case-study.html`, `leadership-case-study.html`), sharing `styles.css` and `script.js`. `index.html` additionally loads `home.js` for its terminal easter egg, command palette, and animated canvas graph. Deployed to Vercel from the `main` branch on GitHub (`gooltu/Portfolio2026`).

## Commands

- Run locally: `npx serve .` (or any static file server) — no build, no install step required for the site itself.
- Deploy: `node pipeline/scripts/deploy.mjs` (project is linked; see `.vercel/project.json`). It rebuilds variants and checks the uploaded files before promoting; use it instead of `vercel --prod`. Push to `main` on GitHub for history. Do not authorize Vercel→GitHub auto-deploy: `variants/` is git-ignored, so a Git-based deploy would take every variant down.
- `.vercelignore` is an allowlist. A new public page must be added there and to `ALLOWED_ROOT` in `pipeline/scripts/deploy.mjs`.

## Architecture

- **No framework, no bundler.** Every page is hand-written HTML with inline styles for one-off layout and shared classes (defined in `styles.css`) for repeated patterns: `.sidebar`/`.explorer-file` (file-explorer nav), `.topbar`/`.subbar` (top bars), `.meta-grid`, `.story-grid`, `.highlight-card`, `.persona-card`, `.quote-card`, `.divider`, `.btn`, `.carousel`. CSS custom properties in `:root` (`--bg`, `--accent`, `--border`, etc.) hold the design tokens — reuse them instead of hardcoding hex values.
- **`script.js`** — utilities shared by all four pages: `initExplorerNav(navSelector, offset)` wires sidebar links to smooth-scroll and highlights the active one via scrollspy; `initCopyEmail(btnSelector, email)`; `initCarousel(root, captions)` (used by the Terraform case study's image carousel); `smoothGo(id, offset)`.
- **`home.js`** — landing-page-only behavior: the fake terminal REPL (a small command interpreter — `help`, `whoami`, `terraform plan|apply`, `hire`, etc.), the Cmd+K command palette, the animated canvas "infra graph," and the sidebar/topbar active-file tracking tied to scroll position. Case-study pages don't load this file; they only need `initExplorerNav`.
- **Case-study pages** each have their own sidebar nav list (`id="explorerNav"`) whose `data-section-id` values must match real section `id`s on that page — if you add/remove/rename a section, update both.
- **`design-source/`** holds the original high-fidelity design spec this site was built from (`.dc.html` prototype files in a proprietary templating format, plus `DESIGN_HANDOFF.md`). These are reference-only, not served by the site — don't link to them or treat their `{{ }}`/`sc-for`/`sc-if` syntax as something to reproduce elsewhere.

## Job application pipeline

`pipeline/` generates a tailored résumé, cover letter and portfolio variant for each job description, and deploys the variants to subdomains. Read `pipeline/README.md` before touching it. `data-variant` attributes in `index.html` are the slots the variant builder fills; keep them when editing those elements.

- **`pipeline/profile.json` is the only source of facts.** Résumés and letters may select, reorder and rephrase its claims, never add one. When a fact changes, edit `profile.json` first.
- **Per job:** `node pipeline/scripts/new-job.mjs "<label>" "<Company>" "<Role>"`, paste the JD into `jobs/<slug>/jd.txt`, then write `jd.json`, `match.md`, `resume.json` (start from `pipeline/resume/data/base.json`), `cover-letter.md` and `variant.json`. Run `node pipeline/scripts/check.mjs <slug>`, `build-job.mjs <slug>`, `build-variant.mjs <slug>` and `deploy.mjs`.
- **Never claim what the fact bank does not support.** Report gaps in `match.md` instead. Follow the counting rules in `profile.json` (13+ years UX, 5+ years design leadership, Progress shown as three roles, CSAT +25% is platform-level, 250K is "across Progress and HashiCorp", Wipro framed case by case).
- `pipeline/jobs/` and `variants/` are git-ignored (they name or hint at the companies applied to). Do not commit them, archive them into tracked files, or paste their contents anywhere public.
- Variant subdomains use random neutral slugs, never company names. Do not use company logos or branding on any page.
- PDFs need Google Chrome (the builder finds it on macOS).
