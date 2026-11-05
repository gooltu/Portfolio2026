#!/usr/bin/env node
// Builds a job's portfolio variant from the live index.html and jobs/<slug>/variant.json.
//   node pipeline/scripts/build-variant.mjs <slug>
// Output: variants/<slug>/index.html. Everything else (CSS, JS, images, case studies) is shared with the
// main site, so a fix to the base page reaches every variant on the next build.
// Refuses to write the page if the copy fails the fact check or the page names the company.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { root, checkUnits, checkRules } from './lib/facts.mjs';
import { ORDER_GROUPS, variantUnits, variantProblems, leakTerms, leakProblems } from './lib/variant.mjs';

const repo = resolve(root, '..');
const CASE_STUDIES = ['terraform-case-study.html', 'memory-profiler-case-study.html', 'leadership-case-study.html', 'oecc-case-study.html'];
// Sections that exist only in variants that ask for them (variant.json "extraSections"). Source: pipeline/partials/<id>.html and <id>.nav.html.
const EXTRA_SECTIONS = ['work-oecc'];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// *word* becomes the accent colour; everything else is escaped.
const rich = (s) => esc(s).replace(/\*([^*]+)\*/g, '<span style="color:var(--accent);white-space:nowrap">$1</span>');

function once(html, re, replacement, what) {
  const hits = html.match(new RegExp(re.source, re.flags.replace('g', '') + 'g'));
  if (hits?.length !== 1) throw new Error(`index.html: expected one ${what}, found ${hits?.length ?? 0}. Did the base page change?`);
  return html.replace(re, replacement);
}
const setMarked = (html, name, tag, inner) =>
  once(html, new RegExp(`(<${tag}\\b[^>]*data-variant="${name}"[^>]*>)[\\s\\S]*?(</${tag}>)`), (_, a, b) => a + inner + b, `data-variant="${name}"`);

// Visible text, one unit per block, for the rule checks.
export function pageUnits(html) {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/g, ' ')
    .replace(/<\/(div|p|h[1-6]|section|li|pre|a|button|title)>/g, '\n')
    .replace(/<meta name="description" content="([^"]*)">/, '$1\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .split('\n')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function reorder(html, order) {
  const sectionRe = (id) => new RegExp(`      <section id="${id}"[\\s\\S]*?\\n      </section>\\n`);
  const blocks = Object.fromEntries(ORDER_GROUPS.flat().map((id) => {
    const m = html.match(sectionRe(id));
    if (!m) throw new Error(`index.html: section "${id}" not found`);
    return [id, m[0]];
  }));
  // Swap through placeholders, so a block containing "$" or a matching id can't interfere.
  for (const id of Object.keys(blocks)) html = html.replace(blocks[id], () => `@@SLOT:${id}@@`);
  const slots = ORDER_GROUPS.flat();
  const wanted = order.slice(1, -1);
  slots.forEach((slot, i) => { html = html.replace(`@@SLOT:${slot}@@`, () => `@@FILL:${wanted[i]}@@`); });
  for (const id of slots) html = html.replace(`@@FILL:${id}@@`, () => blocks[id]);

  // Sidebar: same order, with the work folder kept directly above its two files.
  const nav = html.match(/(<nav id="explorerNav">\n)([\s\S]*?)(\s*<\/nav>)/);
  const lines = nav[2].split('\n');
  const link = (id) => lines.find((l) => l.includes(`data-section-id="${id}"`));
  const folder = lines.find((l) => l.includes('ph-folder-open'));
  const out = [];
  for (const id of order) {
    if (id.startsWith('work-') && !out.includes(folder)) out.push(folder);
    out.push(link(id));
  }
  return html.replace(nav[0], () => nav[1] + out.join('\n') + nav[3]);
}

function focusSection(f) {
  const cards = f.items.map((i) => `
          <div class="highlight-card" style="border-color:var(--border);padding:24px">
            <div style="font-size:19px;margin-bottom:12px">${esc(i.title)}</div>
            <div style="font-size:15px;line-height:1.55;color:var(--text-2);text-wrap:pretty">${esc(i.text)}</div>
          </div>`).join('');
  return `      <section id="focus" style="padding:48px 0 24px">
        <div class="section-label">${esc(f.label || '~/focus.md')}</div>
        <h2 style="margin:0;font-weight:500;font-size:clamp(32px,4.4vw,56px);line-height:1;letter-spacing:-.035em;max-width:18ch;text-wrap:balance">${rich(f.heading)}</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:36px">${cards}
        </div>
      </section>
`;
}

