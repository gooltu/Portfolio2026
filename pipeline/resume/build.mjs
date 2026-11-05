// Builds resume.html and resume.pdf from data/resume.json.
//   node build.mjs                 -> out/base.pdf (+ out/base.html), from data/base.json
//   node build.mjs data/other.json out/other      -> custom data file and output base name
// Needs Node 18+ and Google Chrome / Chromium (set CHROME=/path/to/chrome if it is not found).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dataFile = resolve(root, process.argv[2] || 'data/base.json');
const outBase = resolve(root, process.argv[3] || 'out/base');
const d = JSON.parse(readFileSync(dataFile, 'utf8'));
const icons = JSON.parse(readFileSync(resolve(root, 'data/icons.json'), 'utf8'));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// **bold** markup inside any string
const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const svg = (k) => `<svg viewBox="0 0 ${icons[k].w} ${icons[k].h}" aria-hidden="true"><path d="${icons[k].d}"/></svg>`;

const fonts = [
  ['400', 'normal'], ['400', 'italic'], ['500', 'normal'], ['500', 'italic'], ['700', 'normal'], ['700', 'italic'],
]
  .flatMap(([w, s]) => [
    ['latin', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'],
    ['latin-ext', 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'],
  ].map(([sub, range]) => ({ w, s, sub, range })))
  .filter((f) => existsSync(resolve(root, `fonts/roboto-${f.sub}-${f.w}-${f.s}.woff2`)))
  .map((f) => `@font-face{font-family:'Roboto';font-style:${f.s};font-weight:${f.w};src:url('${pathToFileURL(resolve(root, `fonts/roboto-${f.sub}-${f.w}-${f.s}.woff2`)).href}') format('woff2');unicode-range:${f.range};}`)
  .join('\n');

const css = readFileSync(resolve(root, 'style.css'), 'utf8');
const c = d.contact;

const header = `<div class="head">
  <h1 class="name">${esc(d.header.name)}</h1>
  <div class="title">${esc(d.header.title)}</div>
  ${d.header.lines.map((l) => `<div class="hline">${rich(l)}</div>`).join('')}
  <p class="tagline">${d.header.tagline.map(esc).join('<br>')}</p>
  <div class="summary">${d.header.summary.map(esc).join('<br>')}</div>
  <div class="contact">
    <div class="row">${svg('phone')}<span>${esc(c.phone)}</span></div>
    <div class="row">${svg('email')}<a href="mailto:${esc(c.email)}">${esc(c.email)}</a></div>
    <div class="row link">${svg('linkedin')}<a href="${esc(c.linkedin)}">LinkedIn</a></div>
    <div class="row link">${svg('github')}<a href="${esc(c.github)}">Github</a></div>
    <a class="portfolio" href="${esc(c.portfolio)}">Portfolio</a>
  </div>
</div>`;

const job = (j, i) => `<section class="job${j.tight ? ' tight' : ''}">
  <div class="job-head"><div class="job-title">${esc(j.company)} - <span>${esc(j.role)}</span></div><div class="dates">${esc(j.dates)}</div></div>
  ${j.subtitle ? `<div class="sub">${esc(j.subtitle)}</div>` : ''}
  <ul class="bul">${j.bullets.map((b) => `<li>${rich(b)}</li>`).join('')}</ul>
</section>`;

// Pages: a job with "pageBreakBefore": true starts a new page. Education and skills follow the last job.
const pages = [[header]];
for (const [i, j] of d.experience.entries()) {
  if (j.pageBreakBefore && i > 0) pages.push([]);
  pages[pages.length - 1].push(job(j, i));
}
const tail = `<h2 class="sec">Education</h2>
<div class="edu">${d.education
  .map((e) => `<div class="r"><span class="org">${esc(e.org)}${e.detail ? ',' : ''}</span><span class="det">${esc(e.detail)}${e.detail ? ',' : ''}</span><span class="dt">${esc(e.dates)}</span></div>`)
  .join('')}</div>
<h2 class="sec">Skills</h2>
<div class="skills">${esc(d.skills)}</div>
<h2 class="sec">Technical Skills</h2>
<div class="tech">${d.technicalSkills.map((t) => `<div><b>${esc(t.label)}</b> ${esc(t.text)}</div>`).join('')}</div>
<h2 class="sec">Honors &amp; Awards</h2>
<div class="honors">${d.honors.map((h) => `<div>${esc(h)}</div>`).join('')}</div>`;
pages[pages.length - 1].push(tail);

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(d.header.name)} - Resume</title>
<style>${fonts}\n${css}</style></head><body>
${pages.map((p) => `<div class="page">${p.join('\n')}</div>`).join('\n')}
<script>addEventListener('load',()=>{document.querySelectorAll('.page').forEach((p,i)=>{if(p.lastElementChild.getBoundingClientRect().bottom-p.getBoundingClientRect().top>p.clientHeight-8)document.documentElement.dataset.overflow=(document.documentElement.dataset.overflow||'')+(i+1)+' '})})</script>
</body></html>`;

mkdirSync(dirname(outBase), { recursive: true });
writeFileSync(outBase + '.html', html);

const candidates = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean);
const chrome = candidates.find((p) => existsSync(p));
if (!chrome) { console.error('Chrome not found. Set CHROME=/path/to/chrome'); process.exit(1); }
execFileSync(chrome, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer',
  '--run-all-compositor-stages-before-draw', '--virtual-time-budget=4000',
  `--print-to-pdf=${outBase}.pdf`, pathToFileURL(outBase + '.html').href,
], { stdio: 'ignore' });
console.log('Wrote', outBase + '.pdf');
const dom = execFileSync(chrome, ['--headless=new','--no-sandbox','--disable-gpu','--virtual-time-budget=4000','--dump-dom', pathToFileURL(outBase + '.html').href], { encoding: 'utf8' });
const ov = dom.match(/data-overflow="([^"]*)"/);
if (ov) { console.error('OVERFLOW: content is cut off on page(s) ' + ov[1].trim() + '. Shorten bullets or add "pageBreakBefore" to a job.'); process.exit(3); }
