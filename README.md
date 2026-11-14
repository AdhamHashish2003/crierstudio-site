# crierstudio.com

## Two lines: Social and In-store (2026-10-18)

One studio, two product lines. **Social** (`/social/`, was `/kit/`): the monthly packages Bronze, Silver and Gold (see "Packages and prices" below); after sign-up the studio sends a payment link. **In-store** (`/in-store/`): The Store Kit (waitlist only: no price, no date, no buy button) and Custom pieces (open now, quoted in the client portal after a free sign-up; the old `/physical/` content). Cream blocks mean physical, dark means digital: the In-store page body and the home-page In-store teaser are cream (tokens `--cream-*` / `--sample-*` in `templates/studio-shared.css`). Header nav: Social · In-store · Samples · Pricing · FAQ · Client portal; About and Brand Deck are in the footer.

- In-store source: `templates/in-store.html`, the illustrations `templates/instore-panels.html` (inline SVG from `design/reference/in-store-hero-B.html`, shared with the home teaser; `{{=sid}}` keeps SVG ids unique per page) and the `is.*` keys. Store Kit quantities are `[bracketed]` placeholders until Adham confirms them.
- The Store Kit waitlist form posts to the same Launchpad intake as the order form (`site.js`, "In-store" block); field mapping and limits in `REVIEW-instore.md`.
- Custom pieces has no form on the site (2026-10-18): "Request a quote" links to the portal sign-up `https://portal.crierstudio.com/#/signup?intent=quote&lang=<en|ar>` and "Already a client? Log in" to `#/login?intent=quote&lang=<en|ar>` (`portalAuth` in `build/build.mjs`). The quote form, its storage and the owner's list live in the portal (uma-main `portal/lib/quotes.cjs`). The portal must have `ALLOW_PUBLIC_SIGNUP=1`; without it the sign-up link shows the sign-in page with the studio email.
- Moved URLs (`MOVED` in `build/build.mjs`): `/kit/` and `/snapshot/` -> `/social/`, `/physical/` -> `/in-store/#custom`, `/crier-deck/` -> `/brand-deck/`, in every language, as noindex stubs that keep the full query string and the visitor's #hash. Real 301s are Cloudflare Redirect Rules (steps in `REVIEW-instore.md`). `?product=kit`, `?product=social-kit` and `?product=snapshot` all select The Social Kit (package id `kit`).

## Sculptures (2026-10-18)

**Parked (2026-11-14).** Pages outside the current offer are no longer published: `/sculptures/` (built into `_parked/sculptures/` and `_parked/ar/sculptures/`), the hand-made `/fiberglass/` and `/branddeck/` + `/ar/branddeck/` (moved to `_parked/`; `build/branddeck-pages.mjs` writes there), the old studio deck and share-image page (`_parked/studio-deck/`, `_parked/social-preview.html`). Their old URLs are redirect stubs (`PARKED_TO` in `build/build.mjs`: sculptures and fiberglass to the home page, branddeck to /pricing/; `/assets/studio-deck/` and `/assets/social-preview.html` to the home page). `_parked/` and their image folders under `assets/` are excluded in `_config.yml`. The share image `og.png` is rendered from `build/og-image.html` by `node build/og-image.mjs`.

`/sculptures/` (en, ar; `/es/` and `/fr/` get the usual redirect stubs): 24 fiberglass pieces in two collections (Origami, Animal forms) with filters and a lightbox (front, side, back, in a space), then "Send us your website" custom pieces. Header nav: Social · In-store · Sculptures · Pricing · Client portal; the footer lists Sculptures after In-store. Cream page body like In-store.

**Hidden for now (2026-10-19, owner request).** `SHOW_SCULPTURES = false` in `build/build.mjs`: the page is still built at `/sculptures/` and `/ar/sculptures/`, but carries `<meta name="robots" content="noindex">`, is left out of the header nav, the footer and `sitemap.xml`, and no other page links to it. Header nav meanwhile: Social · In-store (Coming soon) · Pricing · Client portal. To bring it back, set `SHOW_SCULPTURES = true` and rebuild (`node build/build.mjs && node build/check.mjs`; the checks follow the flag).

