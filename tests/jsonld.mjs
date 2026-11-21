// Structured data (SEO batch 2026-11-20): every page in sitemap.xml, plus / and /en/, has JSON-LD that parses and carries what
// Google needs:
//   - BreadcrumbList: every ListItem has a position (1, 2, ...), a non-empty name and an absolute https item URL (Search Console
//     reported "Unnamed item");
//   - VideoObject: name, description, thumbnailUrl, uploadDate as a full ISO 8601 date-time with a UTC offset, contentUrl or embedUrl;
//   - Organization / ProfessionalService: name, url, and areaServed = Country EG, SA, AE, US + Place "Middle East and North Africa".
// Run: node tests/jsonld.mjs   (no network, no browser). Exits non-zero on any failure.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://crierstudio.com';
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; console.log('FAIL', m); } };
const urls = [...new Set([SITE + '/', SITE + '/en/', ...[...fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])])];
const AREA = ['EG', 'SA', 'AE', 'US'];
const ISO_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const absUrl = (u) => typeof u === 'string' && /^https:\/\/[^\s/]+\.[^\s/]+\//.test(u);
const nonEmpty = (s) => typeof s === 'string' && s.trim() !== '';
const types = (node) => [].concat(node['@type'] || []);
let seenOrg = 0, seenVideo = 0, seenCrumb = 0;
for (const u of urls) {
  const rel = new URL(u).pathname.slice(1), f = path.join(ROOT, rel, 'index.html');
  ok(u.startsWith(SITE + '/'), `${u}: a crierstudio.com URL`);
  if (!fs.existsSync(f)) { ok(false, `${u}: no built file ${rel}index.html`); continue; }
  const h = fs.readFileSync(f, 'utf8');
  const blocks = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  ok(blocks.length > 0, `${u}: has JSON-LD`);
  const nodes = [];
  for (const b of blocks) {
    let j = null; try { j = JSON.parse(b); } catch (e) { ok(false, `${u}: JSON-LD does not parse: ${e.message}`); continue; }
    ok(j['@context'] === 'https://schema.org', `${u}: @context is https://schema.org`);
    nodes.push(...(Array.isArray(j['@graph']) ? j['@graph'] : [j]));
  }
  for (const node of nodes) {
    const t = types(node);
    if (t.includes('BreadcrumbList')) {
      seenCrumb++;
      const items = node.itemListElement;
      ok(Array.isArray(items) && items.length >= 2, `${u}: BreadcrumbList has its items`);
      (items || []).forEach((it, i) => {
        ok(types(it).includes('ListItem'), `${u}: breadcrumb ${i + 1} is a ListItem`);
        ok(it.position === i + 1, `${u}: breadcrumb ${i + 1} has position ${i + 1} (${it.position})`);
        ok(nonEmpty(it.name), `${u}: breadcrumb ${i + 1} has a name`);
        const item = typeof it.item === 'string' ? it.item : it.item?.['@id'];
        ok(absUrl(item), `${u}: breadcrumb ${i + 1} item is an absolute https URL (${JSON.stringify(it.item)})`);
      });
      if (items?.length) ok((typeof items.at(-1).item === 'string' ? items.at(-1).item : items.at(-1).item?.['@id']) === u, `${u}: the last breadcrumb is the page itself`);
    }
    if (t.includes('VideoObject')) {
      seenVideo++;
      for (const k of ['name', 'description', 'thumbnailUrl']) ok(k === 'thumbnailUrl' ? [].concat(node[k] || []).every(absUrl) && node[k] : nonEmpty(node[k]), `${u}: VideoObject ${k}`);
      ok(ISO_DT.test(node.uploadDate || '') && !Number.isNaN(Date.parse(node.uploadDate)), `${u}: VideoObject uploadDate is a full ISO 8601 date-time with an offset (${node.uploadDate})`);
      ok(absUrl(node.contentUrl) || absUrl(node.embedUrl), `${u}: VideoObject contentUrl or embedUrl`);
    }
    if (t.includes('Organization') || t.includes('ProfessionalService')) {
      seenOrg++;
      ok(nonEmpty(node.name), `${u}: ${t} name`);
      ok(absUrl(node.url), `${u}: ${t} url`);
      const area = [].concat(node.areaServed || []);
      const cc = area.filter((a) => types(a).includes('Country')).map((a) => a.identifier).sort();
      ok(JSON.stringify(cc) === JSON.stringify([...AREA].sort()), `${u}: ${t} areaServed countries are ${AREA.join(', ')} (${cc.join(', ')})`);
      ok(area.filter((a) => types(a).includes('Country')).every((a) => nonEmpty(a.name)), `${u}: ${t} areaServed countries are named`);
      ok(area.some((a) => types(a).includes('Place') && a.name === 'Middle East and North Africa'), `${u}: ${t} areaServed has the Place "Middle East and North Africa"`);
      ok(area.length === AREA.length + 1, `${u}: ${t} areaServed has nothing else (${area.length} entries)`);
    }
  }
}
ok(seenOrg >= 4, `Organization and ProfessionalService on / and /en/ (${seenOrg})`);
ok(seenVideo >= 2, `the How it works VideoObject on / and /en/ (${seenVideo})`);
ok(seenCrumb >= 10, `BreadcrumbList on pricing, social and the legal pages in both languages (${seenCrumb})`);
console.log(`${urls.length} pages, ${n} checks: ${fail ? fail + ' FAILED' : 'all passed'}`);
process.exit(fail ? 1 : 0);
