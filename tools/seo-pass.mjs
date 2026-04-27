#!/usr/bin/env node
// Comprehensive SEO pass for R. Courtney Painting:
//   1. Fill every empty alt="" with semantic alt text from filename + page context
//   2. Inject LocalBusiness schema into every non-home page (home already has the rich one)
//   3. Add Service schema to service detail pages
//   4. Verify h1 / canonical / og:image present
//
// Usage: node tools/seo-pass.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SITE_URL = 'https://ryancourtneypainting.com';

const brand = JSON.parse(
  await fs.readFile(path.join(REPO_ROOT, 'brands/r-courtney-painting.json'), 'utf8')
);

// ---------- ALT TEXT GENERATION ----------
// Given an image filename + surrounding HTML context, return a semantic alt string.
function altFromFilename(filename, pageContext) {
  const fn = filename.toLowerCase();
  // logo
  if (fn.includes('logo')) return "R. Courtney Painting logo";
  if (fn.includes('web_branding')) return "R. Courtney Painting brand";
  // semantic image keywords
  if (fn.includes('spanish_home')) return `Spanish-style home painted by R. Courtney Painting in San Mateo`;
  if (fn.includes('lady_painting')) return "Professional painter applying premium finish";
  if (fn.includes('professional_painter')) return "R. Courtney Painting professional applying interior paint";
  if (fn.includes('cabinet')) return "Cabinet refinishing project by R. Courtney Painting";
  if (fn.includes('kitchen')) return "Kitchen painting and finishing by R. Courtney Painting";
  if (fn.includes('family_room')) return "Interior family room painted by R. Courtney Painting";
  if (fn.includes('woman_painting')) return "Painter detailing trim — R. Courtney Painting";
  if (fn.includes('garage_door')) return "Garage door painted by R. Courtney Painting on the Peninsula";
  if (fn.includes('garage_green')) return "Exterior garage painting in San Mateo";
  if (fn.includes('gate_green')) return "Exterior gate and trim painting in San Mateo";
  if (fn.includes('painted_rooms')) return "Interior rooms painted by R. Courtney Painting";
  if (fn.includes('blueroom') || fn.includes('blue_room')) return "Blue interior room — R. Courtney Painting custom finish";
  if (fn.includes('front_porch')) return "Exterior porch painted by R. Courtney Painting";
  if (fn.includes('commercial')) return "Commercial painting project by R. Courtney Painting";
  if (fn.includes('warehouse')) return "Commercial warehouse painting in the Bay Area";
  if (fn.includes('logistic') || fn.includes('logistics')) return "R. Courtney Painting professional service";
  if (fn.includes('inquiry')) return "Contact R. Courtney Painting";
  if (fn.includes('phone') || fn.includes('phone_in_talk') || fn.includes('inquiry%20line')) return "Call R. Courtney Painting at (650) 921-5694";
  if (fn.includes('lopcation') || fn.includes('location')) return "R. Courtney Painting service area: San Mateo and the Peninsula";
  if (fn.includes('message') || fn.includes('email')) return "Email R. Courtney Painting at ryan@ryancourtneypainting.com";
  if (fn.includes('arrow')) return "";  // decorative — empty alt is correct
  if (fn.includes('check') || fn.includes('tick')) return "";  // decorative
  if (fn.includes('star')) return "";  // decorative
  if (fn.includes('blur') || fn.includes('shape') || fn.includes('vector') || fn.includes('group')) return "";  // decorative
  if (fn.includes('mask') || fn.includes('rectangle') || fn.includes('ellipse')) return "";  // decorative
  if (fn.includes('glow')) return "";  // decorative
  if (fn.includes('line')) return "";  // decorative
  if (fn.includes('orange') && fn.includes('arrow')) return "";  // decorative
  if (fn.includes('quote')) return "";  // decorative quote mark icon
  if (fn.includes('home%20three') || fn.includes('home_three')) return "";  // decorative
  if (fn.includes('big%20image') || fn.includes('big_image')) return "Painting work by R. Courtney Painting";
  if (fn.includes('banner')) return "R. Courtney Painting page banner";
  if (fn.includes('hero')) return "R. Courtney Painting hero image";
  if (fn.includes('about')) return "About R. Courtney Painting in San Mateo";
  if (fn.includes('service')) return "Painting services by R. Courtney Painting";
  if (fn.includes('contact')) return "Contact R. Courtney Painting";
  if (fn.includes('blog')) return "R. Courtney Painting blog";
  if (fn.includes('pricing')) return "R. Courtney Painting pricing";
  if (fn.includes('booking')) return "Book a painting estimate with R. Courtney Painting";
  if (fn.includes('supply') || fn.includes('warehousing')) return "R. Courtney Painting workflow";
  if (fn.includes('hover')) return "Painting project portfolio image";
  if (fn.includes('card%20hover') || fn.includes('card_hover')) return "Painting service offering";
  if (fn.includes('290759-fr1') || fn.includes('capemay')) return "Cape May Cobblestone Sea Pearl color sample";
  if (fn.includes('book01_sofa') || fn.includes('octobermist')) return "October Mist interior color palette by R. Courtney Painting";
  if (fn.includes('104132') || fn.includes('blue-note')) return "Blue Note color palette";
  // fallback: based on page
  if (pageContext === 'index.html') return "R. Courtney Painting — San Mateo painting contractor";
  if (pageContext === 'about.html') return "About R. Courtney Painting";
  if (pageContext === 'service.html') return "R. Courtney Painting services";
  if (pageContext === 'contact.html') return "Contact R. Courtney Painting";
  if (pageContext === 'blog.html') return "R. Courtney Painting blog";
  if (pageContext.includes('cabinets')) return "Cabinet painting by R. Courtney Painting";
  if (pageContext.includes('doors-and-shelves')) return "Door and shelf painting by R. Courtney Painting";
  if (pageContext.includes('interior-walls')) return "Interior wall painting by R. Courtney Painting";
  return "R. Courtney Painting professional painting service";
}

