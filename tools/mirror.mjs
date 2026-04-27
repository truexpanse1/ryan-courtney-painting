#!/usr/bin/env node
// Mirror the published Webflow site for Law's Custom Painting and rewrite asset URLs
// to local relative paths. Output goes into the repo root.
//
// Usage: node tools/mirror.mjs
//
// What it does:
//   1. Fetches all 8 known pages from https://lawscustompainting.webflow.io
//   2. Parses every asset URL (images, CSS, JS, fonts)
//   3. Downloads each unique asset to /images, /css, /js, /fonts
//   4. Rewrites HTML to point at local paths
//   5. Writes HTML pages to repo root preserving the directory structure

import fs from 'node:fs/promises';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const SRC = 'https://lawscustompainting.webflow.io';

// Pages to mirror (kept simple — explicit list)
const PAGES = [
  { src: '/', out: 'index.html' },
  { src: '/about', out: 'about.html' },
  { src: '/blog', out: 'blog.html' },
  { src: '/contact', out: 'contact.html' },
  { src: '/service', out: 'service.html' },
  { src: '/services/cabinets', out: 'services/cabinets.html' },
  { src: '/services/doors-and-shelves', out: 'services/doors-and-shelves.html' },
  { src: '/services/interior-walls', out: 'services/interior-walls.html' },
];

// Webflow asset host patterns we need to bring local
const ASSET_HOSTS = [
  'cdn.prod.website-files.com',
  'd3e54v103j8qbb.cloudfront.net', // Webflow's jQuery CDN
];

// Track downloaded assets so we never download twice
const assetMap = new Map(); // remote URL -> local path

function localPathFor(remoteUrl) {
  const u = new URL(remoteUrl);
  // Hash-prefixed filename from cdn.prod.website-files.com — keep last 2 segments to dedupe
  // path looks like /695b771536251820e5c9b217/695b771536251820e5c9b3f5_web_branding.png
  const parts = u.pathname.split('/').filter(Boolean);
  const filename = parts[parts.length - 1];
  const ext = path.extname(filename).toLowerCase();
  // jQuery on cloudfront has a hash too, treat as js
  let folder = 'images';
  if (['.js'].includes(ext)) folder = 'js';
  else if (['.css'].includes(ext)) folder = 'css';
  else if (['.woff', '.woff2', '.ttf', '.otf', '.eot'].includes(ext)) folder = 'fonts';
  return path.join(folder, filename);
}

async function ensureDir(filepath) {
  await mkdir(path.dirname(filepath), { recursive: true });
}

async function downloadAsset(remoteUrl) {
  if (assetMap.has(remoteUrl)) return assetMap.get(remoteUrl);
  const local = localPathFor(remoteUrl);
  const dest = path.join(REPO_ROOT, local);

  // Skip if already on disk
  try {
    await fs.access(dest);
    assetMap.set(remoteUrl, local);
    return local;
  } catch {}

  await ensureDir(dest);
  const r = await fetch(remoteUrl);
  if (!r.ok) {
    console.warn(`  ! ${r.status} fetching ${remoteUrl}`);
    return null;
  }
  const buf = Buffer.from(await r.arrayBuffer());
  await fs.writeFile(dest, buf);
  assetMap.set(remoteUrl, local);
  console.log(`  ↓ ${local} (${(buf.length / 1024).toFixed(1)} KB)`);
  return local;
}

