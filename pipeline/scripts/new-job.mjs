#!/usr/bin/env node
// Scaffolds a job folder with a neutral slug: the next free one in slug-pool.json, whose subdomain is
// already set up, or a new random one (which needs its own DNS setup) if the pool has run out.
//   node pipeline/scripts/new-job.mjs "<label>" [company] [role]
// Creates pipeline/jobs/<slug>/ with status.json, jd.txt and an empty jd.json.
// pipeline/jobs/ is git-ignored on purpose: it names the companies you apply to.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomInt } from 'node:crypto';
import { writePages } from './list-pages.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [label = 'untitled', company = '', role = ''] = process.argv.slice(2);
const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'; // no i, l, o, 0, 1: easy to read aloud and type
const makeSlug = () => Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');

const taken = (s) => existsSync(resolve(root, 'jobs', s)) || existsSync(resolve(root, '..', 'variants', s));
const free = JSON.parse(readFileSync(resolve(root, 'slug-pool.json'), 'utf8')).slugs.filter((s) => !taken(s));
let slug = free[0];
while (!slug || taken(slug)) slug = makeSlug();

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
writePages();
console.log(`Created ${dir}`);
console.log(`Slug:        ${slug}`);
console.log(`Variant URL: ${status.variantUrl}  (not live until deployed)`);
if (free.length) console.log(`Subdomain:   already set up. ${free.length - 1} left in the pool.`);
else console.log('Subdomain:   the pool is empty, so set this one up before deploying. See "DNS for each variant" in pipeline/README.md.');
if (free.length === 2 || free.length === 1) console.log('Pool:        running low. See "Topping up the pool" in pipeline/README.md.');
