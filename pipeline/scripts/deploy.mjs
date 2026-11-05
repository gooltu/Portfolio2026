#!/usr/bin/env node
// Ships the site and every variant to production, then records which variant URLs really work.
//   node pipeline/scripts/deploy.mjs              rebuild variants, deploy, check, promote, verify
//   node pipeline/scripts/deploy.mjs --dry-run    same, but stop before promoting
//   node pipeline/scripts/deploy.mjs --verify     only re-check live URLs (use after the DNS change)
//
// Order matters: the deployment is created unpromoted and its file list is checked against an allowlist,
// so a private file that slipped past .vercelignore never reaches the public domain.
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { root } from './lib/facts.mjs';
import { buildVariant } from './build-variant.mjs';
import { writePages } from './list-pages.mjs';

// Refresh the local page list on every way out, since a run can change which variants are live.
process.on('exit', writePages);

const repo = resolve(root, '..');
const flags = new Set(process.argv.slice(2));
const die = (msg) => { console.error(`\n✗ ${msg}`); process.exit(1); };

function vercel(args) {
  const r = spawnSync('vercel', args, { cwd: repo, encoding: 'utf8', timeout: 300000 });
  if (r.error) die(`could not run vercel: ${r.error.message}`);
  return r;
}

// ---------- jobs ----------
const jobsDir = resolve(root, 'jobs');
const slugs = existsSync(jobsDir) ? readdirSync(jobsDir).filter((s) => statSync(resolve(jobsDir, s)).isDirectory()) : [];
const statusPath = (slug) => resolve(jobsDir, slug, 'status.json');
const readStatus = (slug) => JSON.parse(readFileSync(statusPath(slug), 'utf8'));
const hasVariant = (slug) => existsSync(resolve(jobsDir, slug, 'variant.json'));

// ---------- checks ----------
const ALLOWED_ROOT = new Set(['index.html', 'terraform-case-study.html', 'memory-profiler-case-study.html', 'leadership-case-study.html', 'oecc-case-study.html', 'styles.css', 'script.js', 'home.js', 'favicon.svg']);
const ALLOWED_DIRS = ['assets/', 'variants/'];

function flatten(nodes, prefix = '') {
  return nodes.flatMap((n) => (n.children ? flatten(n.children, `${prefix}${n.name}/`) : [`${prefix}${n.name}`]));
}

function checkUploadedFiles(deploymentId, liveSlugs) {
  const r = vercel(['api', `/v6/deployments/${deploymentId}/files`]);
  if (r.status !== 0) die(`could not list the deployment's files, so it was not promoted.\n${r.stderr.slice(-400)}`);
  const files = flatten(JSON.parse(r.stdout)).map((f) => f.replace(/^src\//, ''));
  if (!files.length) die('the deployment reports no files, so it was not promoted.');
  const bad = files.filter((f) => !ALLOWED_ROOT.has(f) && !ALLOWED_DIRS.some((d) => f.startsWith(d)));
  if (bad.length) die(`private files were uploaded, so the deployment was not promoted:\n  ${bad.join('\n  ')}\nFix .vercelignore, then delete this deployment: vercel rm ${deploymentId} --yes`);
  const missing = [...ALLOWED_ROOT, ...liveSlugs.map((s) => `variants/${s}/index.html`)].filter((f) => !files.includes(f));
  if (missing.length) die(`the deployment is missing files, so it was not promoted:\n  ${missing.join('\n  ')}`);
  console.log(`  ${files.length} files uploaded, all on the allowlist.`);
}

async function get(url, opts = {}) {
  const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000), ...opts });
  return { status: res.status, robots: res.headers.get('x-robots-tag') || '', body: res.status === 200 ? await res.text() : '' };
}

// A variant counts as live only over real DNS and a valid certificate, serving its own page.
async function verifyVariant(slug) {
  const expected = readFileSync(resolve(repo, 'variants', slug, 'index.html'), 'utf8').match(/<title>[^<]*<\/title>/)[0];
  const url = readStatus(slug).variantUrl;
  try {
    const r = await get(`${url}/`);
    if (r.status !== 200) return `HTTP ${r.status}`;
    if (!r.body.includes(expected)) return 'served a page other than the variant';
    if (!r.robots.includes('noindex')) return 'missing the noindex header';
    return null;
  } catch (e) {
    return e.cause?.code || e.cause?.message || e.message;
  }
}

