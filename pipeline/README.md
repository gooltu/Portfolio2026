# Job application pipeline

Turns a job description into a tailored résumé, cover letter and portfolio variant on its own subdomain.
The rule that holds everything together: **`profile.json` is the only source of facts.** Documents may select, reorder
and rephrase what is in it. They may never add a claim that is not in it.

## Status
- Phase 0 (fact bank, corrected timeline): done
- Phase 1 (résumé and cover letter): done
- Phase 2 (portfolio variant generator): done
- Phase 3 (variant subdomains and deploy): done, with one CNAME per job (see "DNS for each variant"). The wildcard is not active (see "Wildcard DNS")
- Phase 4 (QA and tracker): not built yet

## Layout
```
pipeline/
  profile.json            facts, counting rules, checker rules, resolved/open conflicts
  resume/                 PDF builder (Roboto, A4). data/base.json is the corrected base résumé
  scripts/
    new-job.mjs           scaffolds jobs/<slug>/ with the next free slug from slug-pool.json
    check.mjs             fact-checks résumé, cover letter and variant copy against profile.json; JD keyword coverage
    build-job.mjs         runs the check, then builds the PDF
    build-letter.mjs      runs the check, then builds cover-letter.md into a one-page PDF
    build-variant.mjs     builds variants/<slug>/index.html from index.html and variant.json
    deploy.mjs            rebuilds variants, deploys, checks, promotes, verifies live URLs
    preview.mjs           serves the main site and every variant locally, using the real vercel.json and .vercelignore
    list-pages.mjs        writes jobs/pages.html; new-job.mjs and deploy.mjs also refresh it
  jobs/pages.html         GIT-IGNORED. Every public URL, with company and role beside each variant, plus résumé and letter links
  jobs/<slug>/            GIT-IGNORED. status.json, jd.txt, jd.json, match.md, resume.json, cover-letter.md, variant.json, PDF
../variants/<slug>/       GIT-IGNORED. Generated page, uploaded to Vercel by deploy.mjs
```
`jobs/` is ignored by git because it names the companies you apply to and this repo is on GitHub.
`variants/` is ignored too, because tailored copy hints at where you are applying. Both exist only on this machine,
so deploy from here, and turning on Vercel's GitHub auto-deploy would take every variant down.

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
9. **Variant** (Claude): write `jobs/<slug>/variant.json` (format below), then `node pipeline/scripts/build-variant.mjs <slug>`.
10. Slugs from the pool already have a subdomain, so skip this step unless `new-job.mjs` says the pool is empty. Then set one up (see "DNS for each variant") before step 11 and before opening the URL.
11. `node pipeline/scripts/deploy.mjs`. Once the variant URL is verified, this marks the job live and rebuilds the résumé
    so its Portfolio link points at the variant. **Send the PDF after this step**, since earlier PDFs link to the main site.

## variant.json
```json
{
  "meta": { "title": "...", "description": "..." },
  "hero": { "eyebrow": ["...", "13+ yrs", "..."], "headline": "I design *accent word* tools.", "sub": "..." },
  "sidebarNote": "...",
  "contactLine": "...",
  "sectionOrder": ["readme", "work-profiler", "work-terraform", "leadership", "process", "log", "stack", "contact"],
  "focus": {
    "label": "~/focus.md",
    "heading": "...",
    "items": [{ "title": "...", "text": "...", "claims": ["claim-id-from-profile.json"] }]
  }
}
```
`meta` and `hero` are required. Copy is plain text; `*word*` in a heading gives the accent colour.
`"years": "10+"` is optional. It sets the figure in the status bar and terminal, which otherwise say 13+. The figure in `meta` and `hero` copy is written by hand, so keep them matching.
Use `focus` for domain work the page does not otherwise show. If the JD is about leadership, focus would repeat the leadership section, so leave it out and use `"leadership": { "heading": "...", "manager": [{ "text": "...", "claims": [] }], "ic": [{ "text": "...", "claims": [] }] }`, which replaces that section's heading and the lists in its two cards.
Every `focus` and `leadership` item must cite the claims that back it. `sectionOrder` keeps `readme` first and `contact` last,
`leadership` and the two `work-*` sections in the first three slots (the metrics band follows them), and the `work-*` sections adjacent.

A variant replaces only `index.html`. CSS, JS, images and case studies are shared with the main site, so rebuild and deploy after changing the base page.

The build refuses to write a page if:
- the copy has a number, year claim or rule violation that `profile.json` does not allow, or cites an unknown claim
- the copy contains the company, the label or the JD's job title, or the page names the company more often than the base page does
  (compared by count, because a company such as LinkedIn can legitimately appear on the base page)
