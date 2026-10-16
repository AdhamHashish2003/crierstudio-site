# crierstudio.com

## Homepage: MENA landing (2026-10-16)

The homepage is a short landing page for local businesses in Saudi Arabia, the UAE and Egypt (cafés, restaurants, abayas, perfume and oud, salons, clinics, real estate). One headline, one main button (The Complete Kit), then: the business types, the seasons (Ramadan, Eid, national days, White Friday), the three packages with "price + VAT = total", and a "Good to know" block (Stripe in SAR / AED / EGP, Arabic and English content, Instagram and Facebook, email). It uses the same page style as the inner pages (`studio-inner`); the old 3D studio hero is gone, so the homepage no longer loads `assets/studio.js`, three.js or the hero images (the files stay in `assets/`). The header has no button; each page has one main button.

- Homepage source: `templates/hero.html`, `templates/home.html` and the `home.*`, `ind.*`, and `season.*` keys (en, ar). `templates/studio-home.css` is no longer used.
- Shared navigation, inner-page styling and RTL adjustments: `templates/header.html`, `templates/studio-shared.css`, `templates/common.css` and `site.js`.
- Editable English studio presentation: `templates/studio-deck.html`; build output `/assets/studio-deck/index.html`. This introduces Crier to prospective clients and is distinct from the paid `/brand-deck/` product.
- Social preview source: `templates/social-preview.html`, built to `/assets/social-preview.html`. Render that page at 1200 × 630 after fonts/images load to refresh `og.png`.
- Project inquiries open the existing `team@crierstudio.com` email. Existing package pricing, intake, portal and checkout destinations are retained. Language switching preserves the selected package/platforms.

Run `node build/build.mjs && node build/check.mjs`, then serve this directory with `python3 -m http.server 8767 --bind 127.0.0.1` and open `http://127.0.0.1:8767/`.

Browser checks use the existing `playwright-core` test setup: `BASE=http://127.0.0.1:8767 node tests/form.mjs`, `node tests/consent.mjs` with the same BASE, and `OUTPUT=/path/to/evidence BASE=http://127.0.0.1:8767 node tests/studio.mjs`. The last check captures responsive screenshots and exports the studio deck with Chromium; it does not make live submissions. `CHROME` can override the browser executable. Export verification also requires checking the resulting PDF pages, not only the HTML source.

The public site deploys from `main` through GitHub Pages. Railway hosts the linked Client Portal and CRM; do not upload this static site over either service. Website deployment does not establish completion of the D3 deck engine.

Public site for Crier Studio. Static HTML served by GitHub Pages, in en (/) and ar (/ar/). Spanish and French were removed on 2026-10-16: every old `/es/…` and `/fr/…` URL is a small redirect stub to the matching English page (`REMOVED` in `build/build.mjs`). Indexable: `NOINDEX = false` in `build/build.mjs` (search opened in commit 98d03f7); set it to `true` and rebuild to hide the site from search again.

Pages (each in en and ar): `/`, `/pricing/`, `/kit/` (The Complete Kit, $29, + the request form), `/brand-deck/` (Brand Deck, $250, digital only), `/samples/`, `/faq/`, `/about/`, `/physical/`, `/terms/`, `/privacy/`, `/refund/`, plus `404.html` and the old-URL stubs (`/?lang=xx`, `/terms.html`, `/privacy.html`, `/refund.html`, and `/snapshot/` -> `/kit/`, `/crier-deck/` -> `/brand-deck/` in every language, keeping `?product=`; the `/es/` and `/fr/` stubs also go to the English page).

