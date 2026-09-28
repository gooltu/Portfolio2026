# Handoff: Product Design Portfolio Site

## Overview
A personal portfolio site for a senior product designer: a landing page (`Portfolio.dc.html`) with a hero, career timeline, and three case-study summaries, each linking out to a full case-study page (`Bulk Terraform Case Study.dc.html`, `Memory Profiler Case Study.dc.html`, `Leadership Case Study.dc.html`).

## About the Design Files
The files in this bundle are **design references built in HTML** (Design Components — a proprietary prototyping format), not production code to copy directly. The task is to **recreate these HTML designs in the target codebase's existing environment** (React, Vue, static site generator, etc.) using its established patterns and libraries — or, if no environment exists yet, choose the most appropriate framework and implement the designs there. Do not literally ship the `.dc.html` files or their inline `{{ }}` template syntax; treat them as the visual and structural spec.

## Fidelity
**High-fidelity.** All colors, typography, spacing, and copy are final. Recreate pixel-accurately using the values below.

## Screens / Views

### 1. Portfolio (landing page) — `Portfolio.dc.html`
- Dark theme, single scrolling page.
- Sections in order: hero/intro, three case-study summaries (Terraform, Memory Profiler, Leadership/scaling), career timeline (git-log styled), footer/contact.
- Each case-study summary section follows the same pattern: monospace section label, headline + big stat callout, a 4-up metadata strip (Company / Role / Users / Built with), a 3-up "numbered story" grid (problem / research / bet, or similar), then a two-column visual: a left "device" card (chat/agent UI or dashboard mock) and a right column of two stacked screenshots — **both columns are equal height** (flex `align-items:stretch`; the image column uses `flex:1; min-height:0; object-fit:cover` on each image so the two images share the available height evenly), followed by a "Read the full case study" link/button.

### 2. Case study pages
Each case study (`Bulk Terraform Case Study.dc.html`, `Memory Profiler Case Study.dc.html`, `Leadership Case Study.dc.html`) is a long-form single page: hero title, Situation/Task/Role block, research narrative sections with screenshots, pull-quote "highlight" cards, a persona section, a customer-quotes grid, and a results section with charts/quotes. Sections are separated by thin horizontal divider lines (`1px`, `rgba(233,233,237,.16)`, inset ~48px from the edges via a gradient mask). Highlight callouts use a card treatment: `border-radius:12px; border:1px solid #3f424d; background:#1b1d2b; padding:24px 28px`.

## Interactions & Behavior
- Case-study summary "Read the full case study" links navigate to the corresponding case-study page (plain anchor links, no SPA routing required).
- No modals, no complex client state — this is a static content site. Any animation is limited to link hover states (background/color transitions ~150–200ms).

## Design Tokens
- Background: `#0d0e16`–`#131521` range (dark navy-black); card surfaces `#1b1d2b` / `#161826`.
- Borders: `#292b31` (subtle), `#3f424d` (card borders).
- Text: primary `#e9e9ed` / `#e4e7f5`, secondary `#cfd3e5` / `#b2b6ca`, muted/label `#75798c` / `#9397ab`.
- Accent blue: `#5b8def` (primary accent, links, highlights), `#8fb4ff` (icon accent), `#c3d6ff` (badge text on `#1a2a47` badge background).
- Fonts: a monospace face (JetBrains Mono) for labels/metadata/timestamps; a neutral sans for body and headings.
- Radius: `8px` (buttons/badges), `10px`–`14px` (cards/images).
- Shadows: card elevation `0 16px 40px rgba(0,0,0,.45)`.

## Assets
Images referenced under `assets/` (screenshots of shipped product UI — Terraform agent flow, Memory Profiler graphs/AI insights, persona illustrations, customer quote/result charts). These are treated as real product screenshots, not placeholders — carry them over as static image assets.

## Files
- `Portfolio.dc.html` — landing page
- `Bulk Terraform Case Study.dc.html`
- `Memory Profiler Case Study.dc.html`
- `Leadership Case Study.dc.html`
- `assets/` — all screenshots/images referenced by the pages above
