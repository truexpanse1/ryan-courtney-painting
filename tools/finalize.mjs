#!/usr/bin/env node
// Finalize the mirrored + rebranded site:
//   - Inject GTM in <head> + <body>
//   - Inject JSON-LD schema on every page
//   - Apply per-page <title> and meta description from brand.metaByPage
//   - Add canonical tag per page
//   - Wire the contact form to Netlify Forms (data-netlify="true" + hidden form-name)
//
// Usage: node tools/finalize.mjs <brand.json>

import fs from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);

const brand = JSON.parse(
  await fs.readFile(path.resolve(process.argv[2] || 'brands/laws-custom-painting.json'), 'utf8')
);

const SITE_URL = `https://${brand.domain}`;

// Google Tag Manager — head + body snippets
const GTM_HEAD = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${brand.gtmId}');</script>
<!-- End Google Tag Manager -->`;

const GTM_BODY = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${brand.gtmId}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;

// JSON-LD schema (HousePainter / LocalBusiness)
const JSONLD = `<script type="application/ld+json">
${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'HousePainter',
  name: brand.name,
  url: SITE_URL,
  telephone: brand.phone,
  email: brand.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: brand.addressLine,
    addressLocality: brand.city,
    addressRegion: brand.state,
    postalCode: brand.zip,
    addressCountry: 'US',
  },
  founder: brand.owner,
  foundingDate: brand.since,
  sameAs: [brand.facebook, brand.youtube].filter(Boolean),
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Painting Services',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Interior Painting' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Exterior Painting' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Cabinet Painting & Refinishing' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Door & Shelf Painting' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Commercial Painting' } },
    ],
  },
  areaServed: {
    '@type': 'City',
    name: brand.city,
    containedInPlace: { '@type': 'State', name: brand.state },
  },
}, null, 2)}
</script>`;

function canonicalFor(relPath) {
  // Strip .html and trailing /index, then build canonical URL
  let url = relPath.replace(/\\/g, '/').replace(/^\.?\/?/, '/');
  if (url === '/index.html') return SITE_URL + '/';
  url = url.replace(/\.html$/, '');
  return SITE_URL + url;
}

async function processHtml(file, relPath) {
  let html = await fs.readFile(file, 'utf8');

  // 1. Replace title (per-page if specified)
  const meta = brand.metaByPage?.[relPath];
  if (meta?.title) {
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`);
  }

  // 2. Replace or insert meta description
  if (meta?.description) {
    if (/<meta\s+content="[^"]*"\s+name="description"\s*\/>/i.test(html)) {
      html = html.replace(
        /<meta\s+content="[^"]*"\s+name="description"\s*\/>/i,
        `<meta name="description" content="${meta.description}"/>`
      );
    } else if (/<meta\s+name="description"\s+content="[^"]*"\s*\/>/i.test(html)) {
      html = html.replace(
        /<meta\s+name="description"\s+content="[^"]*"\s*\/>/i,
        `<meta name="description" content="${meta.description}"/>`
      );
    } else {
      // Insert after <title>
      html = html.replace(
        /<\/title>/,
        `</title><meta name="description" content="${meta.description}"/>`
      );
    }
  }

  // 3. Update OG / Twitter title + description if present
  if (meta?.title) {
    html = html.replace(
      /<meta\s+content="[^"]*"\s+property="og:title"\s*\/>/i,
      `<meta property="og:title" content="${meta.title}"/>`
    );
    html = html.replace(
      /<meta\s+content="[^"]*"\s+property="twitter:title"\s*\/>/i,
      `<meta property="twitter:title" content="${meta.title}"/>`
    );
  }
  if (meta?.description) {
    html = html.replace(
      /<meta\s+content="[^"]*"\s+property="og:description"\s*\/>/i,
      `<meta property="og:description" content="${meta.description}"/>`
    );
    html = html.replace(
      /<meta\s+content="[^"]*"\s+property="twitter:description"\s*\/>/i,
      `<meta property="twitter:description" content="${meta.description}"/>`
    );
  }

  // 4. Insert canonical tag if missing
  const canonical = canonicalFor(relPath);
  if (!/<link\s+rel="canonical"/i.test(html)) {
    html = html.replace(
      /<\/title>/,
      `</title>\n<link rel="canonical" href="${canonical}"/>`
    );
  }

  // 5. Inject GTM head right before </head> (skip if already present)
  if (!html.includes(brand.gtmId)) {
    html = html.replace(/<\/head>/i, `${GTM_HEAD}\n</head>`);
    // GTM body iframe right after <body...>
    html = html.replace(/(<body[^>]*>)/i, `$1\n${GTM_BODY}`);
  }

  // 6. Inject JSON-LD on home page only
  if (relPath === 'index.html' && !html.includes('"@type":"HousePainter"') && !html.includes('"@type": "HousePainter"')) {
    html = html.replace(/<\/head>/i, `${JSONLD}\n</head>`);
  }

  // 7. Wire EVERY Webflow email form for Netlify Forms.
  // Webflow generates email-form, email-form-2, email-form-3, email-form-4 per page.
  // We map them ALL to the same Netlify form name "contact" so submissions consolidate.
  html = html.replace(
    /<form\s+id="(email-form(?:-\d+)?)"\s+name="email-form(?:-\d+)?"\s+data-name="Email Form(?:\s+\d+)?"\s+method="get"([^>]*)>/gi,
    (full, formId, rest) => {
      if (full.includes('data-netlify="true"')) return full;
      return `<form id="${formId}" name="contact" data-name="Email Form" method="POST" action="/thank-you.html" data-netlify="true" data-netlify-honeypot="bot-field"${rest}>
<input type="hidden" name="form-name" value="contact"/>
<p style="display:none"><label>Don&#x27;t fill this out: <input name="bot-field"/></label></p>`;
    }
  );

  return html;
}

async function walk(dir, files = []) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'tools' || e.name === 'brands') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, files);
    else if (e.name.endsWith('.html')) files.push(full);
  }
  return files;
}

async function main() {
  console.log(`=== Finalize → ${brand.name} ===`);
  const files = await walk(REPO_ROOT);
  for (const file of files) {
    const rel = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
    const updated = await processHtml(file, rel);
    await fs.writeFile(file, updated);
    console.log(`  ✓ ${rel}`);
  }
  console.log('Done.');
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
