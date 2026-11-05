#!/usr/bin/env node
// Serves the site locally the way Vercel would, using the real vercel.json and .vercelignore.
//   node pipeline/scripts/preview.mjs [port]
//   http://localhost:4173          the main site
//   http://<slug>.localhost:4173   that job's variant
// Rebuilds every variant first, as deploy.mjs does. A file outside the .vercelignore allowlist returns 404 here too.
// Not covered: the certificate, DNS, and the redirect from the bare domain to www.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, relative, resolve, sep } from 'node:path';
import { root } from './lib/facts.mjs';
import { buildVariant } from './build-variant.mjs';

const repo = resolve(root, '..');
const port = Number(process.argv[2] || 4173);
const { routes } = JSON.parse(readFileSync(resolve(repo, 'vercel.json'), 'utf8'));
const allowed = readFileSync(resolve(repo, '.vercelignore'), 'utf8')
  .split('\n')
  .filter((line) => line.startsWith('!/'))
  .map((line) => line.slice(2));

const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.mp4': 'video/mp4', '.pdf': 'application/pdf', '.woff2': 'font/woff2', '.json': 'application/json',
};

// localhost stands in for www, and <slug>.localhost for <slug>.mayukhonline.in, so the host rules in vercel.json apply unchanged.
function productionHost(hostHeader = '') {
  const host = hostHeader.split(':')[0].toLowerCase();
  const sub = host.match(/^(.+)\.localhost$/);
  return `${sub ? sub[1] : 'www'}.mayukhonline.in`;
}

// The file Vercel would upload for this URL path, or null.
function uploadedFile(path) {
  const wanted = path.endsWith('/') ? `${path}index.html` : path;
  const file = resolve(repo, `.${wanted}`);
  if (!file.startsWith(repo + sep)) return null;
  const rel = relative(repo, file).split(sep).join('/');
  if (rel.split('/').pop() === '.DS_Store') return null;
  return allowed.some((entry) => rel === entry || rel.startsWith(`${entry}/`)) ? file : null;
}

async function isFile(file) {
  try { return file && (await stat(file)).isFile(); } catch { return false; }
}

// Walks vercel.json's routes in order. A dest with no file falls through, which is how an unknown slug
// showed the normal portfolio when tested on Vercel.
async function resolveRequest(path, host) {
  const headers = {};
  for (const route of routes) {
    if (route.handle === 'filesystem') break;
    const captures = {};
    const hostRule = route.has?.find((h) => h.type === 'host');
    if (hostRule) {
      const m = new RegExp(`^(?:${hostRule.value})$`).exec(host);
      if (!m) continue;
      Object.assign(captures, m.groups);
    }
    const m = new RegExp(`^(?:${route.src})$`).exec(path);
    if (!m) continue;
    Object.assign(captures, m.groups);
    Object.assign(headers, route.headers);
    if (route.status && !route.dest) return { status: route.status, headers };
    if (route.dest) {
      const file = uploadedFile(route.dest.replace(/\$([a-z]+)/gi, (_, name) => captures[name] ?? ''));
      if (await isFile(file)) return { status: 200, headers, file };
    }
    if (!route.continue) break;
  }
  const file = uploadedFile(path);
  return (await isFile(file)) ? { status: 200, headers, file } : { status: 404, headers };
}

const jobsDir = resolve(root, 'jobs');
const slugs = existsSync(jobsDir) ? readdirSync(jobsDir).filter((s) => existsSync(resolve(jobsDir, s, 'variant.json'))) : [];
for (const slug of slugs) {
  try { buildVariant(slug, { quiet: true }); }
  catch (e) { console.error(`${slug}: ${e.message}`); process.exit(1); }
}

createServer(async (req, res) => {
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }
  const result = await resolveRequest(path, productionHost(req.headers.host));
  const headers = { ...result.headers, 'cache-control': 'no-store' };
  if (result.status !== 200) {
    res.writeHead(result.status, { ...headers, 'content-type': 'text/plain; charset=utf-8' });
    return res.end(`${result.status}: not on the deployed site\n`);
  }
  res.writeHead(200, { ...headers, 'content-type': types[extname(result.file).toLowerCase()] || 'application/octet-stream' });
  res.end(await readFile(result.file));
}).listen(port, '127.0.0.1', () => {
  console.log(`Main site:  http://localhost:${port}`);
  for (const slug of slugs) console.log(`Variant:    http://${slug}.localhost:${port}`);
});
