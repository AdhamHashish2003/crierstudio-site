# crierstudio.com

Public site for Crier Studio. Static HTML served by GitHub Pages, in en (/), es (/es/), fr (/fr/) and ar (/ar/). Indexable: `NOINDEX = false` in `build/build.mjs` (search opened in commit 98d03f7); set it to `true` and rebuild to hide the site from search again.

Pages (each in all 4 languages): `/`, `/pricing/`, `/kit/` (The Complete Kit, $29, + the request form), `/brand-deck/` (Brand Deck, $250, digital only), `/samples/`, `/faq/`, `/about/`, `/terms/`, `/privacy/`, `/refund/`, plus `404.html` and the old-URL stubs (`/?lang=xx`, `/terms.html`, `/privacy.html`, `/refund.html`, and `/snapshot/` -> `/kit/`, `/crier-deck/` -> `/brand-deck/` in every language, keeping `?product=`).

Packages (2026-10-04): The Complete Kit $29 one-time (`kit`), Stay Visible $45/month (`visible`), Keep Growing $60/month (`growing`), Brand Deck $250 one-time, digital only (`deck`). The card copy is Adham's; names are translated per language through the `name.<id>` keys.

- Source: `i18n/<lang>.json` (all text) + `templates/` (HTML, CSS). Build: `node build/build.mjs` (Node, no dependencies). The built files are committed.
- Checks: `node build/check.mjs` (identical key sets in all 4 languages, canonicals, hreflang, sitemap, links, no UMA/draft text, the 4 current prices on /pricing/, no retired package names or prices). `tests/form.mjs`: form and old-URL test with a mocked endpoint (never posts to the live API).
- Never edit generated files by hand (`index.html`, `*/index.html`, `404.html`, `sitemap.xml`, the `terms.html` style stubs). Edit the source and rebuild.
- The hero is one block: `templates/hero.html`. Keep real HTML text in it (the H1 is the LCP element).
- The noindex switch is one constant at the top of `build/build.mjs` (`NOINDEX`, currently `false`). Change it and rebuild.

## Buy buttons and Stripe links
`payment-links.json` (repo root) has one entry per product: `kit`, `visible`, `growing`, `deck`. Empty = the Buy button opens the request form (`/kit/?product=<id>#request`) with the product preselected and says "We'll email you a secure payment link". Paste an `https://` Stripe Payment Link into an entry, run `node build/build.mjs && node build/check.mjs`, commit: that button then goes straight to Stripe. Prices are constants in `build/build.mjs` (`PRICES`). The intake API only accepts product `snapshot` and `crier_deck`; the kit and the monthly plans are sent as `snapshot` and the Brand Deck as `crier_deck`, with the package name added to `business` in square brackets (for example `[Keep Growing plan]`). Old product ids in links (`snapshot`, `starter`, `growth`, `pro`, `deck_print`, `crier_deck`) are mapped to the new packages by `site.js`.