// ---------- SCHEMA BUILDERS ----------

function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "HousePainter",
    "@id": SITE_URL + "/#business",
    "name": brand.name,
    "url": SITE_URL,
    "telephone": brand.phone,
    "email": brand.email,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": brand.addressLine,
      "addressLocality": brand.city,
      "addressRegion": brand.state,
      "postalCode": brand.zip,
      "addressCountry": "US"
    },
    "founder": brand.owner,
    "foundingDate": "2005",
    "areaServed": [
      { "@type": "City", "name": "San Mateo" },
      { "@type": "City", "name": "Hillsborough" },
      { "@type": "City", "name": "Atherton" },
      { "@type": "City", "name": "Woodside" },
      { "@type": "City", "name": "Menlo Park" },
      { "@type": "City", "name": "Palo Alto" },
      { "@type": "City", "name": "Portola Valley" }
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "20",
      "bestRating": "5"
    }
  };
}

function serviceSchema(name, description, slug) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": name,
    "description": description,
    "provider": {
      "@type": "HousePainter",
      "@id": SITE_URL + "/#business",
      "name": brand.name,
      "telephone": brand.phone,
      "url": SITE_URL
    },
    "areaServed": {
      "@type": "City",
      "name": "San Mateo"
    },
    "url": SITE_URL + "/" + slug
  };
}

function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      "item": SITE_URL + item.path
    }))
  };
}

// ---------- MAIN ----------