- the copy contains links, images or HTML, which also keeps logos and branding out
- the finished page, `home.js` or a case study breaks a rule in `profile.json`

## Routing and privacy
- `vercel.json` sends `/` and `/index.html` on `<slug>.mayukhonline.in` to `variants/<slug>/index.html`. Every other path falls through to the shared root files.
- Every response on a variant host is `noindex`, and `/variants/...` returns 404 on all hosts.
- An unknown or retired slug shows the normal portfolio, so a link in an old résumé never breaks.
- `.vercelignore` is an **allowlist**. A new public page must be added there and to `ALLOWED_ROOT` in `deploy.mjs`, otherwise it is not uploaded or the deploy stops.
- `deploy.mjs` creates the deployment unpromoted and checks its real file list against that allowlist. Anything unexpected stops the deploy before it is public.
- `deploy.mjs --dry-run` stops before promoting. To undo a release: `vercel rollback --yes`.

## DNS for each variant
Each variant needs its own subdomain on the Vercel project and its own CNAME at BigRock. This leaves the nameservers and the main site's records alone.

`slug-pool.json` lists subdomains that are set up ahead of time, and `new-job.mjs` takes the first one no job is using. An unused one shows the normal portfolio with `noindex`, so a spare is harmless.

### Topping up the pool
Generate new random slugs from the alphabet in `new-job.mjs`, follow steps 1-4 below for each, then add them to `slug-pool.json`. Keep slugs in the file once used, because a job folder is what marks one as taken.

### Setting one up

**Order matters.** Finish these steps before running `deploy.mjs` or opening the URL. A lookup made before the record is visible gets "doesn't exist", and resolvers can keep that answer for up to an hour.

1. Add the subdomain to the project:
   `vercel domains add <slug>.mayukhonline.in portfolio2026`
2. Get the record's value. Use the first `recommendedCNAME` from:
   `vercel api /v6/domains/<slug>.mayukhonline.in/config`
3. At BigRock, add a new CNAME record to the `mayukhonline.in` zone. Host: `<slug>`, without the domain. Value: the value from step 2. Change nothing else.
4. Wait until all four BigRock servers return it. This took about 25 minutes the first time. Ask them directly, so nothing else looks the name up early:
   `for n in 1 2 3 4; do dig +short CNAME <slug>.mayukhonline.in @dns$n.bigrock.in; done`
5. Run `node pipeline/scripts/deploy.mjs`. If the certificate is not ready, the variant stays not live and the résumé keeps linking to the main site. Run `deploy.mjs --verify` again a few minutes later.

If a resolver still says the name doesn't exist, compare the serial in its answer with BigRock's. An older serial means it saved the answer before the record existed, and it clears when that answer's TTL runs out:
`dig <slug>.mayukhonline.in @9.9.9.9 +noall +authority`
`dig SOA mayukhonline.in @dns1.bigrock.in +short`

## Wildcard DNS
Not active. It would remove the per-job CNAME, but it needs Vercel's nameservers.
Vercel only issues wildcard certificates for domains on its own nameservers, and `*.mayukhonline.in` is already added to the project.

**Do not point the nameservers at Vercel until Vercel is ready to answer for the domain.** On 2026-11-05 that switch took DNS down for about 1 hour 45 minutes, until the nameservers were set back at BigRock: `ns1.vercel-dns.com` returned `REFUSED`, public resolvers returned `SERVFAIL`, and `vercel dns add` failed with `not a DNS zone`. Vercel's domain record showed `"zone": false` and an empty `intendedNameservers`. Sites can keep loading on a device that has saved the old answer, so test with `dig www.mayukhonline.in @1.1.1.1`.

Check first, with `vercel api /v5/domains/mayukhonline.in`. If `zone` is still false, ask Vercel support to activate the zone. Only switch once it is true and `vercel dns ls mayukhonline.in` shows the records the site needs, then:
1. Check the BigRock DNS zone for records you want to keep. Public lookups on the setup date found no MX or TXT records. Anything else must be re-created in Vercel.
2. At BigRock, set the nameservers to `ns1.vercel-dns.com` and `ns2.vercel-dns.com`.
3. Check `dig +norecurse SOA mayukhonline.in @ns1.vercel-dns.com` straight away. If it does not answer `NOERROR`, set the nameservers back to `dns1`-`dns4.bigrock.in`.
4. Once DNS has updated: `node pipeline/scripts/deploy.mjs --verify`. This marks working variants live and rebuilds their résumés.

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
