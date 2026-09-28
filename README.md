# Portfolio2026

Mayukh Chakraborty's product design portfolio — a static site with an IDE-themed landing page (file explorer sidebar, command palette, a small terminal easter egg, and an animated infra graph) plus three long-form case studies.

## Structure

- `index.html` — landing page
- `terraform-case-study.html`, `memory-profiler-case-study.html`, `leadership-case-study.html` — case studies
- `styles.css`, `script.js`, `home.js` — shared styles and vanilla JS (no build step, no framework)
- `assets/` — screenshots and images
- `design-source/` — the original high-fidelity design spec (`.dc.html` prototype files + handoff notes) this site was built from; not served by the site itself

## Running locally

No build step. Serve the directory with any static file server, e.g.:

```
npx serve .
```

## Deployment

Deployed to Vercel as a static site, built from the `main` branch on GitHub.
