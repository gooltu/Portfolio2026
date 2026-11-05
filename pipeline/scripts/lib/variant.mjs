// Validation for jobs/<slug>/variant.json, shared by check.mjs and build-variant.mjs.
import { profile } from './facts.mjs';

export const ORDER_GROUPS = [
  ['leadership', 'work-terraform', 'work-profiler'], // first page container
  ['process', 'log', 'stack'], // second page container, after the metrics band
];

const plain = (s) => String(s ?? '').replace(/\*/g, '');

const leadershipItems = (v) => [...(v.leadership?.manager ?? []), ...(v.leadership?.ic ?? [])];

// Every string a visitor will read, without the *accent* markup.
export function variantUnits(v) {
  const u = [
    v.meta?.title,
    v.meta?.description,
    ...(v.hero?.eyebrow ?? []),
    v.hero?.headline,
    v.hero?.sub,
    v.sidebarNote,
    v.contactLine,
    v.years && `${v.years} years`,
    v.focus?.label,
    v.focus?.heading,
    ...(v.focus?.items ?? []).flatMap((i) => [i.title, i.text]),
    v.leadership?.heading,
    ...leadershipItems(v).map((i) => i.text),
  ];
  return u.filter(Boolean).map(plain);
}

const count = (hay, needle) => hay.toLowerCase().split(needle.toLowerCase()).length - 1;

// Names that must not gain an appearance on the page. A company can also appear in the base page
// (a "LinkedIn" contact button, say), so the builder compares counts rather than looking for any hit.
export function leakTerms(status, jd) {
  return [...new Set([status.company, status.label, jd.company].map((s) => (s || '').trim()).filter((s) => s.length > 1))];
}

export function leakProblems(variantHtml, baseHtml, terms) {
  return terms
    .filter((t) => count(variantHtml, t) > count(baseHtml, t))
    .map((t) => `the page names "${t}" more often than the base page does; variants must never name the company`);
}

export function variantProblems(v, status, jd, errors, warns) {
  const text = variantUnits(v).join('\n');
  for (const t of leakTerms(status, jd)) {
    if (count(text, t)) errors.push(`variant: copy contains "${t}"; variants must never name the company`);
  }
  if (status.role && count(text, status.role)) errors.push(`variant: copy contains the JD's title "${status.role}", which would read as a title held`);
  if (/https?:|www\.|<[a-z/]/i.test(text)) errors.push('variant: copy must be plain text (no links, images or HTML)');

  for (const [k, ok] of [
    ['meta.title', v.meta?.title],
    ['meta.description', v.meta?.description],
    ['hero.headline', v.hero?.headline],
    ['hero.sub', v.hero?.sub],
    ['hero.eyebrow', v.hero?.eyebrow?.length],
  ]) if (!ok) errors.push(`variant: ${k} is required`);

  if (v.leadership && !(v.leadership.heading && v.leadership.manager?.length && v.leadership.ic?.length)) {
    errors.push('variant: leadership needs a heading and at least one manager and one ic item');
  }

  const ids = new Set(profile.claims.map((c) => c.id));
  for (const item of [...(v.focus?.items ?? []), ...leadershipItems(v)]) {
    const name = item.title || item.text;
    if (!item.claims?.length) errors.push(`variant: item "${name}" cites no claim ids`);
    for (const id of item.claims ?? []) {
      if (!ids.has(id)) errors.push(`variant: item "${name}" cites unknown claim "${id}"`);
      const claim = profile.claims.find((c) => c.id === id);
      if (claim && /\bconfirm/i.test(`${claim.source} ${claim.text}`)) warns.push(`variant: claim "${id}" is still marked for your confirmation`);
    }
  }

  if (v.sectionOrder) {
    const o = v.sectionOrder;
    const all = ['readme', ...ORDER_GROUPS.flat(), 'contact'];
    if (o.length !== all.length || !all.every((id) => o.includes(id))) errors.push(`variant: sectionOrder must list each of: ${all.join(', ')}`);
    else {
      if (o[0] !== 'readme' || o.at(-1) !== 'contact') errors.push('variant: sectionOrder must start with readme and end with contact');
      const first = o.slice(1, 4);
      if (!first.every((id) => ORDER_GROUPS[0].includes(id))) errors.push(`variant: the first three reorderable sections must be ${ORDER_GROUPS[0].join(', ')} (the metrics band sits between the two groups)`);
      if (Math.abs(o.indexOf('work-terraform') - o.indexOf('work-profiler')) !== 1) errors.push('variant: work-terraform and work-profiler must be adjacent (they share the sidebar\'s work folder)');
    }
  }
}
