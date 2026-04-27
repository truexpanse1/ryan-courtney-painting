#!/usr/bin/env node
// Rebrand the mirrored site by find/replace.
// Designed to be run once per client — read a brand JSON, walk every HTML/CSS file
// in the repo, apply the replacements.
//
// Usage: node tools/rebrand.mjs brands/laws-custom-painting.json

import fs from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

async function walk(dir, files = []) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'tools' || e.name === 'brands') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, files);
    else files.push(full);
  }
  return files;
}

async function main() {
  const brandPath = process.argv[2];
  if (!brandPath) {
    console.error('Usage: node tools/rebrand.mjs <brand.json>');
    process.exit(1);
  }
  const brand = await readJson(path.resolve(brandPath));
  console.log(`=== Rebrand → ${brand.name} ===`);

  const allFiles = await walk(REPO_ROOT);
  const targets = allFiles.filter((f) =>
    /\.(html|css|js|xml|txt|json)$/i.test(f)
  );
  console.log(`Files to scan: ${targets.length}`);

  let totalSubs = 0;
  let filesChanged = 0;

  for (const file of targets) {
    let text = await fs.readFile(file, 'utf8');
    const before = text;
    let subs = 0;

    for (const [needle, replacement] of brand.replacements) {
      // Plain-string replacement (case-sensitive)
      const parts = text.split(needle);
      if (parts.length > 1) {
        subs += parts.length - 1;
        text = parts.join(replacement);
      }
    }

    if (text !== before) {
      await fs.writeFile(file, text);
      filesChanged++;
      totalSubs += subs;
      console.log(`  ✓ ${path.relative(REPO_ROOT, file)} (${subs} subs)`);
    }
  }

  console.log(`\nTotal: ${totalSubs} substitutions across ${filesChanged} files`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
