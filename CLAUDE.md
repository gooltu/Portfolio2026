# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, no-build-step portfolio site: a landing page (`index.html`) and three case-study pages (`terraform-case-study.html`, `memory-profiler-case-study.html`, `leadership-case-study.html`), sharing `styles.css` and `script.js`. `index.html` additionally loads `home.js` for its terminal easter egg, command palette, and animated canvas graph. Deployed to Vercel from the `main` branch on GitHub (`gooltu/Portfolio2026`).

## Commands

- Run locally: `npx serve .` (or any static file server) — no build, no install step required for the site itself.
- Deploy: `vercel --prod` (project is linked; see `.vercel/project.json`). Push to `main` on GitHub for history; Vercel→GitHub auto-deploy is not yet authorized (the Vercel GitHub App needs a one-time grant to the `gooltu` account in the Vercel dashboard) — until then, ship with `vercel --prod` directly.

## Architecture

- **No framework, no bundler.** Every page is hand-written HTML with inline styles for one-off layout and shared classes (defined in `styles.css`) for repeated patterns: `.sidebar`/`.explorer-file` (file-explorer nav), `.topbar`/`.subbar` (top bars), `.meta-grid`, `.story-grid`, `.highlight-card`, `.persona-card`, `.quote-card`, `.divider`, `.btn`, `.carousel`. CSS custom properties in `:root` (`--bg`, `--accent`, `--border`, etc.) hold the design tokens — reuse them instead of hardcoding hex values.
- **`script.js`** — utilities shared by all four pages: `initExplorerNav(navSelector, offset)` wires sidebar links to smooth-scroll and highlights the active one via scrollspy; `initCopyEmail(btnSelector, email)`; `initCarousel(root, captions)` (used by the Terraform case study's image carousel); `smoothGo(id, offset)`.
- **`home.js`** — landing-page-only behavior: the fake terminal REPL (a small command interpreter — `help`, `whoami`, `terraform plan|apply`, `hire`, etc.), the Cmd+K command palette, the animated canvas "infra graph," and the sidebar/topbar active-file tracking tied to scroll position. Case-study pages don't load this file; they only need `initExplorerNav`.
- **Case-study pages** each have their own sidebar nav list (`id="explorerNav"`) whose `data-section-id` values must match real section `id`s on that page — if you add/remove/rename a section, update both.
- **`design-source/`** holds the original high-fidelity design spec this site was built from (`.dc.html` prototype files in a proprietary templating format, plus `DESIGN_HANDOFF.md`). These are reference-only, not served by the site — don't link to them or treat their `{{ }}`/`sc-for`/`sc-if` syntax as something to reproduce elsewhere.
