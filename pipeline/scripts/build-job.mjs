#!/usr/bin/env node
// Fact-checks, then builds jobs/<slug>/resume.json into a PDF.
//   node pipeline/scripts/build-job.mjs <slug>
// Output: jobs/<slug>/Resume_MayukhChakraborty_<Company>.pdf  (plus resume.html next to it)
import { readFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const slug = process.argv[2];
if (!slug) { console.error('Usage: build-job.mjs <slug>'); process.exit(2); }
const dir = resolve(root, 'jobs', slug);
if (!existsSync(resolve(dir, 'resume.json'))) { console.error('No resume.json in', dir); process.exit(2); }

const check = spawnSync('node', [resolve(root, 'scripts/check.mjs'), slug], { stdio: 'inherit' });
if (check.status !== 0) { console.error('Not building: fix the fact-check errors first.'); process.exit(1); }

const out = resolve(dir, 'resume');
const build = spawnSync('node', [resolve(root, 'resume/build.mjs'), resolve(dir, 'resume.json'), out], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);

const status = JSON.parse(readFileSync(resolve(dir, 'status.json'), 'utf8'));
const name = (status.company || status.label || 'Job').replace(/[^A-Za-z0-9]+/g, '');
const finalPdf = resolve(dir, `Resume_MayukhChakraborty_${name}.pdf`);
copyFileSync(out + '.pdf', finalPdf);
console.log('Built', finalPdf);
if (!status.variantLive) console.log('Note: the resume links to', status.portfolioUrl, '(the variant URL is not live yet).');
