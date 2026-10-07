# crierstudio.com

## Dimension Studio frontend

The homepage presents Crier as a branding and design studio across identity, digital, campaigns and physical experiences. The original logo, Archivo / Instrument Sans / Noto Sans Arabic fonts and color values are retained. All new concept applications are labelled as self-initiated studies.

- Homepage source: `templates/hero.html`, `templates/home.html`, `templates/studio-home.css` and the `studio.copy.*` keys in the existing four language dictionaries.
- Shared navigation, inner-page styling and RTL adjustments: `templates/header.html`, `templates/studio-shared.css`, `templates/common.css` and `site.js`.
- Interactive scene: `assets/studio.js`, using the existing self-hosted `assets/three.r128.min.js`. The scene supports pointer/keyboard rotation, view selection, pause/reset, reduced motion, visibility suspension, and a static image fallback. The initial HTML remains usable without JavaScript. Only the homepage loads the 3D assets.
- Editable English studio presentation: `templates/studio-deck.html`; build output `/assets/studio-deck/index.html`. This introduces Crier to prospective clients and is distinct from the paid `/brand-deck/` product.
- Social preview source: `templates/social-preview.html`, built to `/assets/social-preview.html`. Render that page at 1200 × 630 after fonts/images load to refresh `og.png`.
- Project inquiries open the existing `team@crierstudio.com` email. Existing package pricing, intake, portal and checkout destinations are retained. Language switching preserves the selected package/platforms.

Run `node build/build.mjs && node build/check.mjs`, then serve this directory with `python3 -m http.server 8767 --bind 127.0.0.1` and open `http://127.0.0.1:8767/`.

Browser checks use the existing `playwright-core` test setup: `BASE=http://127.0.0.1:8767 node tests/form.mjs`, `node tests/consent.mjs` with the same BASE, and `OUTPUT=/path/to/evidence BASE=http://127.0.0.1:8767 node tests/studio.mjs`. The last check captures responsive screenshots and exports the studio deck with Chromium; it does not make live submissions. `CHROME` can override the browser executable. Export verification also requires checking the resulting PDF pages, not only the HTML source.

The public site deploys from `main` through GitHub Pages. Railway hosts the linked Client Portal and CRM; do not upload this static site over either service. Website deployment does not establish completion of the D3 deck engine.

Public site for Crier Studio. Static HTML served by GitHub Pages, in en (/), es (/es/), fr (/fr/) and ar (/ar/). Indexable: `NOINDEX = false` in `build/build.mjs` (search opened in commit 98d03f7); set it to `true` and rebuild to hide the site from search again.

Pages (each in all 4 languages): `/`, `/pricing/`, `/kit/` (The Complete Kit, $29, + the request form), `/brand-deck/` (Brand Deck, $250, digital only), `/samples/`, `/faq/`, `/about/`, `/physical/`, `/terms/`, `/privacy/`, `/refund/`, plus `404.html` and the old-URL stubs (`/?lang=xx`, `/terms.html`, `/privacy.html`, `/refund.html`, and `/snapshot/` -> `/kit/`, `/crier-deck/` -> `/brand-deck/` in every language, keeping `?product=`).

Packages: The Complete Kit (`kit`, one-time), Stay Visible (`visible`, monthly), Keep Growing (`growing`, monthly), Brand Deck (`deck`, one-time, digital only); prices and contents from `data/pricing.json` (Adham's U1 patch, 2026-10-05: stories, reels, seasonal mockups, one platform included + a paid extra platform, fully adapted). The card copy is Adham's; names are translated per language through the `name.<id>` keys.

- Source: `i18n/<lang>.json` (all text) + `templates/` (HTML, CSS). Build: `node build/build.mjs` (Node, no dependencies). The built files are committed.
- Checks: `node build/check.mjs` (identical key sets in all 4 languages, canonicals, hreflang, sitemap, links, no UMA/draft text, the 4 current prices on /pricing/, no retired package names or prices). `tests/form.mjs`: form and old-URL test with a mocked endpoint (never posts to the live API).
- Analytics: Google Analytics 4 (`G-QLQ443CQ8E`, constant `GA_ID` in `build/build.mjs`) with Consent Mode v2 sits right after the CSP meta in every built HTML file. Consent defaults to denied; analytics cookies only after Accept in the consent bar (`templates/consent.html` + `consent.css`, saved in localStorage `crier_consent`; the footer "Cookie settings" link reopens it). Ads signals are always denied. The CSP allows the two inline scripts by sha256 hashes that the build recomputes; the build fails if any inline script lacks a hash. `tests/consent.mjs` tests the bar and consent calls in a browser (Google requests are blocked in both browser tests).
- Never edit generated files by hand (`index.html`, `*/index.html`, `404.html`, `sitemap.xml`, the `terms.html` style stubs). Edit the source and rebuild.
- The hero is one block: `templates/hero.html`. Keep real HTML text in it (the H1 is the LCP element).
- The noindex switch is one constant at the top of `build/build.mjs` (`NOINDEX`, currently `false`). Change it and rebuild.

## Brand Deck availability

Brand Deck is coming soon in all four languages: homepage, product page, pricing cards, billing FAQ and request form. It has no active offer in structured data. Its disabled button does not use a configured payment link. The legacy `deck`, `crier_deck` and `deck_print` form URLs display the unavailable package and cannot submit it. The Kit and monthly plans retain their current checkout flows; existing client entitlements are unchanged. Physical Design is a separate custom-project inquiry route, not a bundled physical delivery promise.

The header and footer retain every original navigation destination, including Client Portal, and add Physical Design.

## Buy buttons and Stripe links
`payment-links.json` (repo root) has one entry per product: `kit`, `visible`, `growing`, `deck`. For available packages, empty = the Buy button opens the request form (`/kit/?product=<id>#request`) with the product preselected and says "We'll email you a secure payment link". Paste an `https://` Stripe Payment Link into an entry, run `node build/build.mjs && node build/check.mjs`, commit: that button then goes straight to Stripe. Prices and counts are NOT in this repo's text: `data/pricing.json` is written by the UMA repo (`node portal/scripts/publish-pricing.cjs --site <this dir>`) from `portal/lib/pricing.json`, the one price list; texts use `{price:<id>}`, `{extra:<id>}`, `{plat:<id>}` and `{n:<id>.<item>}`, and `build/check.mjs` fails on a price written into i18n or templates. The intake API only accepts product `snapshot` and `crier_deck`; the kit and the monthly plans are sent as `snapshot` while Brand Deck submissions are currently disabled, with the package name added to `business` in square brackets (for example `[Keep Growing plan]`). Old product ids in links (`snapshot`, `starter`, `growth`, `pro`, `deck_print`, `crier_deck`) are mapped to the new packages by `site.js`.
