#!/usr/bin/env node
// Scaffolds a job folder with a random, neutral slug.
//   node pipeline/scripts/new-job.mjs "<label>" [company] [role]
// Creates pipeline/jobs/<slug>/ with status.json, jd.txt and an empty jd.json.
// pipeline/jobs/ is git-ignored on purpose: it names the companies you apply to.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomInt } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [label = 'untitled', company = '', role = ''] = process.argv.slice(2);
const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'; // no i, l, o, 0, 1: easy to read aloud and type
const makeSlug = () => Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');

let slug = makeSlug();
while (existsSync(resolve(root, 'jobs', slug)) || existsSync(resolve(root, '..', 'variants', slug))) slug = makeSlug();

const dir = resolve(root, 'jobs', slug);
mkdirSync(dir, { recursive: true });
const status = {
  slug,
  label,
  company,
  role,
  created: new Date().toISOString().slice(0, 10),
  stage: 'intake',
  // The apex URL is used in the resume until the variant is deployed (Phase 3).
  portfolioUrl: 'https://mayukhonline.in',
  variantUrl: `https://${slug}.mayukhonline.in`,
  variantLive: false,
};
writeFileSync(resolve(dir, 'status.json'), JSON.stringify(status, null, 2) + '\n');
writeFileSync(resolve(dir, 'jd.txt'), '# Paste the full job description below this line (LinkedIn blocks automated fetching).\n');
writeFileSync(
  resolve(dir, 'jd.json'),
  JSON.stringify(
    {
      title: role,
      level: '',
      location: '',
      yearsRequired: null,
      domain: '',
      mustHave: [],
      niceToHave: [],
      keywords: { must: [], nice: [] },
      notes: 'keywords: strings or {"term": "...", "aliases": ["..."]}. Only list terms the JD actually uses.',
    },
    null,
    2
  ) + '\n'
);
console.log(`Created ${dir}`);
console.log(`Slug:        ${slug}`);
console.log(`Variant URL: ${status.variantUrl}  (not live until deployed)`);