// Find every absolute URL in HTML/CSS that points at a Webflow asset host
function findAssetUrls(content) {
  const urls = new Set();
  const re = /https?:\/\/([a-zA-Z0-9.-]+)(\/[^\s"')]+)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const host = m[1];
    if (ASSET_HOSTS.includes(host)) urls.add(m[0]);
  }
  return urls;
}

// Replace every remote asset URL with its local path (relative from the page being saved)
function rewriteUrls(content, pageOutPath) {
  const pageDir = path.dirname(pageOutPath);
  const depth = pageDir === '.' ? 0 : pageDir.split('/').filter(Boolean).length;
  const prefix = depth === 0 ? './' : '../'.repeat(depth);

  for (const [remote, local] of assetMap) {
    if (!local) continue;
    const replacement = prefix + local.replace(/\\/g, '/');
    content = content.split(remote).join(replacement);
  }
  return content;
}

// Convert internal Webflow links to local relative .html paths
function rewriteInternalLinks(content, pageOutPath) {
  const pageDir = path.dirname(pageOutPath);
  const depth = pageDir === '.' ? 0 : pageDir.split('/').filter(Boolean).length;
  const prefix = depth === 0 ? '' : '../'.repeat(depth);

  // Match href="/something" — but not external, not # anchors, not mailto/tel
  return content.replace(
    /href="(\/[^"#?]*)"/g,
    (full, p) => {
      // Skip empty / javascript / file extensions we shouldn't touch
      if (p === '/' && depth === 0) return `href="index.html"`;
      if (p === '/') return `href="${prefix}index.html"`;
      // Strip trailing slash, append .html
      const clean = p.replace(/\/$/, '');
      return `href="${prefix}${clean.slice(1)}.html"`;
    }
  );
}

async function fetchPage(srcPath) {
  const url = SRC + srcPath;
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`Page ${srcPath} returned ${r.status}`);
  return await r.text();
}

async function main() {
  console.log('=== Law\'s Custom Painting site mirror ===');
  console.log(`Source: ${SRC}\nDest:   ${REPO_ROOT}\n`);

  // Step 1: fetch all pages
  console.log('1. Fetching pages...');
  const pageHtml = new Map();
  for (const page of PAGES) {
    process.stdout.write(`  ${page.src} -> ${page.out} ... `);
    try {
      const html = await fetchPage(page.src);
      pageHtml.set(page.out, html);
      console.log(`${(html.length / 1024).toFixed(1)} KB`);
    } catch (e) {
      console.log(`FAIL: ${e.message}`);
    }
  }

  // Step 2: collect every unique asset URL from every page
  console.log('\n2. Collecting asset URLs...');
  const allAssets = new Set();
  for (const html of pageHtml.values()) {
    for (const u of findAssetUrls(html)) allAssets.add(u);
  }
  console.log(`  ${allAssets.size} unique assets referenced`);

  // Step 3: download every asset
  console.log('\n3. Downloading assets...');
  const concurrency = 8;
  const queue = [...allAssets];
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (queue.length) {
        const u = queue.shift();
        try { await downloadAsset(u); }
        catch (e) { console.warn(`  ! ${u}: ${e.message}`); }
      }
    })
  );

  // Step 4: also scan downloaded CSS for nested @import / url() references and pull those too
  console.log('\n4. Scanning CSS for nested asset references...');
  const cssDir = path.join(REPO_ROOT, 'css');
  try {
    const cssFiles = await fs.readdir(cssDir);
    const nested = new Set();
    for (const f of cssFiles) {
      const cssText = await fs.readFile(path.join(cssDir, f), 'utf8');
      for (const u of findAssetUrls(cssText)) nested.add(u);
    }
    console.log(`  ${nested.size} additional assets in CSS`);
    const q2 = [...nested];
    await Promise.all(
      Array.from({ length: concurrency }, async () => {
        while (q2.length) {
          const u = q2.shift();
          try { await downloadAsset(u); }
          catch (e) {}
        }
      })
    );
    // Now rewrite the CSS files themselves to use local paths
    for (const f of cssFiles) {
      const cssPath = path.join(cssDir, f);
      let cssText = await fs.readFile(cssPath, 'utf8');
      for (const [remote, local] of assetMap) {
        if (!local) continue;
        // From /css/foo.css, ../images/bar.png is the relative path
        const rel = '../' + local.replace(/\\/g, '/');
        cssText = cssText.split(remote).join(rel);
      }
      await fs.writeFile(cssPath, cssText);
    }
  } catch (e) {
    console.warn(`  CSS scan skipped: ${e.message}`);
  }

  // Step 5: rewrite each HTML page and save
  console.log('\n5. Rewriting HTML and saving pages...');
  for (const [outPath, html] of pageHtml) {
    let updated = rewriteUrls(html, outPath);
    updated = rewriteInternalLinks(updated, outPath);
    const dest = path.join(REPO_ROOT, outPath);
    await ensureDir(dest);
    await fs.writeFile(dest, updated);
    console.log(`  ✓ ${outPath}`);
  }

  console.log('\n=== Mirror complete ===');
  console.log(`Pages: ${pageHtml.size}`);
  console.log(`Assets: ${assetMap.size}`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