// Puts the tailored points into the leadership section's own heading and its manager and IC cards,
// for a variant whose focus would only repeat that section. Its survey band and case study link stay.
function tailorLeadership(html, l) {
  const block = html.match(/      <section id="leadership"[\s\S]*?\n      <\/section>\n/);
  if (!block) throw new Error('index.html: section "leadership" not found');
  const lists = /(<div style="display:flex;flex-direction:column;gap:14px[^>]*>)[\s\S]*?(\n            <\/div>)/g;
  if (block[0].match(lists)?.length !== 2) throw new Error('index.html: expected the manager and IC lists in the leadership section. Did the base page change?');
  const items = [l.manager, l.ic];
  const out = block[0]
    .replace(/(<h2\b[^>]*>)[\s\S]*?(<\/h2>)/, (_, a, b) => a + rich(l.heading) + b)
    .replace(lists, (_, a, b) => a + items.shift().map((i) => `\n              <div>${esc(i.text)}</div>`).join('') + b);
  return html.replace(block[0], () => out);
}

export function renderVariant(base, v) {
  let html = base;
  html = once(html, /<title>[^<]*<\/title>/, () => `<title>${esc(v.meta.title)}</title>`, '<title>');
  html = once(html, /<meta name="description" content="[^"]*">/, () => `<meta name="description" content="${esc(v.meta.description)}">`, 'meta description');
  html = once(html, /<meta charset="utf-8">/, () => '<meta charset="utf-8">\n<meta name="robots" content="noindex, nofollow">', 'meta charset');

  const sep = '<span style="color:var(--border-strong)">/</span>';
  const eyebrow = ['<span style="color:var(--accent-icon)"># README.md</span>', ...v.hero.eyebrow.map((s) => `<span>${esc(s)}</span>`)].join(sep);
  html = setMarked(html, 'eyebrow', 'div', `\n          ${eyebrow}\n        `);
  html = setMarked(html, 'headline', 'h1', rich(v.hero.headline));
  html = setMarked(html, 'sub', 'p', esc(v.hero.sub));
  if (v.sidebarNote) html = setMarked(html, 'sidebar-note', 'span', esc(v.sidebarNote));
  if (v.contactLine) html = setMarked(html, 'contact-line', 'p', esc(v.contactLine));
  if (v.years) {
    html = setMarked(html, 'status-years', 'span', `${esc(v.years)} yrs · DevEx`);
    // home.js reads this for the terminal, which is shared with the main site.
    html = once(html, /<html lang="en">/, () => `<html lang="en" data-years="${esc(v.years)}">`, '<html lang="en">');
  }
  if (v.leadership) html = tailorLeadership(html, v.leadership);
  if (v.sectionOrder) html = reorder(html, v.sectionOrder);
  for (const id of v.extraSections || []) {
    if (!EXTRA_SECTIONS.includes(id)) throw new Error(`variant: unknown extra section "${id}"`);
    const sec = readFileSync(resolve(root, 'partials', `${id}.html`), 'utf8');
    const navLink = readFileSync(resolve(root, 'partials', `${id}.nav.html`), 'utf8');
    // Goes first in the work group: before the first work section and right under the sidebar's work folder.
    const first = html.match(/      <section id="work-[a-z]+"/);
    if (!first) throw new Error('index.html: no work section to place an extra section before');
    html = html.replace(first[0], () => `${sec.replace(/\n$/, '')}\n\n      <hr class="divider">\n\n${first[0]}`);
    const folder = html.match(/[^\n]*ph-folder-open[^\n]*\n/);
    html = html.replace(folder[0], () => folder[0] + navLink);
  }
  if (v.focus?.items?.length) {
    const readme = html.match(/      <section id="readme"[\s\S]*?\n      <\/section>\n/)[0];
    html = html.replace(readme, () => `${readme}\n${focusSection(v.focus)}`);
  }
  return html.replace(/ data-variant="[^"]*"/g, '');
}

export function buildVariant(slug, { quiet = false } = {}) {
  const dir = resolve(root, 'jobs', slug);
  const variantPath = resolve(dir, 'variant.json');
  if (!existsSync(variantPath)) throw new Error(`No variant.json in ${dir}`);
  const read = (p) => readFileSync(p, 'utf8');
  const v = JSON.parse(read(variantPath));
  const status = JSON.parse(read(resolve(dir, 'status.json')));
  const jdPath = resolve(dir, 'jd.json');
  const jd = existsSync(jdPath) ? JSON.parse(read(jdPath)) : {};

  const errors = [], warns = [];
  checkUnits('variant', variantUnits(v), errors, warns);
  variantProblems(v, status, jd, errors, warns);

  let html = '';
  const base = read(resolve(repo, 'index.html'));
  if (!errors.length) {
    html = renderVariant(base, v);
    // The whole page and everything it links to must follow the rules, not only the tailored copy.
    checkRules('variant page', pageUnits(html), errors, warns);
    checkRules('home.js', read(resolve(repo, 'home.js')).split('\n'), errors, warns);
    // Case studies are narrative: they mention Progress without listing its roles, so errors only.
    for (const f of CASE_STUDIES) checkRules(f, pageUnits(read(resolve(repo, f))), errors, []);
    errors.push(...leakProblems(html, base, leakTerms(status, jd)));
  }

  if (!quiet) for (const w of warns) console.log('  ! ' + w);
  if (errors.length) {
    for (const e of errors) console.log('  ✗ ' + e);
    throw new Error(`${errors.length} error(s). Variant not written.`);
  }
  const outDir = resolve(repo, 'variants', slug);
  mkdirSync(outDir, { recursive: true });
  const out = resolve(outDir, 'index.html');
  writeFileSync(out, html);

  if (!quiet) console.log(`Built ${out}`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2];
  if (!slug) { console.error('Usage: build-variant.mjs <slug>'); process.exit(2); }
  try { buildVariant(slug); }
  catch (e) { console.error(e.message); process.exit(1); }
}
