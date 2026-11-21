# Proposal: Posts service page

Status: draft, not published. Add to sitemap with hreflang on approval.

| | Arabic (root) | English |
| --- | --- | --- |
| URL | `https://crierstudio.com/posts/` | `https://crierstudio.com/en/posts/` |
| Title (≤ ~60) | تصميم منشورات السوشيال ميديا مع نصوصها \| Crier Studio | Social media posts with captions \| Crier Studio |
| Meta description (≤ ~160) | منشورات مصمّمة لمشروعك مع نصوصها، بنسخة لكل منصة: Instagram وFacebook وTikTok. لا ننشر شيئًا قبل موافقتك، ثم ننشر ونرد على التعليقات. | Designed posts for your business with captions, a version for each platform: Instagram, Facebook and TikTok. Nothing goes live before you approve it. |
| H1 | منشورات لمشروعك، مع نصوصها، لكل منصة | Posts for your business, with captions, for every platform |
| hreflang | `ar` → `/posts/`, `en` → `/en/posts/`, `x-default` → `/posts/` | same pair |
| JSON-LD | `Service` (`serviceType` «تصميم منشورات السوشيال ميديا» / "Social media post design", `provider` → `/#organization`, `areaServed` as on the home page: EG, SA, AE, US + Place "Middle East and North Africa"), `BreadcrumbList` (Home → Posts), no `Offer` (prices stay on /pricing/) | same, English names |

## Section outline

1. **Hero.** H1, one line: «نصمّم منشورات مشروعك ونكتب نصوصها، ثم ننشرها بعد موافقتك.» / "We design your posts and write their
   captions, then publish them once you approve." Main button: «اشترك عبر واتساب» / "Subscribe on WhatsApp" (the site's
   `ctaBtn`), second link: the pricing page.
2. **What a post includes.**
   - التصميم بهوية مشروعك (ألوانك وخطوطك وقوالب منشوراتك، نجهّزها في شهرك الأول). / The design in your brand look (your colours,
     fonts and post templates, set up in your first month).
   - النص المكتوب للمنشور، بالعربية أو الإنجليزية أو بكلتيهما. / The caption, in Arabic, English or both.
3. **A version for each platform.** One idea, three versions: Instagram, Facebook and TikTok each get the size and the caption
   that suits it. / نسخة لكل منصة: Instagram وFacebook وTikTok، كل منها بالمقاس والنص المناسبين لها.
4. **You approve first.** «لا يُنشر أي منشور قبل موافقتك. يمكنك طلب تعديل قبل الموافقة.» / "Nothing is published before you
   approve it. You can ask for a change first." (The number of revision rounds per design is on /pricing/, per package.)
5. **Who publishes.** «يتولى شخص من فريقنا النشر على صفحاتك والرد على التعليقات والرسائل.» / "A person on our team publishes on
   your pages and replies to comments and messages." (Do not say we connect to or log in to your account.)
6. **Part of a monthly plan.** Posts come with stories, reels and a monthly content calendar in every package; link to
   /reels/, /stories/ and /pricing/.
7. **Examples.** Reuse the made-up example posts (`assets/ex/`, each labelled «مثال / Example»), with the line that they are
   examples for made-up businesses.
8. **Short FAQ** (3 questions, FAQPage only if the answers are on the page): who writes the captions; which languages; what
   we need from you (logo, photos, a few answers, as in `lp.faq.3a`).
9. **Close.** Subscribe on WhatsApp; "Prefer to set up first? Create your account" (`how.alt`).

## Internal links

`/` (home), `/social/`, `/pricing/`, `/reels/`, `/stories/` (and the `/en/` twins on the English page). Footer as on every page.

## Notes

- No price, package count or currency on this page (counts per package live on /pricing/).
- On approval: add `posts` to `PAGES`, a template `templates/posts.html`, keys `svc.posts.*` in both i18n files, `CRUMB_KEY`,
  the nav decision (header or footer only), and `build/check.mjs`'s `PAGES`. Add to sitemap with hreflang on approval.
