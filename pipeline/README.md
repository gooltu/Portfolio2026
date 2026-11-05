# Job application pipeline

Turns a job description into a tailored résumé, cover letter and (in later phases) a portfolio variant on its own subdomain.
The rule that holds everything together: **`profile.json` is the only source of facts.** Documents may select, reorder
and rephrase what is in it. They may never add a claim that is not in it.

## Status
- Phase 0 (fact bank, corrected timeline): done
- Phase 1 (résumé and cover letter): this folder
- Phase 2 (portfolio variant generator), Phase 3 (wildcard subdomain and deploy), Phase 4 (QA and tracker): not built yet

## Layout
```
pipeline/
  profile.json            facts, counting rules, checker rules, resolved/open conflicts
  resume/                 PDF builder (Roboto, A4). data/base.json is the corrected base résumé
  scripts/
    new-job.mjs           scaffolds jobs/<slug>/ with a random neutral slug
    check.mjs             fact-checks résumé + cover letter against profile.json; JD keyword coverage
    build-job.mjs         runs the check, then builds the PDF
  jobs/<slug>/            GIT-IGNORED. status.json, jd.txt, jd.json, match.md, resume.json, cover-letter.md, PDF
```
`jobs/` is ignored by git because it names the companies you apply to and this repo is on GitHub.

## Steps for one job
1. `node pipeline/scripts/new-job.mjs "<label>" "<Company>" "<Role>"` creates the folder and prints the slug.
2. Paste the JD into `jobs/<slug>/jd.txt` (LinkedIn blocks automated fetching).
3. **Analyze** (Claude): fill `jd.json`: title, level, years required, domain, `keywords.must` / `keywords.nice`.
   Only terms the JD actually uses.
4. **Match** (Claude): write `match.md`: each requirement mapped to claim ids in `profile.json`, a fit score,
   and gaps. Gaps are reported, never filled in.
5. **Résumé** (Claude): copy `resume/data/base.json` to `jobs/<slug>/resume.json`; reorder and re-emphasize bullets,
   adjust headline, summary and skills using only fact-bank claims.
6. **Cover letter** (Claude): `jobs/<slug>/cover-letter.md`, following `cover-letter-guide.md`.
7. `node pipeline/scripts/check.mjs <slug>` then `node pipeline/scripts/build-job.mjs <slug>`.
8. Read the PDF yourself before sending. The checker catches wrong numbers and stale claims, not bad judgment.

## What the checker enforces
- Every number in the résumé and cover letter appears in `profile.json` (percentages must appear as percentages).
- Year claims ("13+ years") must be listed in `counting_rules.allowed_year_phrases`.
- Rules in `profile.json`: CSAT +25% is platform-level, 250K is always "across Progress and HashiCorp",
  Progress is never one 2018-2025 Manager role, no "12+" years, Memory Profiler role is not "Principal".
- Warns if Progress appears without its three roles, or the cover letter runs long.

## Changing a fact
Edit `profile.json` first (and move the item between `claims`, `resolved_conflicts`, `open_conflicts`), then regenerate documents.
Never fix a number only inside a résumé.

## Wipro
Framed case by case, see `wipro_framing` in `profile.json`. It keeps its real title and is not added into UX-years figures.

## Building PDFs
Needs Node 18+ and Google Chrome. On macOS the builder finds Chrome automatically; otherwise set `CHROME=/path/to/chrome`.