Packages: The Complete Kit (`kit`, one-time), Stay Visible (`visible`, monthly), Keep Growing (`growing`, monthly), Brand Deck (`deck`, one-time, digital only); prices and contents from `data/pricing.json` (Adham's U1 patch, 2026-10-05: stories, seasonal mockups, one platform included + a paid extra platform, fully adapted). The card copy is Adham's; names are translated per language through the `name.<id>` keys.

- Source: `i18n/<lang>.json` (all text) + `templates/` (HTML, CSS). Build: `node build/build.mjs` (Node, no dependencies). The built files are committed.
- Checks: `node build/check.mjs` (identical key sets in en and ar, canonicals, hreflang, sitemap, links, no internal names/draft text, the 4 current prices on /pricing/, no retired package names or prices). `tests/form.mjs`: form and old-URL test with a mocked endpoint (never posts to the live API).
- Analytics: Google Analytics 4 (`G-QLQ443CQ8E`, constant `GA_ID` in `build/build.mjs`) with Consent Mode v2 sits right after the CSP meta in every built HTML file. Only the inline part is in `<head>` (consent defaults, js/config queued in `dataLayer`); gtag.js itself is injected on the visitor's first interaction (pointerdown, touchstart, keydown, scroll or wheel), or 6 s after the window `load` event when there is none, or at once when the visitor uses the consent bar or Cookie settings. Visitors who leave within about 6 s of the page loading without scrolling, tapping or typing are therefore not counted (owner approved delaying Analytics, 2026-10-11; the 6 s/interaction trigger keeps gtag.js's ~300 ms of script out of the mobile PageSpeed test window). Consent defaults to denied; analytics cookies only after Accept in the consent bar (`templates/consent.html` + `consent.css`, saved in localStorage `crier_consent`; the footer "Cookie settings" link reopens it). Ads signals are always denied. The CSP allows the two inline scripts by sha256 hashes that the build recomputes; the build fails if any inline script lacks a hash. `tests/consent.mjs` tests the bar and consent calls in a browser (Google requests are blocked in both browser tests).
- Never edit generated files by hand (`index.html`, `*/index.html`, `404.html`, `sitemap.xml`, the `terms.html` style stubs). Edit the source and rebuild.
- The hero is one block: `templates/hero.html`. Keep real HTML text in it (the H1 is the LCP element).
- The noindex switch is one constant at the top of `build/build.mjs` (`NOINDEX`, currently `false`). Change it and rebuild.

## Brand Deck availability

Brand Deck is coming soon in both languages: homepage, product page, pricing cards, billing FAQ and request form. It has no active offer in structured data. Its disabled button does not use a configured payment link. The legacy `deck`, `crier_deck` and `deck_print` form URLs display the unavailable package and cannot submit it. The Kit and monthly plans retain their current checkout flows; existing client entitlements are unchanged. Physical Design is a separate custom-project inquiry route, not a bundled physical delivery promise.

The header and footer retain every original navigation destination, including Client Portal, and add Physical Design.

