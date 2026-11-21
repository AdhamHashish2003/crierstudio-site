# Proposal (optional): United States page

Status: draft, not published. Add to sitemap with hreflang on approval.

| | Arabic (root) | English |
| --- | --- | --- |
| URL | `https://crierstudio.com/usa/` (optional, see note) | `https://crierstudio.com/en/usa/` |
| Title (≤ ~60) | إدارة السوشيال ميديا للمشاريع في الولايات المتحدة \| Crier Studio | Social media management for US businesses \| Crier Studio |
| Meta description (≤ ~160) | منشورات وستوري وريلز وخطة محتوى شهرية للمشاريع في الولايات المتحدة، بالعربية أو الإنجليزية، بالدولار الأمريكي والدفع برابط بطاقة. | Posts, stories, reels and a monthly content calendar for US businesses, in English, Arabic or both. Priced in US dollars, paid by card. Published once you approve. |
| H1 | سوشيال ميديا مشروعك في الولايات المتحدة، كل شهر | Your social media, every month, for your US business |
| hreflang | `ar` → `/usa/`, `en` → `/en/usa/`, `x-default` → `/en/usa/` (English first for this page) | same pair |
| JSON-LD | `Service` (`areaServed`: `{"@type":"Country","name":"United States","identifier":"US"}`, `provider` → `/#organization`), `BreadcrumbList` (Home → United States) | same |

## Section outline

1. Hero, Subscribe on WhatsApp.
2. What you get every month (the six `lp.mk.*` items).
3. **In English, Arabic or both** (a reason to choose Crier for a business with Arabic-speaking customers).
4. **Prices in US dollars** on /en/pricing/ (link, no amounts).
5. **Paying from the USA:** "Get a payment link on WhatsApp and pay by card." (`hw.2t.us`). Name no card provider (the site
   names none until `data/pricing.json` has `payment_provider`).
6. You approve first; a person on our team publishes and replies.
7. FAQ, close.

## Internal links

`/en/`, `/en/social/`, `/en/pricing/`, `/en/mena/`, the English service pages.

## Notes

- The site sends a US visitor on an Arabic page to `/en/` (`GEO_INLINE`), so an Arabic `/usa/` page would rarely be seen by US
  visitors. Either make it English only (then no hreflang pair, just a self-canonical English page) or keep the Arabic twin for
  Arabic-speaking owners and let them reach it with the AR link. Owner's choice.
- x-default for this page could be the English URL (the default elsewhere is Arabic); decide on approval.
