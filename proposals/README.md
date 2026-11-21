# Proposed pages (not published)

Drafts for the owner to review (2026-11-20, SEO batch). Nothing in this folder is built, served or listed in the sitemap:
`proposals` is in the `_config.yml` exclude list, `build/build.mjs` never reads it, and `build/check.mjs` fails if a file from
here would be published.

Each draft gives, in Arabic (the root) and English (`/en/`): URL, title, meta description, H1, section outline, internal links,
JSON-LD type and the hreflang pair. **On approval:** add the page to `PAGES` in `build/build.mjs` (with its template and the
i18n keys), add it to the sitemap with hreflang (the build does this for every page in `PAGES` that is not parked), and add it
to `build/check.mjs`'s `PAGES`.

| File | Page | Arabic URL | English URL |
| --- | --- | --- | --- |
| [service-posts.md](service-posts.md) | Posts (designs + captions, a version per platform) | `/posts/` | `/en/posts/` |
| [service-reels.md](service-reels.md) | Reels (short reels from your description and up to 6 photos) | `/reels/` | `/en/reels/` |
| [service-stories.md](service-stories.md) | Stories (3-5 animated text frames after approved posts) | `/stories/` | `/en/stories/` |
| [landing-mena.md](landing-mena.md) | One landing page for the Middle East and North Africa | `/mena/` | `/en/mena/` |
| [country-eg.md](country-eg.md) | Egypt (optional) | `/egypt/` | `/en/egypt/` |
| [country-sa.md](country-sa.md) | Saudi Arabia (optional) | `/saudi-arabia/` | `/en/saudi-arabia/` |
| [country-ae.md](country-ae.md) | The UAE (optional) | `/uae/` | `/en/uae/` |
| [country-us.md](country-us.md) | The USA (optional) | `/usa/` (see note) | `/en/usa/` |

## Rules every draft follows

- Only facts we can stand behind (uma `portal/lib/pricing.json` and the current site, 2026-11-20): Crier makes designed posts
  with captions (a version per platform: Instagram, Facebook, TikTok), stories, reels and a monthly content calendar, and in the
  first month the brand look (colours, fonts, post templates) and a growth plan; nothing is published before the client
  approves it; a person at the studio publishes and replies to comments and messages; captions in Arabic, English or both.
- Prices only on `/pricing/` (each served country in its own currency: EGP, SAR, AED, USD; any other country at the USD
  price). No price in a title, a meta description or a blurb.
- Payment as the site states it today, always arranged on WhatsApp: InstaPay in Egypt, a card payment link in the USA, a bank
  transfer in Saudi Arabia and the UAE.
- No "free", no trial, no guarantee, no statistic, no testimonial, no "launch" wording. Crier never connects to or logs in
  to a client's Instagram or Facebook account, and no draft says it does.
- Arabic in the site's voice (simple, warm Modern Standard Arabic; names such as Instagram, InstaPay and WhatsApp in Latin
  script; digits 0-9).

## Open questions for the owner (before any of these is published)

1. A visitor from a country outside EG, SA, AE and the US currently sees the Egypt page (EGP, InstaPay). The price list says
   any other country buys at the USD price. Before the MENA page goes live, decide what such a visitor is shown and how they pay.
2. Reels "from your description and up to 6 photos" and stories "3-5 animated text frames" are the production rules given for
   this batch; the package cards today say only "reels" and "a story with every post". Confirm the wording before publishing.
3. The country pages are optional: one MENA page may be enough. If they are made, each must say something specific to that
   country (currency, payment), not only swap the country name.