## Buy buttons and Stripe links
`payment-links.json` (repo root) has one entry per product: `kit`, `visible`, `growing`, `deck`. For available packages, empty = the Buy button opens the request form (`/kit/?product=<id>#request`) with the product preselected and says how payment works (Stripe checkout, in the buyer's currency with VAT added). Do not paste Stripe Payment Links: a Payment Link has one fixed currency and no VAT line, so it cannot follow the country rule below. Prices and counts are NOT in this repo's text: `data/pricing.json` is a copy of the studio's master price list (`portal/lib/pricing.json` in the private studio repo; republished by hand on 2026-10-15); texts use `{price:<id>}`, `{extra:<id>}`, `{plat:<id>}` and `{n:<id>.<item>}`, and `build/check.mjs` fails on a price written into i18n or templates. The intake API only accepts product `snapshot` and `crier_deck`; the kit and the monthly plans are sent as `snapshot` while Brand Deck submissions are currently disabled, with the package name added to `business` in square brackets (for example `[Keep Growing plan]`). Old product ids in links (`snapshot`, `starter`, `growth`, `pro`, `deck_print`, `crier_deck`) are mapped to the new packages by `site.js`.

## Speed: small fonts and per-page CSS

- Fonts: pages load `fonts/*.subset.woff2`, made by `python3 build/subset-fonts.py` (needs `pip install fonttools brotli`) with only the characters the site uses. The four Instrument Sans weights are one variable file (400 and 700 masters; 500/600 match the static files, the script checks this) declared in four `@font-face` rules, so the browser picks the same weights and downloads one file. **After changing any text, run `python3 build/subset-fonts.py` before `node build/build.mjs`**; `build/check.mjs` fails if a page shows a character the subsets lack. The original font files stay in `fonts/` (the studio deck uses them).
- CSS: each page inlines only the rules whose classes/ids appear in its HTML or as a word in `site.js`/`assets/studio.js`/`assets/deck.js` (`purgeCss` in `build/build.mjs`). A class added only from JavaScript with a computed name (e.g. `'is-' + state`) must also be written out in full somewhere in the JS, or its rule is dropped.

## Caching (fonts, hero images, site.js)

GitHub Pages sends every file with `Cache-Control: max-age=600`. The build therefore writes content-hashed copies of the fonts, the hero images and `site.js` to `assets/h/<name>.<hash>.<ext>` (rebuilt from scratch on every build) and every page links to those. A changed file gets a new name, so these files can be cached for a year. The originals stay in `fonts/`, `assets/` and `/site.js` for anything else that links to them. Never edit `assets/h/` by hand.

Cloudflare rule (owner, one time; Cloudflare dashboard > crierstudio.com > Caching > Cache Rules > Create rule):
- Rule name: `Hashed assets, 1 year`
- If incoming requests match: Custom filter expression, Field `URI Path`, Operator `starts with`, Value `/assets/h/` (expression: `(starts_with(http.request.uri.path, "/assets/h/"))`)
- Cache eligibility: Eligible for cache
- Edge TTL: Ignore cache-control header and use this TTL, 1 year
- Browser TTL: Override origin and use this TTL, 1 year
- Deploy


## Local currency and VAT (Adham's launch decision, 2026-10-15)

Buyers in Saudi Arabia, the UAE and Egypt are quoted and charged in SAR, AED or EGP with VAT ADDED (15%, 5%, 14%); every other country pays the US-dollar price with no VAT. `data/pricing.json`: `local.countries.<CC>` (currency, vat_pct, vat_registration), `packages[].prices.<CUR>` and `extra_platform_prices.<CUR>` are NET prices before VAT. VAT = net x pct / 100 on the whole order (base + extra platforms), in integer cents, half-up: `vat_minor = floor((net_minor * pct + 50) / 100)`. Pages show "price + VAT = total", e.g. "SAR 109 + VAT 15% SAR 16.35 = SAR 125.35".

`vat_registration` is `null` for every country (PLACEHOLDER: Adham supplies the numbers; nothing is printed while null).

The HTML is written for Saudi Arabia (`DEFAULT_CC` in `build/build.mjs`: SAR before VAT, with the VAT line filled in and Saudi Arabia selected), on English and Arabic pages alike. `site.js` then picks the visitor's country: their pick in the "Your country" selector (home, pricing and kit pages, and the order form; Saudi Arabia, UAE, Egypt, then "Another country (US dollars)" last; saved in localStorage `crier.cc`), else Cloudflare's `/cdn-cgi/trace`, else the time zone or the browser's language region, else Saudi Arabia. Saudi Arabia / UAE / Egypt show the local currency (net) with the VAT line; any other detected country (Kuwait, Qatar, Bahrain, ...), or picking "Another country", shows USD. The order form sends `country` (SA, AE, EG, or the detected ISO code, `ZZ` if unknown) to the checkout, and shows the server's quote (`GET <endpoint>/quote?package=&platforms=&country=`). Terms, privacy and refund show the US-dollar price list and explain the rule in words.

## WhatsApp

`data/contact.json` holds the WhatsApp business number (`whatsapp`, digits only, international format). It is empty: no WhatsApp link is shown anywhere until Adham supplies the number and the site is rebuilt. When set, the link appears in the footer, on the homepage and on the About page.
