# crierstudio.com

Public site for Crier Studio. Static HTML served by GitHub Pages, in en (/), es (/es/), fr (/fr/) and ar (/ar/). Still noindex (see the SEO plan).

- Source: `i18n/<lang>.json` (all text) + `templates/` (HTML, CSS). Build: `node build/build.mjs` (Node, no dependencies). The built files are committed.
- Never edit generated files by hand (`index.html`, `*/index.html`, `404.html`, `sitemap.xml`, the `terms.html` style stubs). Edit the source and rebuild.
- The hero is one block: `templates/hero.html`. Keep real HTML text in it (the H1 is the LCP element).
- `tests/form.mjs`: form test with a mocked endpoint (never posts to the live API).
- To remove noindex when the launch trigger is met: set `NOINDEX = false` in `build/build.mjs` and rebuild.
