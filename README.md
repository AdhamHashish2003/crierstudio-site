# crierstudio.com

Public site for Crier Studio. Static HTML served by GitHub Pages, in en (/), es (/es/), fr (/fr/) and ar (/ar/). Still noindex (see the SEO plan).

Pages (each in all 4 languages): `/`, `/crier-deck/`, `/snapshot/` (free Snapshot + the request form), `/samples/`, `/faq/`, `/about/`, `/terms/`, `/privacy/`, `/refund/`, plus `404.html` and the old-URL stubs (`/?lang=xx`, `/terms.html`, `/privacy.html`, `/refund.html`).

- Source: `i18n/<lang>.json` (all text) + `templates/` (HTML, CSS). Build: `node build/build.mjs` (Node, no dependencies). The built files are committed.
- Checks: `node build/check.mjs` (identical key sets in all 4 languages, canonicals, hreflang, sitemap, links, no UMA/price/draft text). `tests/form.mjs`: form and old-URL test with a mocked endpoint (never posts to the live API).
- Never edit generated files by hand (`index.html`, `*/index.html`, `404.html`, `sitemap.xml`, the `terms.html` style stubs). Edit the source and rebuild.
- The hero is one block: `templates/hero.html`. Keep real HTML text in it (the H1 is the LCP element).
- To remove noindex when the launch trigger is met: set `NOINDEX = false` in `build/build.mjs` (top of the file, one constant) and rebuild.