async function verifyAll(variantSlugs) {
  const failed = [];
  for (const slug of variantSlugs) {
    const status = readStatus(slug);
    const problem = await verifyVariant(slug);
    if (problem) {
      failed.push(slug);
      console.log(`  ✗ ${status.variantUrl}: ${problem}`);
      if (status.variantLive) console.log('    It was live before: check this now, since a resume may link to it.');
      continue;
    }
    console.log(`  ✓ ${status.variantUrl}`);
    if (!status.variantLive || status.portfolioUrl !== status.variantUrl) {
      status.variantLive = true;
      status.portfolioUrl = status.variantUrl;
      writeFileSync(statusPath(slug), JSON.stringify(status, null, 2) + '\n');
      if (existsSync(resolve(jobsDir, slug, 'resume.json'))) {
        const b = spawnSync('node', [resolve(root, 'scripts/build-job.mjs'), slug], { stdio: 'ignore' });
        console.log(b.status === 0 ? '    Resume rebuilt to link here. Earlier PDFs still link to the main site.' : `    Could not rebuild the resume: run build-job.mjs ${slug}`);
      }
    }
  }
  return failed;
}

function explainDns() {
  console.log(`
Variants are deployed but not reachable yet, and each resume keeps linking to the main site.
Each variant needs its own CNAME: follow "DNS for each variant" in pipeline/README.md.
Do not switch the nameservers to fix this: before Vercel activates the zone, that takes the whole domain down (see "Wildcard DNS").
Once DNS is ready, run:  node pipeline/scripts/deploy.mjs --verify`);
}

// ---------- run ----------
const variantSlugs = slugs.filter(hasVariant);

if (flags.has('--verify')) {
  const failed = await verifyAll(variantSlugs);
  if (failed.length) { explainDns(); process.exit(1); }
  process.exit(0);
}

if (!existsSync(resolve(repo, '.vercelignore'))) die('.vercelignore is missing, so a deploy would publish pipeline/jobs/.');

console.log('Building variants');
for (const slug of variantSlugs) {
  try { buildVariant(slug, { quiet: true }); console.log(`  ${slug}`); }
  catch (e) { die(`${slug}: ${e.message} Nothing was deployed.`); }
}
// Variants are git-ignored and live on this machine only: never ship without one that a resume may link to.
const orphaned = slugs.filter((s) => readStatus(s).variantLive && !hasVariant(s));
if (orphaned.length) die(`these jobs are marked live but have no variant.json, and deploying would take them down: ${orphaned.join(', ')}`);

console.log('\nCreating deployment (not public yet)');
const dep = vercel(['deploy', '--prod', '--skip-domain', '--yes']);
if (dep.status !== 0) die(`deploy failed:\n${dep.stderr.slice(-800)}`);
let deployment;
try { deployment = JSON.parse(dep.stdout).deployment; }
catch { // Older or human-output CLI: the URL is the last line.
  const url = dep.stdout.trim().split('\n').at(-1);
  const inspected = vercel(['api', `/v13/deployments/${new URL(url).host}`]);
  deployment = { ...JSON.parse(inspected.stdout), url };
}
console.log(`  ${deployment.url}`);

console.log('\nChecking uploaded files');
checkUploadedFiles(deployment.id, variantSlugs);

if (flags.has('--dry-run')) {
  console.log('\nDry run: stopping before promotion. The public site is unchanged.');
  process.exit(0);
}

console.log('\nPromoting to production');
const promoted = vercel(['promote', deployment.url, '--yes']);
if (promoted.status !== 0) die(`promote failed; the public site is unchanged:\n${promoted.stderr.slice(-800)}`);

console.log('\nChecking the public site');
const main = await get('https://www.mayukhonline.in/');
const base = readFileSync(resolve(repo, 'index.html'), 'utf8').match(/<title>[^<]*<\/title>/)[0];
if (main.status !== 200 || !main.body.includes(base)) die(`the main site looks wrong (HTTP ${main.status}). To undo: vercel rollback --yes`);
console.log('  ✓ main site');
for (const path of ['/CLAUDE.md', '/pipeline/profile.json', '/phase1.tgz', '/design-source/DESIGN_HANDOFF.md', ...slugs.map((s) => `/variants/${s}/index.html`)]) {
  const r = await get(`https://www.mayukhonline.in${path}`);
  if (r.status !== 404) die(`${path} returned HTTP ${r.status} on the public site; it should be 404. To undo: vercel rollback --yes`);
}
console.log('  ✓ private paths return 404');

const failed = await verifyAll(variantSlugs);
if (failed.length) explainDns();
