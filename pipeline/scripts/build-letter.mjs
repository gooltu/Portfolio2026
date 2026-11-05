#!/usr/bin/env node
// Fact-checks, then builds jobs/<slug>/cover-letter.md into a one-page PDF that matches the resume.
//   node pipeline/scripts/build-letter.mjs <slug>
// Output: jobs/<slug>/CoverLetter_MayukhChakraborty_<Company>.pdf  (plus cover-letter.html next to it)
// Name, title and contact details come from the job's resume.json, so the two documents stay in step.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const slug = process.argv[2];
if (!slug) { console.error('Usage: build-letter.mjs <slug>'); process.exit(2); }
const dir = resolve(root, 'jobs', slug);
for (const f of ['cover-letter.md', 'resume.json']) {
  if (!existsSync(resolve(dir, f))) { console.error(`No ${f} in ${dir}`); process.exit(2); }
}

const check = spawnSync('node', [resolve(root, 'scripts/check.mjs'), slug], { stdio: 'inherit' });
if (check.status !== 0) { console.error('Not building: fix the fact-check errors first.'); process.exit(1); }

const status = JSON.parse(readFileSync(resolve(dir, 'status.json'), 'utf8'));
const { header, contact } = JSON.parse(readFileSync(resolve(dir, 'resume.json'), 'utf8'));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// [portfolio] in the letter becomes a link, so the URL itself never shows.
const linked = (s) => esc(s).replaceAll('[portfolio]', `<a href="${esc(contact.portfolio)}">portfolio</a>`);

const paragraphs = readFileSync(resolve(dir, 'cover-letter.md'), 'utf8')
  .trim()
  .split(/\n\s*\n/)
  .map((p) => `<p>${p.split('\n').map(linked).join('<br>')}</p>`)
  .join('\n');

const fontsDir = resolve(root, 'resume/fonts');
const face = (weight) => `@font-face{font-family:'Roboto';font-weight:${weight};src:url('${pathToFileURL(resolve(fontsDir, `roboto-latin-${weight}-normal.woff2`)).href}') format('woff2')}`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(header.name)} - Cover Letter</title>
<style>
${face(400)}
${face(700)}
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:'Roboto',sans-serif;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;height:297mm;padding:48pt 56pt;overflow:hidden}
.name{font-size:28.4pt;font-weight:700;line-height:1.1;margin:0}
.title{font-size:15pt;font-weight:700;color:#4169e1;line-height:1.2;margin:5pt 0 10pt}
.contact{font-size:9.5pt;color:#444;padding-bottom:18pt;border-bottom:.75pt solid #d5d5d5;margin-bottom:26pt}
.contact span+span::before{content:"  ·  ";white-space:pre;color:#9a9a9a}
a{color:#4169e1;text-decoration:none}
.body p{font-size:11pt;line-height:1.6;color:#222;margin:0 0 13pt}
</style></head><body><div class="page">
<h1 class="name">${esc(header.name)}</h1>
<div class="title">${esc(header.title)}</div>
<div class="contact"><span><a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a></span><span>${esc(contact.phone)}</span><span><a href="${esc(contact.linkedin)}">LinkedIn</a></span><span><a href="${esc(contact.portfolio)}">Portfolio</a></span></div>
<div class="body">
${paragraphs}
</div>
</div>
<script>addEventListener('load',()=>{const p=document.querySelector('.page');if(p.scrollHeight>p.clientHeight)document.documentElement.dataset.overflow='1'})</script>
</body></html>`;

const htmlPath = resolve(dir, 'cover-letter.html');
writeFileSync(htmlPath, html);

const chrome = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean).find((p) => existsSync(p));
if (!chrome) { console.error('Chrome not found. Set CHROME=/path/to/chrome'); process.exit(1); }

const base = ['--headless=new', '--no-sandbox', '--disable-gpu', '--virtual-time-budget=4000'];
const dom = execFileSync(chrome, [...base, '--dump-dom', pathToFileURL(htmlPath).href], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
if (/<html[^>]*data-overflow/.test(dom)) { console.error('OVERFLOW: the letter does not fit on one page. Shorten it.'); process.exit(3); }

const name = (status.company || status.label || 'Job').replace(/[^A-Za-z0-9]+/g, '');
const pdf = resolve(dir, `CoverLetter_MayukhChakraborty_${name}.pdf`);
execFileSync(chrome, [...base, '--no-pdf-header-footer', '--run-all-compositor-stages-before-draw', `--print-to-pdf=${pdf}`, pathToFileURL(htmlPath).href], { stdio: 'ignore' });
console.log('Built', pdf);