- Source: `templates/sculptures.html`, `templates/sculptures.css` (inlined on this page only, every class `sc-`), `assets/sculptures.js` (hashed like `dash.js`), the `sc.*` keys and `data/sculptures.json` (names, sizes, finishes and descriptions in en and ar). Images: `assets/sculptures/<id>-<front|side|back|scene|thumb>.webp`, not hashed (the lightbox builds their URLs); the build reads each file's real width/height and fails if a view is missing.
- The images are concept renders and the page says so once ("Images are concept renders."). No prices, lead times or quantities. A size is shown only when the catalog gives one (five Animal forms pieces have none). The custom-piece example is `assets/sculptures/concept-example.webp` (a copy of the Crane Silhouette Panel scene), labelled "Example concept".
- Every quote button uses the same portal sign-up as In-store's "Request a quote" (`portalAuth` in `build/build.mjs`).

## Homepage: Landing A "Billboard" (2026-11-06)

Adham picked version A of the three designs in `design/landing/` (the prototypes stay there; `design/` is not published). The home page is now: the hero (headline with the second sentence on a lime band, sign-up button, links to #how and #pricing) beside the Instagram-ready phone, then The Social Kit in numbers (`#kit`), the client-portal walkthrough (`#walkthrough`), the OK rule on a full-bleed lime band (`#trust`), the package table (`#pricing`) and a closing call (`#start`). The home FAQ is gone; the FAQ page stays. The cream In-store teaser (`#in-store`) was removed from the home page on 2026-11-06 (owner request); In-store keeps its own page and footer link.

- **Prices on the home page again** (Adham, 2026-11-06, overriding the 2026-10-19 audit rule "prices and package names on /pricing/ only"): the table shows the three Social packages with their list and sale prices, written by `money()` from `data/pricing.json` like the pricing page, with the country picker and `#cur-data`. `build/check.mjs` allows prices and package names on `/` and checks each table price against `data/pricing.json`. The phrase "launch price" is still banned everywhere.
- **The hero phone and the walkthrough show a made-up example business** ("Example Café", review fix 2026-11-14): no real brand, handle, logo or post. Its six posts are drawn in HTML/CSS from `data/example-posts.json`, in the page language, labelled as an example (`hero.exnote`). There is no delivery time and no clock in the walkthrough.
- **The client-portal walkthrough stays** (Adham, 2026-11-07): it sits between the kit numbers and the OK band, in place of the design's five static steps; its own "Nothing goes out until you say OK." line is left out because the OK band says it next.
- Source: `templates/hero.html`, `templates/home.html`, the `homeVars()` block in `build/build.mjs` (table rows in `TABLE_ROWS`, counts as `{n:<id>.<item>}`), the `la.*` keys and the "Landing A" block at the end of `templates/home.css` (classes `la-*`). The English home page loads the Arabic font faces too (the phone's bio and posts are Arabic).

## Homepage: MENA landing (2026-10-16)

_Superseded by Landing A above; kept for history._

The homepage is a short landing page for local businesses in Saudi Arabia, the UAE and Egypt (cafés, restaurants, abayas, perfume and oud, salons, real estate). One headline, one main button (The Social Kit), then: the business types, the seasons (Ramadan, Eid, national days, White Friday), the cream In-store teaser, the four packages (The Store Kit as a waitlist card) with "price + VAT = total", and a "Good to know" block (Stripe in SAR / AED / EGP, Arabic and English content, Instagram and Facebook, email). It uses the same page style as the inner pages (`studio-inner`); the old 3D studio hero is gone, so the homepage no longer loads `assets/studio.js`, three.js or the hero images (the files stay in `assets/`). The header has no button; each page has one main button.

- Homepage source: `templates/hero.html`, `templates/home.html` and the `home.*`, `ind.*`, and `season.*` keys (en, ar). `templates/studio-home.css` is no longer used.
- Shared navigation, inner-page styling and RTL adjustments: `templates/header.html`, `templates/studio-shared.css`, `templates/common.css` and `site.js`.
- Editable English studio presentation: `templates/studio-deck.html`; build output `/assets/studio-deck/index.html`. This introduces Crier to prospective clients and is distinct from the paid `/brand-deck/` product.
- Social preview source: `templates/social-preview.html`, built to `/assets/social-preview.html`. Render that page at 1200 × 630 after fonts/images load to refresh `og.png`.
- Project inquiries open the existing `team@crierstudio.com` email. Existing package pricing, intake, portal and checkout destinations are retained. Language switching preserves the selected package/platforms.

Run `node build/build.mjs && node build/check.mjs`, then serve this directory with `python3 -m http.server 8767 --bind 127.0.0.1` and open `http://127.0.0.1:8767/`.

Browser checks use the existing `playwright-core` test setup: `BASE=http://127.0.0.1:8767 node tests/form.mjs`, `node tests/consent.mjs` with the same BASE, and `OUTPUT=/path/to/evidence BASE=http://127.0.0.1:8767 node tests/studio.mjs`. The last check captures responsive screenshots and exports the studio deck with Chromium; it does not make live submissions. `CHROME` can override the browser executable. Export verification also requires checking the resulting PDF pages, not only the HTML source.

The public site deploys from `main` through GitHub Pages. Railway hosts the linked Client Portal and CRM; do not upload this static site over either service. Website deployment does not establish completion of the D3 deck engine.

Public site for Crier Studio. Static HTML served by GitHub Pages, in en (/) and ar (/ar/). English is the default (2026-10-30: root `<html lang="en" dir="ltr">`, `x-default` hreflang and the sitemap point to English; the EN/AR toggle remembers the choice in localStorage `crier.lang`). From 2026-10-28 to 2026-10-30 Arabic was the default and English lived under `/en/`; every old `/en/…` URL is now a redirect stub to the same English page at the root. Spanish and French were removed on 2026-10-16: every old `/es/…` and `/fr/…` URL is a small redirect stub to the matching English page (`REMOVED` in `build/build.mjs`). Indexable: `NOINDEX = false` in `build/build.mjs` (search opened in commit 98d03f7); set it to `true` and rebuild to hide the site from search again.

Pages (each in en and ar): `/`, `/pricing/`, `/social/` (The Social Kit + the request form), `/in-store/` (The Store Kit waitlist + Custom pieces, quoted in the client portal), `/brand-deck/` (Brand Deck, digital only), `/samples/`, `/faq/`, `/about/`, `/terms/`, `/privacy/`, `/refund/`, plus `404.html` and the old-URL stubs (`/?lang=xx`, `/terms.html`, `/privacy.html`, `/refund.html`, and `/kit/` + `/snapshot/` -> `/social/`, `/physical/` -> `/in-store/#custom`, `/crier-deck/` -> `/brand-deck/` in every language, keeping the query string; the `/es/` and `/fr/` stubs also go to the English page).

Packages: The Social Kit (`kit`, one-time), Stay Visible (`visible`, monthly), Keep Growing (`growing`, monthly), Brand Deck (`deck`, one-time, digital only); prices and contents from `data/pricing.json` (Adham's U1 patch, 2026-10-05: stories, seasonal mockups, one platform included + a paid extra platform, fully adapted). The card copy is Adham's; names are translated per language through the `name.<id>` keys.

- Source: `i18n/<lang>.json` (all text) + `templates/` (HTML, CSS). Build: `node build/build.mjs` (Node, no dependencies). The built files are committed.
- Checks: `node build/check.mjs` (identical key sets in en and ar, canonicals, hreflang, sitemap, links, no internal names/draft text, the 4 current prices on /pricing/, no retired package names or prices). `tests/form.mjs`: form and old-URL test with a mocked endpoint (never posts to the live API).
- Analytics: Google Analytics 4 (`G-QLQ443CQ8E`, constant `GA_ID` in `build/build.mjs`) with Consent Mode v2 sits right after the CSP meta in every built HTML file. Only the inline part is in `<head>` (consent defaults, js/config queued in `dataLayer`); gtag.js itself is injected on the visitor's first interaction (pointerdown, touchstart, keydown, scroll or wheel), or 6 s after the window `load` event when there is none, or at once when the visitor uses the consent bar or Cookie settings. Visitors who leave within about 6 s of the page loading without scrolling, tapping or typing are therefore not counted (owner approved delaying Analytics, 2026-10-11; the 6 s/interaction trigger keeps gtag.js's ~300 ms of script out of the mobile PageSpeed test window). Consent defaults to denied; analytics cookies only after Accept in the consent bar (`templates/consent.html` + `consent.css`, saved in localStorage `crier_consent`; the footer "Cookie settings" link reopens it). Ads signals are always denied. The CSP allows the two inline scripts by sha256 hashes that the build recomputes; the build fails if any inline script lacks a hash. `tests/consent.mjs` tests the bar and consent calls in a browser (Google requests are blocked in both browser tests).
- Never edit generated files by hand (`index.html`, `*/index.html`, `404.html`, `sitemap.xml`, the `terms.html` style stubs). Edit the source and rebuild.
- The hero is one block: `templates/hero.html`. Keep real HTML text in it (the H1 is the LCP element).
- The noindex switch is one constant at the top of `build/build.mjs` (`NOINDEX`, currently `false`). Change it and rebuild.

## Brand Deck availability

Brand Deck is coming soon in both languages: homepage, product page, pricing cards, billing FAQ and request form. It has no active offer in structured data. Its disabled button does not use a configured payment link. The legacy `deck`, `crier_deck` and `deck_print` form URLs display the unavailable package and cannot submit it. The Kit and monthly plans retain their current checkout flows; existing client entitlements are unchanged. Custom pieces (In-store, `#custom`) is a separate quoted custom-project route, not a bundled physical delivery promise.

The footer keeps every navigation destination (Social, In-store, Samples, Pricing, FAQ, About, Brand Deck, Client portal); the header has the six main ones.

## Buy buttons
`payment-links.json` (repo root) has one entry per product: `seen`, `visible`, `growing`, `deck`. Empty (all of them) = the "Choose" button opens the client portal's sign-up in the page language (`https://portal.crierstudio.com/#/signup?lang=<en|ar>`). The portal reads only `lang` (and `intent=quote`); it has no package parameter, so the chosen package is not passed. The Brand Deck button is disabled (coming soon).

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


## Packages and prices (2026-11-13)

Three monthly packages, Bronze (`seen`), Silver (`visible`) and Gold (`growing`), plus the Brand Deck (`deck`, coming soon, never payable). The Social Kit, Stay Visible and Keep Growing are retired names. Prices and counts come only from `data/pricing.json`, republished from the studio's master price list (`node portal/scripts/publish-pricing.cjs --site <this dir>`); never type a price into i18n or templates (`build/check.mjs` fails). `build/check.mjs` pins this table:

| Package, a month | USD (USA and other countries) | SAR (Saudi Arabia) | AED (UAE) | EGP (Egypt) |
| --- | --- | --- | --- | --- |
| Bronze | $750 | 350 | 340 | 2,500 |
| Silver | $1,100 | 695 | 680 | 5,000 |
| Gold | $1,500 | 1,045 | 1,020 | 7,500 |

The price shown is the amount due. VAT (owner, 2026-11-14: not VAT-registered anywhere): a VAT line or "+ VAT" appears only for a country whose `local.countries.<CC>` in the price data marks VAT as charged (`vat_pct` above 0 and `vat_charged` not false); otherwise none, and `build/check.mjs` fails on any VAT statement. Payment: after sign-up and the business questions the studio sends a payment link; the payment provider is not named anywhere on the site (`build/check.mjs` fails on "Stripe" until `data/pricing.json` names a provider in `payment_provider`).

The country picker (home and pricing): the visitor's pick (saved), else Cloudflare's country, else a Gulf time zone or the browser's language region, else "Another country" in US dollars.

## WhatsApp

`data/contact.json` holds the WhatsApp business number (`whatsapp`, digits only, international format). It is empty: no WhatsApp link is shown anywhere until Adham supplies the number and the site is rebuilt. When set, the link appears in the footer, on the homepage and on the About page.
