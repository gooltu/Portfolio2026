// Fact engine shared by check.mjs (resume, letter, variant copy) and build-variant.mjs (whole page).
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const profile = JSON.parse(readFileSync(resolve(root, 'profile.json'), 'utf8'));

// ---------- numbers ----------
// Every number in the document must also appear in the fact bank. Percentages must appear as percentages.
const NUM = /(?<![\w.,])(\d+(?:,\d{3})*(?:\.\d+)?)(\s*%|\s*[KkMm]\b)?/g;
export function numbers(text) {
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

// ---------- checks ----------
export function isKnownNumber(n) {
  return n.key.startsWith('pct:') ? known.has(n.key) : known.has(n.key) || knownPlain.has(n.key.split(':')[1]);
}

// Rules and year phrases only: for the base page, whose copy is not all in the bank.
export function checkRules(name, units, errors, warns) {
  const doc = units.join('\n');
  for (const u of units) {
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

export function checkUnits(name, units, errors, warns) {
  for (const u of units) {
    for (const n of numbers(u)) {
      if (!isKnownNumber(n)) errors.push(`${name}: number "${n.shown}" is not in profile.json  ->  "${u.slice(0, 90)}…"`);
    }
  }
  checkRules(name, units, errors, warns);
}
