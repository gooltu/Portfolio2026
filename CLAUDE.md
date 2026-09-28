# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

This repo currently contains **design handoff files only** — there is no implemented site, no package.json, no build tooling, and no git repository initialized yet. The actual task (per `README.md`) is to recreate these designs as a real site in whatever framework is appropriate (React, Vue, static site generator, etc.), choosing the framework if none exists.

## What's here

- `Portfolio.dc.html` — landing page design spec (hero, career timeline, three case-study summaries, footer)
- `Bulk Terraform Case Study.dc.html`, `Memory Profiler Case Study.dc.html`, `Leadership Case Study.dc.html` — full case-study page specs
- `assets/` — real product screenshots referenced by the pages (`tf-case/`, `mp-case/`, `mp-crop/`, `profiler-case/`, `leadership/`, `process/`) — these are final assets to carry over, not placeholders
- `README.md` — the authoritative handoff spec: design tokens, layout rules, section-by-section structure, interaction notes

## Critical: `.dc.html` files are not source code

The `.dc.html` files are in a proprietary prototyping format ("Design Components") — they use `<x-dc>`, `<sc-if>`, `<sc-for>`, and `{{ }}` template bindings that are **not valid HTML/JS and don't belong in production output**. Treat them purely as a visual/structural spec to read and translate:

- `<sc-if value="{{ cond }}">` = conditional rendering
- `<sc-for list="{{ items }}" as="x">` = list iteration
- `{{ expr }}` = data bindings / event handlers (`onClick="{{ handler }}"`)
- Inline `style="..."` = final, pixel-accurate CSS values (colors, spacing, radii are final — do not redesign)
- `style-hover="..."` = hover-state styles to reimplement (CSS `:hover` or equivalent)

Do not literally ship these files. When implementing, re-express each section in the target framework's real components/state, using the inline styles as the literal design values.

## Design spec (from README.md)

- **Landing page** (`Portfolio.dc.html`): dark theme, single scroll. Order: hero/intro → 3 case-study summaries (Terraform, Memory Profiler, Leadership) → career timeline (git-log styled) → footer/contact. Each case-study summary: monospace section label → headline + stat callout → 4-up metadata strip (Company/Role/Users/Built with) → 3-up numbered story grid (problem/research/bet) → two-column visual (left "device" card + right two stacked screenshots, both columns equal height via `flex; align-items:stretch`, images `flex:1; min-height:0; object-fit:cover`) → "Read the full case study" link.
- **Case study pages**: hero title → Situation/Task/Role block → research narrative with screenshots → pull-quote highlight cards → persona section → customer-quotes grid → results section with charts/quotes. Sections divided by `1px` hairlines (`rgba(233,233,237,.16)`, inset ~48px via gradient mask).
- **Navigation**: plain anchor links between pages, no SPA routing required. Static content site — no modals, no complex client state. Animation limited to hover transitions (~150–200ms).

### Design tokens
- Backgrounds: `#0d0e16`–`#131521` (page), `#1b1d2b` / `#161826` (cards)
- Borders: `#292b31` (subtle), `#3f424d` (card borders)
- Text: `#e9e9ed` / `#e4e7f5` (primary), `#cfd3e5` / `#b2b6ca` (secondary), `#75798c` / `#9397ab` (muted/label)
- Accent: `#5b8def` (primary/links), `#8fb4ff` (icon accent), `#c3d6ff` on `#1a2a47` (badge)
- Fonts: JetBrains Mono (labels/metadata/timestamps), Inter (body/headings)
- Radius: `8px` (buttons/badges), `10–14px` (cards/images)
- Card elevation shadow: `0 16px 40px rgba(0,0,0,.45)`
- Highlight card: `border-radius:12px; border:1px solid #3f424d; background:#1b1d2b; padding:24px 28px`

## Once an implementation exists

There is no build/lint/test tooling yet. When a framework is chosen and scaffolded, update this file with the actual commands (dev server, build, lint) rather than assuming any.
