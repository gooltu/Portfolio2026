#!/usr/bin/env node
// Writes pipeline/jobs/pages.html: one local page linking every public URL, with company and role beside
// each variant. It names companies, so it stays in pipeline/jobs/ (git-ignored, never uploaded).
// new-job.mjs and deploy.mjs refresh it. To refresh by hand: node pipeline/scripts/list-pages.mjs
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '..');
const jobsDir = resolve(root, 'jobs');
const MAIN = 'https://www.mayukhonline.in';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const link = (href, text) => `<a href="${esc(href)}">${esc(text)}</a>`;

// Everything on the .vercelignore allowlist that is a page is public.
function mainPages() {
  const allowed = readFileSync(resolve(repo, '.vercelignore'), 'utf8').matchAll(/^!\/(.+\.html)$/gm);
  return [...allowed].map(([, file]) => {
    const title = readFileSync(resolve(repo, file), 'utf8').match(/<title>([^<]*)<\/title>/)?.[1] ?? file;
    return file === 'index.html'
      ? { name: 'Home', url: `${MAIN}/` }
      : { name: title.replace(/\s+—\s+Mayukh Chakraborty$/, ''), url: `${MAIN}/${file}` };
  });
}

function jobs() {
  if (!existsSync(jobsDir)) return [];
  return readdirSync(jobsDir)
    .filter((s) => existsSync(resolve(jobsDir, s, 'status.json')))
    .map((s) => {
      const status = JSON.parse(readFileSync(resolve(jobsDir, s, 'status.json'), 'utf8'));
      const files = readdirSync(resolve(jobsDir, s));
      const docs = [
        ['Résumé', files.find((f) => /^Resume_.*\.pdf$/.test(f))],
        ['Letter', files.find((f) => /^CoverLetter_.*\.pdf$/.test(f))],
        ['JD', files.find((f) => f === 'jd.txt')],
      ].filter(([, f]) => f).map(([name, f]) => link(`${s}/${f}`, name));
      return { ...status, slug: s, docs };
    })
    .sort((a, b) => String(b.created).localeCompare(String(a.created)) || a.slug.localeCompare(b.slug));
}

function spares(used) {
  const pool = JSON.parse(readFileSync(resolve(root, 'slug-pool.json'), 'utf8')).slugs;
  return pool.filter((s) => !used.has(s) && !existsSync(resolve(repo, 'variants', s)));
}

export function renderPages() {
  const list = jobs();
  const free = spares(new Set(list.map((j) => j.slug)));
  const jobRows = list.map((j) => `
      <tr>
        <td data-label="Company"><strong>${esc(j.company) || '—'}</strong></td>
        <td data-label="Role">${esc(j.role) || '—'}</td>
        <td data-label="URL" class="url">${link(j.variantUrl, j.variantUrl.replace('https://', ''))}</td>
        <td data-label="Status"><span class="tag ${j.variantLive ? 'live' : ''}">${j.variantLive ? 'Live' : 'Not live'}</span></td>
        <td data-label="Files" class="docs">${j.docs.join(' ') || '—'}</td>
        <td data-label="Added" class="date">${esc(j.created)}</td>
      </tr>`).join('');
  const mainRows = mainPages().map((p) => `
      <tr>
        <td>${esc(p.name)}</td>
        <td class="url">${link(p.url, p.url.replace('https://', ''))}</td>
      </tr>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Portfolio Pages</title>
<style>
  :root { color-scheme: light dark; --bg: #fff; --fg: #1a1a1a; --muted: #6b6b6b; --border: #e2e2e2; --accent: #1d5fd1; --live-bg: #e4f5ea; --live-fg: #17663a; --off-bg: #f0f0f0; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #16181c; --fg: #ececec; --muted: #9a9a9a; --border: #30333a; --accent: #7fb0ff; --live-bg: #16361f; --live-fg: #7fdc9f; --off-bg: #2a2c31; }
  }
  * { box-sizing: border-box; }
  body { margin: 0 auto; max-width: 1120px; padding: 32px 24px 64px; background: var(--bg); color: var(--fg); font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 36px 0 8px; }
  p { margin: 0 0 8px; color: var(--muted); }
  a { color: var(--accent); }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 12px; font-weight: 600; color: var(--muted); }
  th, td { padding: 10px 12px 10px 0; border-bottom: 1px solid var(--border); vertical-align: top; }
  .url { font-family: ui-monospace, Menlo, monospace; font-size: 13px; white-space: nowrap; }
  .docs a { margin-right: 8px; white-space: nowrap; }
  .date { color: var(--muted); white-space: nowrap; }
  .tag { padding: 2px 8px; border-radius: 999px; font-size: 12px; white-space: nowrap; background: var(--off-bg); color: var(--muted); }
  .tag.live { background: var(--live-bg); color: var(--live-fg); }
  code { font-family: ui-monospace, Menlo, monospace; font-size: 13px; overflow-wrap: anywhere; }
  @media (max-width: 720px) {
    thead { display: none; }
    tr, td { display: block; }
    tr { padding: 10px 0; border-bottom: 1px solid var(--border); }
    td { padding: 2px 0; border: 0; }
    .url { white-space: normal; overflow-wrap: anywhere; }
  }
</style>
</head>
<body>
  <h1>Portfolio pages</h1>
  <p>Private list on this computer. It names the companies you applied to, so don't share or upload it.</p>

  <h2>Job variants (${list.length})</h2>
  ${list.length ? `<table>
    <thead><tr><th>Company</th><th>Role</th><th>URL</th><th>Status</th><th>Files</th><th>Added</th></tr></thead>
    <tbody>${jobRows}
    </tbody>
  </table>` : '<p>No jobs yet.</p>'}

  <h2>Main site</h2>
  <table>
    <thead><tr><th>Page</th><th>URL</th></tr></thead>
    <tbody>${mainRows}
    </tbody>
  </table>

  <h2>Spare subdomains (${free.length})</h2>
  <p>Set up and unassigned. They show the normal portfolio until a job uses them.</p>
  <p>${free.map((s) => `<code>${esc(s)}.mayukhonline.in</code>`).join(', ') || 'None left. See "Topping up the pool" in pipeline/README.md.'}</p>
</body>
</html>
`;
}

export function writePages() {
  const out = resolve(jobsDir, 'pages.html');
  writeFileSync(out, renderPages());
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) console.log(`Wrote ${writePages()}`);
