#!/usr/bin/env node
// Fact-checks a resume (and cover letter) against pipeline/profile.json and reports JD keyword coverage.
//   node pipeline/scripts/check.mjs <slug>                 checks jobs/<slug>/resume.json, cover-letter.md, jd.json
//   node pipeline/scripts/check.mjs --file <resume.json>   checks a single resume file
// Exit code 1 if any error is found. Warnings never fail the check.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const profile = JSON.parse(readFileSync(resolve(root, 'profile.json'), 'utf8'));

// ---------- numbers ----------
// Every number in the document must also appear in the fact bank. Percentages must appear as percentages.
const NUM = /(?<![\w.,])(\d+(?:,\d{3})*(?:\.\d+)?)(\s*%|\s*[KkMm]\b)?/g;
function numbers(text) {
  const out = [];
  for (const m of text.matchAll(NUM)) {
    const raw = m[1];
    if (/^(19|20)\d\d$/.test(raw)) continue; // years
    let v = parseFloat(raw.replace(/,/g, ''));
    const suf = (m[2] || '').trim();
    const pct = suf === '%';
    if (/^[Kk]$/.test(suf)) v *= 1e3;
    if (/^[Mm]$/.test(suf)) v *= 1e6;
    out.push({ key: `${pct ? 'pct' : 'num'}:${v}`, shown: (raw + suf).trim() });
  }
  return out;
}
const factText = [
  ...profile.claims.flatMap((c) => [c.text, c.metric || '', c.note || '']),
  ...Object.values(profile.counting_rules).filter((x) => typeof x === 'string'),
  ...profile.timeline.map((t) => t.note || ''),
  ...profile.timeline.map((t) => t.team || ''),
].join('\n');
const known = new Set(numbers(factText).map((n) => n.key));
// A bare number may also match the percent-less form of itself (e.g. "80%+" in the facts vs "80" elsewhere)
const knownPlain = new Set([...known].map((k) => k.split(':')[1]));
const allowedYears = new Set(profile.counting_rules.allowed_year_phrases.map((s) => s.toLowerCase()));

// ---------- units of text ----------
function resumeUnits(r) {
  const u = [];
  const h = r.header;
  u.push(h.name, h.title, ...h.lines, ...h.tagline, ...h.summary);
  for (const j of r.experience) {
    u.push(`${j.company} - ${j.role}`, j.dates, j.subtitle || '', ...j.bullets);
  }
  u.push(r.skills, ...r.technicalSkills.map((t) => `${t.label} ${t.text}`), ...r.honors);
  return u.filter(Boolean).map((s) => s.replace(/\*\*/g, ''));
}
const coverUnits = (md) => md.split(/\n+/).map((s) => s.trim()).filter(Boolean);

// ---------- checks ----------
function checkUnits(name, units, errors, warns) {
  const doc = units.join('\n');
  for (const u of units) {
    for (const n of numbers(u)) {
      const ok = n.key.startsWith('pct:') ? known.has(n.key) : known.has(n.key) || knownPlain.has(n.key.split(':')[1]);
      if (!ok) errors.push(`${name}: number "${n.shown}" is not in profile.json  ->  "${u.slice(0, 90)}…"`);
    }
    for (const m of u.matchAll(/(\d+(?:\.\d+)?\+?)\s*(?:years|yrs)\b/gi)) {
      const phrase = `${m[1]} years`.toLowerCase();
      if (!allowedYears.has(phrase)) errors.push(`${name}: year claim "${m[0]}" is not allowed by counting_rules  ->  "${u.slice(0, 90)}…"`);
    }
  }
  for (const rule of profile.rules) {
    if (rule.docPattern) {
      if (new RegExp(rule.docPattern, 'i').test(doc)) errors.push(`${name}: ${rule.why}`);
    } else {
      for (const u of units) {
        const low = u.toLowerCase();
        const hit = rule.all.every((s) => low.includes(s.toLowerCase()));
        const excused = (rule.unless || []).some((s) => low.includes(s.toLowerCase()));
        if (hit && !excused) errors.push(`${name}: ${rule.why}  ->  "${u.slice(0, 90)}…"`);
      }
    }
  }
  for (const req of profile.required_when) {
    if (doc.includes(req.if)) for (const need of req.contains) if (!doc.includes(need)) warns.push(`${name}: mentions ${req.if} but not "${need}". ${req.why}`);
  }
}

function coverage(jd, text) {
  const low = text.toLowerCase();
  const rows = [];
  for (const [bucket, list] of Object.entries(jd.keywords || {})) {
    for (const k of list) {
      const term = typeof k === 'string' ? k : k.term;
      const aliases = typeof k === 'string' ? [] : k.aliases || [];
      const found = [term, ...aliases].some((t) => low.includes(t.toLowerCase()));
      rows.push({ bucket, term, found });
    }
  }
  return rows;
}

// ---------- run ----------
const args = process.argv.slice(2);
if (!args.length) { console.error('Usage: check.mjs <slug> | --file <resume.json>'); process.exit(2); }
const errors = [], warns = [];
let resumePath, coverPath, jdPath;
if (args[0] === '--file') resumePath = resolve(args[1]);
else {
  const dir = resolve(root, 'jobs', args[0]);
  if (!existsSync(dir)) { console.error('No such job folder:', dir); process.exit(2); }
  resumePath = resolve(dir, 'resume.json');
  coverPath = resolve(dir, 'cover-letter.md');
  jdPath = resolve(dir, 'jd.json');
}
let allText = '';
if (existsSync(resumePath)) {
  const units = resumeUnits(JSON.parse(readFileSync(resumePath, 'utf8')));
  checkUnits('resume', units, errors, warns);
  allText += units.join('\n');
} else errors.push(`missing ${resumePath}`);
if (coverPath && existsSync(coverPath)) {
  const units = coverUnits(readFileSync(coverPath, 'utf8'));
  checkUnits('cover letter', units, errors, warns);
  allText += '\n' + units.join('\n');
  const words = units.join(' ').split(/\s+/).length;
  if (words > 380) warns.push(`cover letter is ${words} words; aim for 300 or fewer.`);
}
if (jdPath && existsSync(jdPath)) {
  const rows = coverage(JSON.parse(readFileSync(jdPath, 'utf8')), allText);
  if (rows.length) {
    console.log('\nJD keyword coverage');
    for (const b of ['must', 'nice']) {
      const r = rows.filter((x) => x.bucket === b);
      if (!r.length) continue;
      console.log(`  ${b}: ${r.filter((x) => x.found).length}/${r.length}`);
      for (const x of r) if (!x.found) console.log(`    missing: ${x.term}`);
    }
    console.log('  (A missing keyword is a prompt to check the fact bank for real evidence, never to add it without one.)');
  }
}
console.log('');
for (const w of warns) console.log('  ! ' + w);
for (const e of errors) console.log('  ✗ ' + e);
console.log(errors.length ? `\n${errors.length} error(s). Fix before building or sending.` : '\nFact check passed.');
process.exit(errors.length ? 1 : 0);
