#!/usr/bin/env node
// Fact-checks a resume (and cover letter) against pipeline/profile.json and reports JD keyword coverage.
//   node pipeline/scripts/check.mjs <slug>                 checks jobs/<slug>/resume.json, cover-letter.md, variant.json, jd.json
//   node pipeline/scripts/check.mjs --file <resume.json>   checks a single resume file
// Exit code 1 if any error is found. Warnings never fail the check.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkUnits } from './lib/facts.mjs';
import { variantProblems, variantUnits } from './lib/variant.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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
if (args[0] !== '--file') {
  const dir = resolve(root, 'jobs', args[0]);
  const variantPath = resolve(dir, 'variant.json');
  if (existsSync(variantPath)) {
    const v = JSON.parse(readFileSync(variantPath, 'utf8'));
    const status = JSON.parse(readFileSync(resolve(dir, 'status.json'), 'utf8'));
    const jd = jdPath && existsSync(jdPath) ? JSON.parse(readFileSync(jdPath, 'utf8')) : {};
    checkUnits('variant', variantUnits(v), errors, warns);
    variantProblems(v, status, jd, errors, warns);
  }
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
