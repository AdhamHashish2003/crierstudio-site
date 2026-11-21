# Proposal: Middle East and North Africa landing page

Status: draft, not published. Add to sitemap with hreflang on approval. Read open question 1 in README.md first.

| | Arabic (root) | English |
| --- | --- | --- |
| URL | `https://crierstudio.com/mena/` | `https://crierstudio.com/en/mena/` |
| Title (≤ ~60) | إدارة السوشيال ميديا في الشرق الأوسط وشمال أفريقيا \| Crier Studio | Social media management across MENA \| Crier Studio |
| Meta description (≤ ~160) | منشورات وستوري وريلز وخطة محتوى شهرية لمشاريع الشرق الأوسط وشمال أفريقيا، بالعربية أو الإنجليزية أو بكلتيهما. ننشر بعد موافقتك ونرد على التعليقات. | Posts, stories, reels and a monthly content calendar for businesses across the Middle East and North Africa, in Arabic, English or both. Published once you approve. |
| H1 | سوشيال ميديا مشروعك في الشرق الأوسط وشمال أفريقيا، كل شهر | Your social media, every month, wherever you are in the Middle East and North Africa |
| hreflang | `ar` → `/mena/`, `en` → `/en/mena/`, `x-default` → `/mena/` | same pair |
| JSON-LD | `WebPage` + `Service` (`serviceType` «إدارة صفحات السوشيال ميديا» / "Social media management", `provider` → `/#organization`, `areaServed`: Country EG, SA, AE, US + `{"@type":"Place","name":"Middle East and North Africa"}`), `BreadcrumbList` (Home → MENA). No `Offer` here. | same |

## Section outline

1. **Hero.** H1; line: «نصمّم منشوراتك ونكتب نصوصها ونصنع الستوري والريلز، ثم ننشرها بعد موافقتك ونرد على التعليقات والرسائل.» /
   "We design your posts, write the captions and make your stories and reels, then publish them once you approve and reply to
   comments and messages." Button: Subscribe on WhatsApp.
2. **What you get every month** (the six `lp.mk.*` items as on the home page): posts with captions, stories, reels, the monthly
   content calendar, publishing and replies, and the brand look (colours, fonts, post templates) and growth plan in month 1.
3. **In your language.** Arabic, English or both, for each post.
4. **Where we work and how you pay.** A short table, no amounts:
   | البلد / Country | العملة / Currency (prices on /pricing/) | الدفع / Payment (details on WhatsApp) |
   | --- | --- | --- |
   | مصر / Egypt | الجنيه المصري / EGP | InstaPay |
   | السعودية / Saudi Arabia | الريال السعودي / SAR | تحويل بنكي / bank transfer |
   | الإمارات / the UAE | الدرهم الإماراتي / AED | تحويل بنكي / bank transfer |
   | الولايات المتحدة / the USA | الدولار الأمريكي / USD | رابط دفع بالبطاقة / card payment link |
   | بلدان أخرى / other countries | الدولار الأمريكي / USD | to be decided by the owner (open question 1) |
5. **How it works** (the four `sp.how.*` steps, with the per-country payment line).
6. **You approve everything.** Nothing is published before you approve it; a person on our team publishes and replies.
7. **Examples** (the made-up example posts, labelled).
8. **FAQ** (reuse `lp.faq.1-3`; add "Do you work with businesses in my country?" answered with the table above, no promises
   beyond it).
9. **Close.** Subscribe on WhatsApp / create your account.

## Internal links

`/`, `/social/`, `/pricing/`, `/posts/`, `/reels/`, `/stories/`, and the country pages if they are made (`/egypt/`,
`/saudi-arabia/`, `/uae/`, `/en/usa/`).

## Notes

- No list of countries beyond what the price data serves; no claim about clients in a country.
- If country pages are not made, this page alone carries the geography and the home page links to it from the footer.