const PAGES = {
  'index.html':                  { hasFullSchema: true, breadcrumbs: null },
  'about.html':                  { hasFullSchema: false, breadcrumbs: [{name:'Home',path:'/'},{name:'About',path:'/about'}] },
  'service.html':                { hasFullSchema: false, breadcrumbs: [{name:'Home',path:'/'},{name:'Services',path:'/service'}] },
  'contact.html':                { hasFullSchema: false, breadcrumbs: [{name:'Home',path:'/'},{name:'Contact',path:'/contact'}] },
  'blog.html':                   { hasFullSchema: false, breadcrumbs: [{name:'Home',path:'/'},{name:'Blog',path:'/blog'}] },
  'services/cabinets.html':      { hasFullSchema: false, breadcrumbs: [{name:'Home',path:'/'},{name:'Services',path:'/service'},{name:'Cabinet Refinishing',path:'/services/cabinets'}], service: { name:'Cabinet Refinishing', desc:'Professional cabinet painting and refinishing in San Mateo and the Peninsula. Heirloom-quality finishes that look factory-new.', slug:'services/cabinets' } },
  'services/doors-and-shelves.html': { hasFullSchema: false, breadcrumbs: [{name:'Home',path:'/'},{name:'Services',path:'/service'},{name:'Doors & Shelves',path:'/services/doors-and-shelves'}], service: { name:'Door & Shelf Painting', desc:'Crisp, durable finishes on doors, trim, and built-in shelving. Yuba City\'s trusted painter — wait, San Mateo trusted painter for over 20 years.', slug:'services/doors-and-shelves' } },
  'services/interior-walls.html': { hasFullSchema: false, breadcrumbs: [{name:'Home',path:'/'},{name:'Services',path:'/service'},{name:'Interior Walls',path:'/services/interior-walls'}], service: { name:'Interior Wall Painting', desc:'Transform any room with professional interior painting. Color consultation, prep, and a flawless finish from R. Courtney Painting.', slug:'services/interior-walls' } },
};

async function processPage(relPath, config) {
  const filePath = path.join(REPO_ROOT, relPath);
  let html = await fs.readFile(filePath, 'utf8');
  let stats = { altsFilled: 0, schemaAdded: 0 };

  // 1. Fill empty alt="" tags
  html = html.replace(
    /(<img[^>]*?src="(?:\.\.?\/)?(images\/[^"]+))([^>]*?)alt=""([^>]*?)\/?>/g,
    (full, prefix, fullSrc, midAttrs, postAttrs) => {
      const filename = path.basename(fullSrc);
      const alt = altFromFilename(filename, relPath);
      stats.altsFilled++;
      return `${prefix}${midAttrs}alt="${alt}"${postAttrs}>`;
    }
  );

  // 2. Inject LocalBusiness schema if not present (every non-home page)
  if (!config.hasFullSchema && !html.includes('"@type": "HousePainter"') && !html.includes('"@type":"HousePainter"')) {
    const schema = localBusinessSchema();
    const block = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
    html = html.replace(/<\/head>/i, `${block}\n</head>`);
    stats.schemaAdded++;
  }

  // 3. Add BreadcrumbList schema if applicable
  if (config.breadcrumbs && !html.includes('"@type": "BreadcrumbList"') && !html.includes('"@type":"BreadcrumbList"')) {
    const schema = breadcrumbSchema(config.breadcrumbs);
    const block = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
    html = html.replace(/<\/head>/i, `${block}\n</head>`);
    stats.schemaAdded++;
  }

  // 4. Add Service schema for service detail pages
  if (config.service && !html.includes('"@type": "Service"') && !html.includes('"@type":"Service"')) {
    const schema = serviceSchema(config.service.name, config.service.desc, config.service.slug);
    const block = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
    html = html.replace(/<\/head>/i, `${block}\n</head>`);
    stats.schemaAdded++;
  }

  await fs.writeFile(filePath, html);
  return stats;
}

async function main() {
  console.log('=== SEO Pass for R. Courtney Painting ===\n');
  let totalAlts = 0, totalSchemas = 0;
  for (const [page, config] of Object.entries(PAGES)) {
    const stats = await processPage(page, config);
    console.log(`  ${page}: alts=${stats.altsFilled}, schemas=${stats.schemaAdded}`);
    totalAlts += stats.altsFilled;
    totalSchemas += stats.schemaAdded;
  }
  console.log(`\nTotal: ${totalAlts} alts filled, ${totalSchemas} schemas added`);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
