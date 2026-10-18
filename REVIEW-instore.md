# In-store restructure: review list (2026-10-18)

Branch `instore-restructure` (site), `social-kit-rename` (uma-main worktree, Launchpad worktree). Nothing is deployed or pushed.
One local build: `python build/subset-fonts.py`, `node build/build.mjs`, `node build/check.mjs` -> "all checks passed (22 pages, 2 languages)".
Tests (`tests/*.mjs`, portal `node --test`, Launchpad `pytest`) were NOT run; expectations that assert the old name were updated.

What to read first: section 1 (every Arabic string), section 5 ([BRACKET]s: none left), section 8 (things I decided that you may want to change),
section 9 ("Snapshot" wording).

## 1. Arabic strings: every new or changed key

Generated from `git diff` of `i18n/ar.json` (old = main 27db0e5). EN source = the same key in `i18n/en.json` after the change.
`{price:…}` / `{n:…}` are filled from `data/pricing.json` at build time; `{email}` becomes team@crierstudio.com.

140 keys (100 new, 40 changed).

Update 2026-10-18 (quotes move into the client portal): the inline quote form is gone. Removed keys `is.q.name`, `is.q.what`,
`is.q.where`, `is.q.when`, `is.q.ok`, `v.name`, `v.what` (their rows are deleted below); new `is.c.acct`, `is.c.login`; changed
`faq.25a1` (now about the portal) and `faq.17a1` (accounts for quotes can be created by the visitor). `is.q.btn` stays (the
button). The quote page's own strings (EN + AR) are in the portal, uma-main `portal/public/i18n/*.json`, listed at the end of this section.

Update 2026-10-18 (promise nothing): The Store Kit is a coming-soon concept, so its copy promises no quantities, price, launch
price, launch date or delivery; Custom pieces is a sign-up, so its copy promises no quote, price or reply time. Changed (rows
below show the new text): `is.kit.note` (now says the lists are not final), the 17 `is.kit.*.i*` items (plain names, no
quantities), `is.sub`, `is.p3x`, `faq.23a1`, `faq.24a1`, `faq.25a1`, `faq.26a1`, `faq.17a1`, `meta.d.in-store`, `physical.scope`,
`is.c.intro`, `is.c.acct`, and `studio.copy.068` (was "Technical feasibility, production scope, cost and delivery are confirmed
before commitment." / "نؤكد الجدوى التقنية ونطاق الإنتاج والتكلفة والتسليم قبل الالتزام.", now "Nothing is made or charged until
you agree to it." / "لا نصنع شيئًا ولا نطلب أي مبلغ قبل موافقتك."). `is.q.btn` stays "Request a quote" / "اطلب عرض سعر".

| Key | Old AR | New AR | EN source |
|---|---|---|---|
| `meta.d.terms` | شروط crierstudio.com: الحزمة الكاملة، والباقتان الشهريتان حضور دائم ونمو مستمر (الدفع شهري، وتقدر تلغي قبل التجديد)، وBrand Deck، وبوابة العملاء. Crier Studio ليست شركة مسجّلة بعد. | شروط crierstudio.com: حزمة السوشيال ميديا، والباقتان الشهريتان حضور دائم ونمو مستمر (الدفع شهري، وتقدر تلغي قبل التجديد)، وBrand Deck، وبوابة العملاء. Crier Studio ليست شركة مسجّلة بعد. | The terms for crierstudio.com: The Social Kit, the Stay Visible and Keep Growing monthly plans (billed monthly, cancel before renewal), the Brand Deck and the client portal. Crier Studio is not yet a registered company. |
| `meta.d.privacy` | البيانات التي تجمعها Crier Studio عندما تطلب الحزمة الكاملة أو باقة شهرية أو Brand Deck أو تستخدم بوابة العملاء: لماذا نجمعها، ومن يطّلع عليها، وكم نحتفظ بها، وكيف تطلب تصديرها أو حذفها. | البيانات التي تجمعها Crier Studio عندما تطلب حزمة السوشيال ميديا أو باقة شهرية أو Brand Deck أو تستخدم بوابة العملاء: لماذا نجمعها، ومن يطّلع عليها، وكم نحتفظ بها، وكيف تطلب تصديرها أو حذفها. | What Crier Studio collects when you order The Social Kit, a monthly plan or a Brand Deck, or use the client portal: why, who sees it, how long it is kept, and how to export or erase it. |
| `meta.d.refund` | الاسترداد في Crier Studio: طريقة الدفع للحزمة الكاملة والباقات الشهرية وBrand Deck، ومهلة الاسترداد خلال 7 أيام، وطريقة إلغاء الباقة. | الاسترداد في Crier Studio: طريقة الدفع لحزمة السوشيال ميديا والباقات الشهرية وBrand Deck، ومهلة الاسترداد خلال 7 أيام، وطريقة إلغاء الباقة. | Refunds at Crier Studio: how payment works for The Social Kit, the monthly plans and the Brand Deck, the 7-day refund window, and cancelling a plan. |
| `hero.cta` | احصل على الحزمة الكاملة، {price:kit} | احصل على حزمة السوشيال ميديا، {price:kit} | Get The Social Kit, {price:kit} |
| `f.submit` | اطلب الحزمة الكاملة | اطلب حزمة السوشيال ميديا | Request my Social Kit |
| `faq.1a1` | للحزمة الكاملة أو لباقة شهرية: اسم نشاطك، وموقعك أو حسابك على إنستغرام، وبريدك الإلكتروني، ومدينتك، وبلدك، ومجالك، ثم تدفع بأمان عبر Stripe. سيُتاح Brand Deck قريبًا ولا يمكن طلبه بعد. | لحزمة السوشيال ميديا أو لباقة شهرية: اسم نشاطك، وموقعك أو حسابك على إنستغرام، وبريدك الإلكتروني، ومدينتك، وبلدك، ومجالك، ثم تدفع بأمان عبر Stripe. سيُتاح Brand Deck قريبًا ولا يمكن طلبه بعد. | For The Social Kit or a monthly plan: your business name, website or Instagram, email, city, country and industry; then you pay securely on Stripe. The Brand Deck is coming soon and cannot be ordered yet. |
| `foot.blurb` | أدلة العلامة ومحتوى إنستغرام وفيسبوك للمشاريع المحلية في السعودية والإمارات ومصر. | استوديو تصميم للمشاريع المحلية: محتوى السوشيال ميديا وحزم المحلات والقطع حسب الطلب، في السعودية والإمارات ومصر. | A design studio for local businesses: social content, store kits and custom pieces, in Saudi Arabia, the UAE and Egypt. |
| `terms.intro` | شروط استخدام crierstudio.com والحزمة الكاملة والباقات الشهرية وBrand Deck وبوابة العملاء. | شروط استخدام crierstudio.com وحزمة السوشيال ميديا والباقات الشهرية وBrand Deck وبوابة العملاء. | The terms for using crierstudio.com, The Social Kit, the monthly plans, the Brand Deck and the client portal. |
| `terms.offer.p1` | <b>الحزمة الكاملة ({price:kit}، دفعة واحدة، لنشاط تجاري واحد):</b> ملف PDF كامل للتسويق ودليل العلامة التجارية؛ ومراجعة للنشاط و{n:kit.competitor_profiles} ملفات عن المنافسين؛ والتموضع وفرضيات الجمهور والرسائل الرئيسية؛ وإرشادات استخدام الشعار والألوان والخطوط ونبرة الصوت؛ و{n:kit.posts} تصاميم لوسائل التواصل مع تعليقاتها؛ و{n:kit.stories} قصص (ستوري)؛ وأفكار حملات ({n:kit.campaign_concepts}) مع {n:kit.ad_copies} صيغ لنص إعلاني؛ ونماذج العرض القياسية المناسبة (حتى {n:kit.mockups})؛ وأولويات الموقع وSEO وخطة لمدة 30 يومًا؛ وملفات التصميم منفصلة، مع {n:kit.revision_rounds} جولة تصحيح. وهي مبنية على شعارك الحالي والمواد التي توافق عليها. | <b>حزمة السوشيال ميديا ({price:kit}، دفعة واحدة، لنشاط تجاري واحد):</b> ملف PDF كامل للتسويق ودليل العلامة التجارية؛ ومراجعة للنشاط و{n:kit.competitor_profiles} ملفات عن المنافسين؛ والتموضع وفرضيات الجمهور والرسائل الرئيسية؛ وإرشادات استخدام الشعار والألوان والخطوط ونبرة الصوت؛ و{n:kit.posts} تصاميم لوسائل التواصل مع تعليقاتها؛ و{n:kit.stories} قصص (ستوري)؛ وأفكار حملات ({n:kit.campaign_concepts}) مع {n:kit.ad_copies} صيغ لنص إعلاني؛ ونماذج العرض القياسية المناسبة (حتى {n:kit.mockups})؛ وأولويات الموقع وSEO وخطة لمدة 30 يومًا؛ وملفات التصميم منفصلة، مع {n:kit.revision_rounds} جولة تصحيح. وهي مبنية على شعارك الحالي والمواد التي توافق عليها. | <b>The Social Kit ({price:kit}, one-time, for one business):</b> a complete marketing + brand-book PDF; a business review and {n:kit.competitor_profiles} competitor profiles; positioning, audience hypotheses and key messages; logo usage, colors, type and voice guidelines; {n:kit.posts} social designs with captions; {n:kit.stories} stories; {n:kit.campaign_concepts} campaign concept with {n:kit.ad_copies} ad-copy variations; the relevant standard brand mockups (up to {n:kit.mockups}); website/SEO priorities and a 30-day plan; and the individual creative files, with {n:kit.revision_rounds} correction round. It is built around your existing logo and approved assets. |
| `privacy.intro` | البيانات التي تجمعها Crier Studio عندما تطلب الحزمة الكاملة أو باقة شهرية أو Brand Deck على crierstudio.com أو تستخدم بوابة العملاء: لماذا نجمعها، ومن يطّلع عليها، وكم نحتفظ بها، وكيف تطلب تصديرها أو حذفها. | البيانات التي تجمعها Crier Studio عندما تطلب حزمة السوشيال ميديا أو باقة شهرية أو Brand Deck على crierstudio.com أو تستخدم بوابة العملاء: لماذا نجمعها، ومن يطّلع عليها، وكم نحتفظ بها، وكيف تطلب تصديرها أو حذفها. | What Crier Studio collects when you order The Social Kit, a monthly plan or a Brand Deck on crierstudio.com or use the client portal, why, who sees it, how long it is kept, and how to export or erase it. |
| `refund.kit.h` | الحزمة الكاملة | حزمة السوشيال ميديا | The Social Kit |
| `refund.kit.p` | سعر الحزمة الكاملة {price:kit} تدفعه مرة واحدة. إذا لم تكن راضيًا عمّا نسلّمه، راسلنا خلال 7 أيام وسنتفق معك كتابةً على تعديل أو استرداد. | سعر حزمة السوشيال ميديا {price:kit} تدفعه مرة واحدة. إذا لم تكن راضيًا عمّا نسلّمه، راسلنا خلال 7 أيام وسنتفق معك كتابةً على تعديل أو استرداد. | The Social Kit is a {price:kit} one-time payment. If you are not happy with what we deliver, email us within 7 days and we will agree a fix or a refund with you in writing. |
| `meta.t.index` | Crier Studio \| محتوى إنستغرام وفيسبوك للمشاريع المحلية في السعودية والإمارات ومصر | Crier Studio \| محتوى السوشيال ميديا وحزم المحلات والقطع حسب الطلب للمشاريع المحلية في السعودية والإمارات ومصر | Crier Studio \| Social content, store kits and custom pieces for local businesses in Saudi Arabia, the UAE and Egypt |
| `meta.t.faq` | أسئلة عن الحزمة الكاملة والباقات الشهرية وBrand Deck | أسئلة عن حزمة السوشيال ميديا والباقات الشهرية وحزمة المحل وBrand Deck | Questions about The Social Kit, the monthly plans, The Store Kit and Brand Deck |
| `meta.d.faq` | إجابات عن الحزمة الكاملة والباقات الشهرية وBrand Deck: ما نحتاجه منك، والدفع، والملفات، واللغات، والطباعة، والملكية، وما يحدث لبياناتك. | إجابات عن حزمة السوشيال ميديا والباقات الشهرية وحزمة المحل والقطع حسب الطلب وBrand Deck: ما نحتاجه منك، والدفع، والملفات، واللغات، والطباعة، والملكية، وما يحدث لبياناتك. | Answers about The Social Kit, the monthly plans, The Store Kit, custom pieces and the Brand Deck: what we need from you, billing, files, languages, printing, ownership and what happens to your details. |
| `meta.d.index` | دليل علامة ومنشورات وقصص وخطة لمدة 30 يومًا للمقاهي والمطاعم ومحلات العبايات والعطور والعود والصالونات والعيادات والعقارات. بالعربية والإنجليزية، والدفع بالريال أو الدرهم أو الجنيه. | استوديو تصميم للمشاريع المحلية: محتوى السوشيال ميديا وحزم المحلات والقطع حسب الطلب، في السعودية والإمارات ومصر. حزمة السوشيال ميديا والباقات الشهرية، وقطع لمحلك بهويتك أنت. | A design studio for local businesses: social content, store kits and custom pieces, in Saudi Arabia, the UAE and Egypt. The Social Kit, monthly plans, and pieces for your store in your own identity. |
| `meta.d.about` | Crier Studio تجهّز أدلة العلامة ومحتوى إنستغرام وفيسبوك للمشاريع المحلية في السعودية والإمارات ومصر. | Crier Studio استوديو تصميم للمشاريع المحلية: محتوى السوشيال ميديا وحزم المحلات والقطع حسب الطلب، في السعودية والإمارات ومصر. | Crier Studio is a design studio for local businesses: social content, store kits and custom pieces, in Saudi Arabia, the UAE and Egypt. |
| `terms.offer.p3` | <b>الباقات الشهرية:</b> حضور دائم ({price:visible} شهريًا) ونمو مستمر ({price:growing} شهريًا). الباقتان تشملان الحزمة الكاملة في شهرك الأول، وتفاصيل كل باقة موجودة في صفحة الأسعار. | <b>الباقات الشهرية:</b> حضور دائم ({price:visible} شهريًا) ونمو مستمر ({price:growing} شهريًا). الباقتان تشملان حزمة السوشيال ميديا في شهرك الأول، وتفاصيل كل باقة موجودة في صفحة الأسعار. | <b>Monthly plans:</b> Stay Visible ({price:visible} a month) and Keep Growing ({price:growing} a month). Both include The Social Kit in your first month. What each includes is listed on the pricing page. |
| `meta.t.pricing` | الأسعار: الحزمة الكاملة والباقات الشهرية وBrand Deck \| Crier Studio | الأسعار: حزمة السوشيال ميديا والباقات الشهرية وحزمة المحل وBrand Deck \| Crier Studio | Pricing: The Social Kit, monthly plans, The Store Kit and Brand Deck \| Crier Studio |
| `meta.d.pricing` | أسعار Crier Studio: الحزمة الكاملة (دفعة واحدة)، وباقتا حضور دائم ونمو مستمر الشهريتان، وBrand Deck (قريبًا). الأسعار بالريال السعودي والدرهم الإماراتي والجنيه المصري مع إضافة ضريبة القيمة المضافة. الإلغاء قبل التجديد. | أسعار Crier Studio: حزمة السوشيال ميديا (دفعة واحدة)، وباقتا حضور دائم ونمو مستمر الشهريتان، وحزمة المحل (قائمة انتظار)، وBrand Deck (قريبًا). الأسعار بالريال السعودي والدرهم الإماراتي والجنيه المصري مع إضافة ضريبة القيمة المضافة. الإلغاء قبل التجديد. | Crier Studio pricing: The Social Kit (one time), the Stay Visible and Keep Growing monthly plans, The Store Kit (waitlist) and the Brand Deck (coming soon). Prices in Saudi riyals, UAE dirhams and Egyptian pounds with VAT added. Cancel before renewal. |
| `pricing.lead` | ابدأ بالحزمة الكاملة، أو احصل على منشورات جديدة كل شهر. | ابدأ بحزمة السوشيال ميديا، أو احصل على منشورات جديدة كل شهر. | Start with The Social Kit, or get new posts every month. |
| `pricing.plans.title` | ثلاث باقات | أربع باقات | Four packages |
| `bill.3` | الحزمة الكاملة دفعة واحدة. والباقات الشهرية تتجدد كل شهر: تقدر تلغي في أي وقت قبل التجديد، وتبقى باقتك فعّالة حتى نهاية الشهر المدفوع. | حزمة السوشيال ميديا دفعة واحدة. والباقات الشهرية تتجدد كل شهر: تقدر تلغي في أي وقت قبل التجديد، وتبقى باقتك فعّالة حتى نهاية الشهر المدفوع. | The Social Kit is a one-time payment. Monthly plans renew each month: cancel any time before renewal and keep your plan until the paid month ends. |
| `faq.19a1` | باقتا حضور دائم ونمو مستمر تُدفعان شهريًا عبر Stripe. أما الحزمة الكاملة فدفعة واحدة. في السعودية والإمارات ومصر تدفع بالريال أو الدرهم أو الجنيه المصري مع إضافة ضريبة القيمة المضافة إلى السعر المعروض، وفي أي بلد آخر بالدولار الأمريكي بدون ضريبة. سيُتاح Brand Deck قريبًا، ولا نستقبل الطلبات أو المدفوعات حاليًا. | باقتا حضور دائم ونمو مستمر تُدفعان شهريًا عبر Stripe. أما حزمة السوشيال ميديا فدفعة واحدة. في السعودية والإمارات ومصر تدفع بالريال أو الدرهم أو الجنيه المصري مع إضافة ضريبة القيمة المضافة إلى السعر المعروض، وفي أي بلد آخر بالدولار الأمريكي بدون ضريبة. سيُتاح Brand Deck قريبًا، ولا نستقبل الطلبات أو المدفوعات حاليًا. | Stay Visible and Keep Growing are billed monthly through Stripe. The Social Kit is a one-time payment. In Saudi Arabia, the UAE and Egypt you pay in riyals, dirhams or Egyptian pounds with VAT added to the price shown; anywhere else in US dollars, with no VAT. Brand Deck is coming soon. Orders and payments are not open yet. |
| `faq.21q` | هل الحزمة الكاملة مشمولة في الباقات الشهرية؟ | هل حزمة السوشيال ميديا مشمولة في الباقات الشهرية؟ | Is The Social Kit included in the monthly plans? |
| `faq.21a1` | نعم. باقتا حضور دائم ونمو مستمر تشملان الحزمة الكاملة في شهرك الأول، وتصاميمها ({n:kit.posts}) تُحسب ضمن تصاميم ذلك الشهر. | نعم. باقتا حضور دائم ونمو مستمر تشملان حزمة السوشيال ميديا في شهرك الأول، وتصاميمها ({n:kit.posts}) تُحسب ضمن تصاميم ذلك الشهر. | Yes. Stay Visible and Keep Growing both include The Social Kit in your first month. Its {n:kit.posts} social designs count toward your first month's designs. |
| `faq.22q` | هل أقدر أشتري الحزمة الكاملة وحدها؟ | هل أقدر أشتري حزمة السوشيال ميديا وحدها؟ | Can I buy The Social Kit on its own? |
| `faq.22a1` | نعم. الحزمة الكاملة دفعة واحدة، لنشاط واحد، وبدون اشتراك. | نعم. حزمة السوشيال ميديا دفعة واحدة، لنشاط واحد، وبدون اشتراك. | Yes. The Social Kit is a one-time payment, for one business, with no subscription. |
| `terms.bill.p3` | الحزمة الكاملة مشمولة في الشهر الأول من حضور دائم أو نمو مستمر، وتُحتسب تصاميمها ({n:kit.posts}) ضمن تصاميم ذلك الشهر. | حزمة السوشيال ميديا مشمولة في الشهر الأول من حضور دائم أو نمو مستمر، وتُحتسب تصاميمها ({n:kit.posts}) ضمن تصاميم ذلك الشهر. | The Social Kit is included in your first month of Stay Visible or Keep Growing, and its {n:kit.posts} social designs count toward that month's designs. |
| `name.kit` | الحزمة الكاملة | حزمة السوشيال ميديا | The Social Kit |
| `pkg.kit.btn` | أريد الحزمة الكاملة | أريد حزمة السوشيال ميديا | Get my Social Kit |
| `pkg.visible.f1` | الحزمة الكاملة مشمولة في شهرك الأول | حزمة السوشيال ميديا مشمولة في شهرك الأول | Social Kit included in your first month |
| `pkg.growing.f1` | الحزمة الكاملة مشمولة في شهرك الأول | حزمة السوشيال ميديا مشمولة في شهرك الأول | Social Kit included in your first month |
| `kit.title` | الحزمة الكاملة | حزمة السوشيال ميديا | The Social Kit |
| `f.optKit` | الحزمة الكاملة، {price:kit} | حزمة السوشيال ميديا، {price:kit} | The Social Kit, {price:kit} |
| `f.platformKit` | أي منصة تريد؟ الحزمة الكاملة تُجهَّز لمنصة واحدة. | أي منصة تريد؟ حزمة السوشيال ميديا تُجهَّز لمنصة واحدة. | Which platform? The Social Kit is made for one platform. |
| `home.plans.title` | ثلاث باقات | أربع باقات | Four packages |
| `physical.2x` | تصوّرات لقطع ومنحوتات مخصّصة، من دراسة الشكل الأولية إلى تحديد اتجاه الخامات والتشطيبات. | تصوّرات لقطع ومنحوتات مخصّصة، من دراسة الشكل الأولية إلى تحديد اتجاه الخامات والتشطيبات. وقطع الفايبرجلاس نصنعها في ورشتنا الخاصة. | Custom object and sculptural concepts, from initial form studies to material and finish direction. Fiberglass pieces are made in our own workshop. |
| `physical.scope` | أخبرنا بما تريد تصميمه، وكيف سيُستخدم، وأين موقعك، ومتى تحتاجه. نحدّد نطاق التصميم ونسعّره منفصلًا عن الحزمة الكاملة والباقات الشهرية وBrand Deck. | أخبرنا بما تريد تصميمه، وكيف سيُستخدم، وأين موقعك، ومتى تحتاجه. القطع حسب الطلب منفصلة عن حزمة السوشيال ميديا والباقات الشهرية وBrand Deck. | Tell us what you want to make, how it will be used, your location and your timing. Custom pieces are separate from The Social Kit, the monthly plans and Brand Deck. |
| `nav.social` | (new) | السوشيال | Social |
| `nav.instore` | (new) | داخل المحل | In-store |
| `name.store` | (new) | حزمة المحل | The Store Kit |
| `pkg.store.eye` | (new) | محلك | Your store |
| `meta.t.social` | (new) | حزمة السوشيال ميديا: دليل علامتك و{n:kit.posts} تصاميم لوسائل التواصل وخطة لمدة 30 يومًا \| Crier Studio | The Social Kit: your brand book, {n:kit.posts} social designs and a 30-day plan \| Crier Studio |
| `meta.d.social` | (new) | حزمة السوشيال ميديا دفعة واحدة: ملف PDF للتسويق ودليل العلامة، و{n:kit.competitor_profiles} ملفات عن المنافسين، والتموضع، و{n:kit.posts} تصاميم لوسائل التواصل مع تعليقاتها، وفكرة حملة، ونماذج عرض للعلامة، وخطة لمدة 30 يومًا. من Crier Studio، استوديو تصميم للمشاريع المحلية في السعودية والإمارات ومصر. | The Social Kit, one time: a marketing + brand-book PDF, {n:kit.competitor_profiles} competitor profiles, positioning, {n:kit.posts} social designs with captions, a campaign concept, brand mockups and a 30-day plan. By Crier Studio, a design studio for local businesses in Saudi Arabia, the UAE and Egypt. |
| `meta.t.in-store` | (new) | داخل المحل: حزمة المحل والقطع حسب الطلب \| Crier Studio | In-store: The Store Kit and custom pieces \| Crier Studio |
| `meta.d.in-store` | (new) | استوديو تصميم للمشاريع المحلية: محتوى السوشيال ميديا وحزم المحلات والقطع حسب الطلب، في السعودية والإمارات ومصر. مرايل ولوحات قوائم وسجاد مدخل وأكواب وحوامل QR بهويتك: انضم إلى قائمة انتظار حزمة المحل أو أخبرنا بالقطع التي تحتاجها حسب الطلب. | A design studio for local businesses: social content, store kits and custom pieces, in Saudi Arabia, the UAE and Egypt. Aprons, menu boards, door mats, cups and QR stands in your identity: join the Store Kit waitlist or tell us about the custom pieces you need. |
| `faq.ctaStore` | (new) | حزمة المحل — انضم إلى قائمة الانتظار | Store Kit — join the waitlist |
| `faq.23q` | (new) | ما هي حزمة المحل؟ | What is the Store Kit? |
| `faq.23a1` | (new) | حزمة المحل مجموعة من القطع التي يستخدمها محلك كل يوم، مثل المرايل ولوحات القوائم وسجاد المدخل والأكواب وحوامل QR وبطاقات الأختام، نصمّمها لنشاطك بهويتك أنت. ولم تُتح بعد. وتعرض صفحة داخل المحل نوع القطع التي قد تشملها حزمة لمقهى أو مطعم أو صالون. | The Store Kit is a set of pieces your store uses every day, such as aprons, menu boards, door mats, cups, QR stands and stamp cards, designed for your business in your own identity. It is not open yet. The In-store page shows the kind of pieces a kit for a café, a restaurant or a salon could include. |
| `faq.24q` | (new) | متى تُطلق حزمة المحل؟ | When does the Store Kit launch? |
| `faq.24a1` | (new) | لا يوجد موعد إطلاق بعد. انضم إلى قائمة الانتظار وسنراسلك عندما تُتاح. | There is no launch date yet. Join the waitlist and we will email you when it opens. |
| `faq.25q` | (new) | هل أقدر أطلب قطعًا حسب الطلب الآن؟ | Can I order custom pieces now? |
| `faq.25a1` | (new) | نعم. أنشئ حسابًا مجانيًا في بوابة العملاء (زر «اطلب عرض سعر» في صفحة داخل المحل)، وأخبرنا هناك بما تريد صنعه وأين سيُستخدم والتوقيت الذي تحتاجه. | Yes. Create a free account in the client portal (the Request a quote button on the In-store page) and tell us there what you want to make, where it will be used and your timing. |
| `faq.17a1` | صفحة خاصة بعملائنا على portal.crierstudio.com، نشارك فيها عملك وتقدر تراجعه. نفتح الحساب بعد الدفع. | صفحة خاصة بعملائنا على portal.crierstudio.com، نشارك فيها عملك وتقدر تراجعه. نفتح حساب الباقات بعد الدفع، ولتخبرنا بالقطع التي تحتاجها حسب الطلب يمكنك إنشاء حساب فيها بنفسك. | A private page for clients at portal.crierstudio.com, where we share your work and you can review it. Accounts for our packages are opened after you pay; to tell us about custom pieces, you can create an account there yourself. |
| `faq.26q` | (new) | من يصنع القطع؟ | Who makes the pieces? |
| `faq.26a1` | (new) | تصنعها ورشتنا الخاصة، ونفحص كل قطعة. | Our own workshop makes them, and we check every piece. |
| `is.h1a` | (new) | نصمّمها ونضع عليها هويتك | We design it, brand it |
| `is.h1b` | (new) | ونصنعها لك. | and make it. |
| `is.sub` | (new) | مرايل، ولوحات قوائم، وسجاد مدخل، وأكواب، وحوامل QR، وبطاقات أختام — كل قطعة في محلك، بهويتك. | Aprons, menu boards, door mats, cups, QR stands, stamp cards — every piece in your store, in your identity. |
| `is.cta1` | (new) | انضم إلى قائمة الانتظار | Join the waitlist |
| `is.cta2` | (new) | ماذا في الحزمة | What's in the kit |
| `is.p1n` | (new) | التصميم | Design |
| `is.p1tag` | (new) | مرسومة على المقاس | Drawn to size |
| `is.p1x` | (new) | نرسم كل قطعة لنشاطك: ما هي، وأين توضع، وما المقاس الذي تحتاجه. | We draw every piece for your business: what it is, where it sits, how big it needs to be. |
| `is.p1aria` | (new) | التصميم: رسومات تخطيطية لمريلة ولوحة قائمة وسجادة مدخل مع خطوط القياس | Design: outline drawings of an apron, a menu board and a door mat with measurement guides |
| `is.p2n` | (new) | الهوية | Brand |
| `is.p2x` | (new) | شعارك وألوانك وخطوطك على كل قطعة. بالعربية أو الإنجليزية أو الاثنتين. | Your logo, colours and type go on every piece. Arabic, English or both. |
| `is.p2aria` | (new) | الهوية: المريلة ولوحة القائمة وسجادة المدخل نفسها بألوان المقهى وشعاره | Brand: the same apron, menu board and door mat in the café's own colours and logo |
| `is.p3n` | (new) | التصنيع | Make |
| `is.p3tag` | (new) | ورشتنا | Our workshop |
| `is.p3x` | (new) | نصنعها في ورشتنا الخاصة، ونفحص كل قطعة. | We make it in our own workshop and check every piece. |
| `is.p3aria` | (new) | التصنيع: المريلة جاهزة بخياطتها وملصقها المنسوج، ولوحة القائمة في إطارها، وسجادة المدخل من ألياف جوز الهند | Make: the finished apron with stitching and a woven label, the framed menu board and the coir door mat |
| `is.foot` | (new) | المعروض: Karak House، مقهى وهمي. قطعك تحمل هويتك أنت. | Shown: Karak House, a fictional café. Your pieces carry your own identity. |
| `is.z.title` | (new) | ما يحتاجه محلك | What your store needs |
| `is.zone.cafe` | (new) | مقهى | Café |
| `is.zone.restaurant` | (new) | مطعم | Restaurant |
| `is.zone.salon` | (new) | صالون | Salon |
| `is.zone.abaya` | (new) | محل عبايات | Abaya shop |
| `is.col.door` | (new) | عند الباب | At the door |
| `is.col.wall` | (new) | على الجدار | On the wall |
| `is.col.counter` | (new) | على الكاونتر | On the counter |
| `is.col.team` | (new) | على فريقك | On your team |
| `is.z.cafe.door` | (new) | سجادة المدخل، ملصق الواجهة، لوحة مواعيد العمل | Entrance mat, window decal, opening-hours sign |
| `is.z.cafe.wall` | (new) | لوحة القائمة، لافتة جدارية، بطاقات الأسعار | Menu board, wall sign, price tags |
| `is.z.cafe.counter` | (new) | الأكواب وأغلفتها، بطاقات الأختام، حامل QR، ملصقات الأكياس | Cups and sleeves, stamp cards, QR stand, bag stickers |
| `is.z.cafe.team` | (new) | مرايل، قبعات، بطاقات أسماء | Aprons, caps, name badges |
| `is.z.restaurant.door` | (new) | سجادة الباب، ملصق الواجهة، لوحات الطاولات المحجوزة | Door mat, window decal, reserved signs |
| `is.z.restaurant.wall` | (new) | لوحة القائمة، لافتة جدارية | Menu board, wall sign |
| `is.z.restaurant.counter` | (new) | حوامل QR للطاولات، قوائم مطبوعة، ملصقات أكياس التوصيل | QR table tents, printed menus, delivery bag stickers |
| `is.z.restaurant.team` | (new) | مرايل، أزياء موحّدة، بطاقات أسماء | Aprons, uniforms, name badges |
| `is.z.salon.door` | (new) | سجادة الباب، ملصق الواجهة، لوحة مواعيد العمل | Door mat, window decal, hours sign |
| `is.z.salon.wall` | (new) | لوحة الخدمات، ملصقات المرايا | Service board, mirror decals |
| `is.z.salon.counter` | (new) | بطاقات المواعيد، حامل QR، ملصقات رفوف المنتجات | Appointment cards, QR stand, product shelf labels |
| `is.z.salon.team` | (new) | أغطية القص والمرايل، بطاقات أسماء | Capes and aprons, name badges |
| `is.z.abaya.door` | (new) | سجادة الباب، ملصق الواجهة | Door mat, window decal |
| `is.z.abaya.wall` | (new) | لافتة جدارية، لوحات المقاسات والتشكيلات | Wall sign, size and collection signs |
| `is.z.abaya.counter` | (new) | بطاقات التعليق، أكياس الملابس، مفرش الكاونتر، حامل QR | Hang tags, garment bags, counter mat, QR stand |
| `is.z.abaya.team` | (new) | بطاقات الموظفين، حقائب قماشية | Staff badges, tote bags |
| `is.kit.line` | (new) | مرايل ولوحات قوائم وسجاد مدخل وأكواب وحوامل QR — مصمّمة، وبهويتك، ومصنوعة. | Aprons, menu boards, door mats, cups, QR stands — designed, branded, made. |
| `is.kit.note` | (new) | القوائم تعرض نوع القطع التي قد تشملها الحزمة، ولا شيء نهائي بعد. | The lists show the kind of pieces a kit could include. Nothing is final yet. |
| `is.kit.cafe.n` | (new) | حزمة المحل للمقاهي | Café Store Kit |
| `is.kit.cafe.i1` | (new) | مرايل | Aprons |
| `is.kit.cafe.i2` | (new) | لوحة قائمة | Menu board |
| `is.kit.cafe.i3` | (new) | سجادة باب | Door mat |
| `is.kit.cafe.i4` | (new) | حامل QR | QR stand |
| `is.kit.cafe.i5` | (new) | بطاقات أختام | Stamp cards |
| `is.kit.cafe.i6` | (new) | أكواب | Cups |
| `is.kit.restaurant.n` | (new) | حزمة المحل للمطاعم | Restaurant Store Kit |
| `is.kit.restaurant.i1` | (new) | مرايل | Aprons |
| `is.kit.restaurant.i2` | (new) | لوحات قوائم | Menu boards |
| `is.kit.restaurant.i3` | (new) | سجادة باب | Door mat |
| `is.kit.restaurant.i4` | (new) | حوامل QR للطاولات | QR table tents |
| `is.kit.restaurant.i5` | (new) | قوائم طعام | Menus |
| `is.kit.salon.n` | (new) | حزمة المحل للصالونات | Salon Store Kit |
| `is.kit.salon.i1` | (new) | أغطية قص | Capes |
| `is.kit.salon.i2` | (new) | لوحة خدمات | Service board |
| `is.kit.salon.i3` | (new) | سجادة باب | Door mat |
| `is.kit.salon.i4` | (new) | حامل QR | QR stand |
| `is.kit.salon.i5` | (new) | بطاقات مواعيد | Appointment cards |
| `is.kit.salon.i6` | (new) | بطاقات أسماء | Name badges |
| `is.f.type` | (new) | نوع النشاط | Business type |
| `is.cc.other` | (new) | بلد آخر | Another country |
| `is.f.consent` | (new) | أوافق أن تستخدم Crier Studio هذه البيانات للتواصل معي بالبريد الإلكتروني بخصوص ما طلبته. | I agree that Crier Studio may use these details to contact me by email about what I asked for. |
| `is.f.nojs` | (new) | يحتاج هذا النموذج إلى JavaScript. ويمكنك أيضًا مراسلتنا على {email}. | This form needs JavaScript. You can also email us at {email}. |
| `is.wl.btn` | (new) | أخبروني عند فتح الطلبات | Tell me when it opens |
| `is.wl.ok` | (new) | أنت الآن في القائمة. سنراسلك عندما تُتاح حزمة المحل. | You're on the list. We email you when the Store Kit opens. |
| `is.c.eye` | (new) | حسب الطلب · متاح الآن | Custom · Open now |
| `is.c.name` | (new) | قطع حسب الطلب | Custom pieces |
| `is.c.title` | (new) | تحتاج شيئًا غير موجود في الحزمة؟ | Need something that isn't in the kit? |
| `is.c.intro` | (new) | تصميم مادي حسب الطلب لنشاطك. | Custom physical design for your business. |
| `is.q.btn` | (new) | اطلب عرض سعر | Request a quote |
| `is.c.acct` | (new) | أنشئ حسابًا مجانيًا وأخبرنا بما تحتاجه. | Create a free account and tell us what you need. |
| `is.c.login` | (new) | لديك حساب لدينا؟ سجّل الدخول | Already a client? Log in |
| `v.type` | (new) | اختر نوع نشاطك. | Choose your business type. |
| `v.country` | (new) | اختر بلدك. | Choose your country. |
| `v.email` | (new) | أدخل بريدك الإلكتروني حتى نردّ عليك. | Enter your email so we can reply. |
| `v.webBad` | (new) | أدخل موقعًا (مثل yourshop.com) أو حسابًا على إنستغرام (مثل @yourshop). | Enter a website (like yourshop.com) or an Instagram handle (like @yourshop). |
| `v.tooLong` | (new) | هذا النص طويل جدًا، اختصره من فضلك. | This is too long. Please shorten it. |
| `v.angle` | (new) | احذف الرمزين < و > من فضلك. | Please remove the < and > characters. |

Portal strings for the quote flow (uma-main branch `quote-signup`, `portal/public/i18n/en.json` + `ar.json`, all new):

| Key | AR | EN |
|---|---|---|
| `signup_closed` | التسجيل عبر الإنترنت غير متاح بعد. لطلب عرض سعر، راسلنا على {email} وسننشئ لك حسابًا. هل أنت عميل لدينا؟ سجّل الدخول أدناه. | Online sign-up is not open yet. To request a quote, email {email} and we will set up your account. Already a client? Sign in below. |
| `quote_create_account` | أنشئ حسابًا مجانيًا | Create a free account |
| `quote_signin_intro` | سجّل الدخول لطلب عرض سعر لقطع حسب الطلب. | Sign in to request a quote for custom pieces. |
| `quote_signup_intro` | أنشئ حسابًا مجانيًا وأخبرنا بما تحتاجه. | Create a free account and tell us what you need. |
| `quote_have_account` | لديك حساب بالفعل؟ سجّل الدخول | Already a client? Sign in |
| `nav_quote`, `qr_title` | اطلب عرض سعر | Request a quote |
| `qr_intro` | قطع حسب الطلب لنشاطك. أخبرنا بما تريد صنعه. | Custom pieces for your business. Tell us what you want to make. |
| `qr_form_h` | مشروعك | Your project |
| `qr_city` / `qr_country` | المدينة / البلد | City / Country |
| `qr_country_SA` / `_AE` / `_EG` / `_OTHER` | السعودية / الإمارات العربية المتحدة / مصر / بلد آخر | Saudi Arabia / United Arab Emirates / Egypt / Other |
| `qr_piece` | ما الذي تريد صنعه | What you want to make |
| `qr_placement` | أين ستُستخدم | Where it will be used |
| `qr_timing` | التوقيت | Timing |
| `qr_optional` | (اختياري) | (optional) |
| `qr_email_hint` | نستخدم هذا العنوان للتواصل معك. | We use this address to contact you. |
| `qr_images` | صور مرجعية | Reference images |
| `qr_images_rule` | حتى {n} صور بصيغة PNG أو JPG أو WebP، وبحد أقصى {mb} ميغابايت لكل صورة. | Up to {n} images: PNG, JPG or WebP, at most {mb} MB each. |
| `qr_images_failed` | تعذّر رفع بعض الصور، وقد نطلبها منك بالبريد الإلكتروني. | Some images could not be uploaded; we may ask you for them by email. |
| `qr_images_n` | الصور: {n} | Images: {n} |
| `qr_send` | أرسل الطلب | Send request |
| `qr_required` | أدخل اسم النشاط والمدينة وما تريد صنعه وبريدك الإلكتروني. | Fill in the business name, city, what you want to make and your email. |
| `qr_ok` | شكرًا. وصلنا طلبك. | Thanks. We have your request. |
| `qr_mine_h` | طلباتك | Your requests |
| `qr_none` | لا توجد طلبات بعد. | No requests yet. |
| `qr_status_new` / `seen` / `replied` / `closed` | أُرسل / اطّلعنا عليه / تم الرد / مغلق | Sent / Seen / Replied / Closed |
| `qr_home_link` | اطلب عرض سعر لقطع حسب الطلب | Request a quote for custom pieces |
| `err_invalid_country` | اختر البلد. | Choose a country. |

## 2. Redirects

| Old URL | New URL | In-repo now (GitHub Pages) | Cloudflare rule (section 3) |
|---|---|---|---|
| `/kit/` | `/social/` | noindex stub: canonical + `<noscript>` meta refresh + site.js `location.replace` (full query string kept, visitor's #hash kept) | Rule 1, 301 |
| `/ar/kit/` | `/ar/social/` | same | Rule 2, 301 |
| `/physical/` | `/in-store/#custom` | same; target hash `#custom` unless the visitor's URL already has one | Rule 3, 301 |
| `/ar/physical/` | `/ar/in-store/#custom` | same | Rule 4, 301 |
| `/snapshot/` | `/social/` (direct, no chain via /kit/) | same | Rule 1, 301 |
| `/ar/snapshot/` | `/ar/social/` | same | Rule 2, 301 |
| `/crier-deck/`, `/ar/crier-deck/` | `/brand-deck/`, `/ar/brand-deck/` | same (unchanged) | not part of this change |
| `/es/kit/`, `/fr/kit/`, `/es/snapshot/`, `/fr/snapshot/` | `/social/` | same (removed-language stubs go to English) | Rule 1, 301 |
| `/es/physical/`, `/fr/physical/` | `/in-store/#custom` | same | Rule 3, 301 |
| `/es/social/`, `/fr/social/`, `/es/in-store/`, `/fr/in-store/` | `/social/`, `/in-store/` | new stubs (every page has an es/fr stub) | none needed |

Order form links: `/kit/?product=kit#request` -> stub -> `/social/?product=kit#request`, and site.js selects The Social Kit for
`product=kit`, `product=social-kit` and `product=snapshot` (package id stays `kit`; checkout still sends `package: "kit"`).
Buy buttons now link straight to `/social/?product=<id>#request`. The 404 page links Home · Social · In-store · Pricing.

## 3. Cloudflare Redirect Rules (Adham, by hand; real 301s)

GitHub Pages cannot send a 301, so the stubs above keep working until (and after) you add these. Four rules cover everything
(the free plan allows 10 Redirect Rules).

Cloudflare dashboard > crierstudio.com > Rules > Redirect Rules > Create rule. For each rule: "Custom filter expression",
click "Edit expression", paste the expression; Then: Type **Static**, URL as below, Status code **301**,
**Preserve query string: on**. Deploy.

1. Name `Social Kit: kit + snapshot`
   Expression: `(http.request.uri.path in {"/kit" "/kit/" "/kit/index.html" "/snapshot" "/snapshot/" "/snapshot/index.html" "/es/kit/" "/fr/kit/" "/es/snapshot/" "/fr/snapshot/"})`
   URL: `https://crierstudio.com/social/`
2. Name `Social Kit AR`
   Expression: `(http.request.uri.path in {"/ar/kit" "/ar/kit/" "/ar/kit/index.html" "/ar/snapshot" "/ar/snapshot/" "/ar/snapshot/index.html"})`
   URL: `https://crierstudio.com/ar/social/`
3. Name `Physical to Custom pieces`
   Expression: `(http.request.uri.path in {"/physical" "/physical/" "/physical/index.html" "/es/physical/" "/fr/physical/"})`
   URL: `https://crierstudio.com/in-store/#custom`
4. Name `Physical to Custom pieces AR`
   Expression: `(http.request.uri.path in {"/ar/physical" "/ar/physical/" "/ar/physical/index.html"})`
   URL: `https://crierstudio.com/ar/in-store/#custom`

Check after deploying: `curl -sI "https://crierstudio.com/kit/?product=kit"` should show `301` and
`location: https://crierstudio.com/social/?product=kit`; open `https://crierstudio.com/kit/?product=kit#request` in a browser and
confirm The Social Kit is selected in the form. For rules 3 and 4 check `curl -sI "https://crierstudio.com/physical/?a=1"`:
if Cloudflare puts the query after the fragment (`…/in-store/#custom?a=1`), switch "Preserve query string" off for rules 3
and 4 (no query matters on /physical/). A server redirect's `#custom` replaces a visitor's own #hash; the in-repo stub keeps the
visitor's hash instead.

## 4. Forms: the waitlist -> the Launchpad intake (no CRM change); quotes -> the client portal

Update 2026-10-18 (Adham): people sign up for a client portal account before they request a Custom pieces quote. The site's
quote form (which went to the CRM intake and lost most fields) is removed; quotes no longer go to the CRM. In `#custom` the
"Request a quote" button opens `https://portal.crierstudio.com/#/signup?intent=quote&lang=en` (`lang=ar` on /ar/in-store/), with
the line "Create a free account and tell us what you need." and "Already a client? Log in" ->
`https://portal.crierstudio.com/#/login?intent=quote&lang=<en|ar>`. The portal stores every field (business, city, country
SA/AE/EG/Other, what, where, timing, email, up to 3 reference images), shows the client their requests with a status, and gives
the owner a "Quotes & sign-ups" page plus a read-only feed for the monitoring bot (uma-main `portal/PORTAL-API.md`, "Custom pieces
quotes"). Plain links: the CSP needs no change. Deploy the portal first (with `ALLOW_PUBLIC_SIGNUP=1`), then the site.

The waitlist form POSTs JSON to `https://crm-production-d789.up.railway.app/api/public/snapshot-request` from site.js (same endpoint and
CSP as the order form); its fields and payload are unchanged. Client-side rules mirror `web_public.py`: required fields, length caps, website or @handle, e-mail
pattern, no `<` `>`. A 422 marks the field it names (in the page's language); 429 shows "too many tries". Without JavaScript the
submit buttons stay disabled and a `<noscript>` line gives team@crierstudio.com (mailto only inside noscript).

Store Kit waitlist (`#waitlist`):

| Form field | Sent as | Stored by the intake today |
|---|---|---|
| Instagram or website (required, max 98) | `web`; also `business` = `[Store Kit waitlist] ` + web (max 120) | yes (lead name = the business string) |
| Email | `email` | yes |
| Business type (Café / Restaurant / Salon / Abaya shop / Other) | `industry` = "Cafés and dessert shops" / "Restaurants" / "Salons" / "Abayas and fashion" / "Other local business" | yes |
| Country (SA / AE / EG / other) | `city` = "Saudi Arabia" / "UAE" / "Egypt" / "Other country"; `country` = SA/AE/EG/other | city yes; `country` DROPPED |
| Consent checkbox | `consent: true` | yes, but see below |
| (fixed) | `product: "snapshot"`, `lang`, `form: "store_waitlist"`, honeypot `company_website` | `form` DROPPED |

(The Custom pieces quote mapping that was here is gone with the form: quotes are stored by the portal, field for field.)

Know before launch:
- The intake stored the consent as "… to prepare and email the free snapshot." Fixed on the Launchpad branch
  `social-kit-rename` (section 9): it now stores "Agreed on crierstudio.com that Crier Studio may use these details to contact
  them by email about what they asked for.", matching the page's consent line. Deploy the Launchpad for it to take effect.
- Every waitlist submission becomes a lead + a "Snapshot requested" deal and pings you with business + city; it carries the
  `[Store Kit waitlist]` tag in the business name.
- Same e-mail within 24 h is stored once (silently). 5 requests per IP per hour, shared with the order form.
- No WhatsApp field anywhere (Decision 1). Reference images: the portal quote page now takes up to 3 (PNG/JPG/WebP, 5 MB each,
  seen by the owner only); this replaces "no photo upload" (Decision 6) for quotes, by the 2026-10-18 brief.

## 5. [BRACKET]s: none left

Update 2026-10-18 (Adham: the Store Kit promises nothing): none left. The 34 bundle-quantity brackets (`is.kit.*.i*`, EN + AR)
are now plain item names, and the portal's `qr_ok` ("… within [X] business days") is now "Thanks. We have your request." /
"شكرًا. وصلنا طلبك." with no reply time. `build/check.mjs` now fails the build if the visible text of /in-store/, home, /pricing/
or /faq/ (EN + AR) has any `[…]`; the portal test `quotes.test.cjs` fails if a quote-page string has `[`, a reply time or "quoted
per project".

## 6. "Coming soon" per page (visible text, EN "coming soon" / AR "قريبًا")

| Page | EN | AR |
|---|---|---|
| / | 1 | 1 |
| /social/ | 2 | 2 |
| /in-store/ | 1 | 1 |
| /pricing/ | 6 | 6 |
| /faq/ | 5 | 5 |
| /samples/ | 2 | 2 |
| /brand-deck/ | 15 | 15 |
| /about/ | 0 | 0 |

/in-store/: once (the eyebrow pill), never in the H1. Home: once (the Store Kit card, where the price sits; the home teaser has
no pill). /pricing/: the Store Kit card adds one; the rest is the existing Brand Deck section (left as it was, conflict noted).
/faq/: the new CTA "Brand Deck — coming soon" adds one; the other mentions are the existing Brand Deck answers. /social/: both
are the existing Brand Deck option and note in the order form (unchanged). /samples/ and /brand-deck/ are unchanged.
None of the new Store Kit / Custom pieces copy says "coming soon" outside the /in-store/ pill and the two Store Kit cards.

## 7. uma-main and Launchpad

uma-main (`social-kit-rename`, worktree `uma-social-kit`), display strings only:
- `portal/lib/pricing.json`: kit `name` "The Complete Kit" -> "The Social Kit". Ids, prices, currencies, VAT unchanged.
  `mena-batch/app/core/local-price.mjs` reads this file directly (no copy, no name check): nothing to change.
- Site copy `data/pricing.json` regenerated with `node portal/scripts/publish-pricing.cjs --site ../crierstudio-site` (new name +
  new `generated_from` sha256; nothing else changed).
- Renamed (client-facing): `portal/public/i18n/en.json` + `ar.json` keys `plan_pkg_kit`, `plan_kit_included`, `plan_addon_kit`,
  `product_kit`, `order_product_kit`, `kind_name_kit`, `gift_item_kit`, `gift_name_kit`, `yw_d_kit` -> "The Social Kit" / "Social
  Kit" / "a Social Kit" (en) and "حزمة السوشيال ميديا" (ar; it was Latin "The Complete Kit" in 8 of the 9 ar keys).
  `lib/owner.cjs` owner board folder line "The Complete Kit (N parts)" -> "The Social Kit (N parts)" (it mirrors the client's
  folder name). `portal/TRANSLATIONS.md` note.
- Arabic grammar to check: the delivery e-mail subject is `"{title} الخاص بك جاهز"`, so it reads "حزمة السوشيال ميديا الخاص بك
  جاهز" (feminine noun, masculine adjective). The template is shared by every kind and already mismatched for others (الحملة،
  مراجعة الأداء); fix it in the template if you want ("… جاهزة" needs per-kind gender).
- Left as they are (owner-only, or read by several run paths; listed so you can decide): `lib/plans.cjs` service label
  "Complete Kit included in month 1" (51, 80), add-on label "The Complete Kit" (97), kind label "Complete Kit" (266);
  `lib/owner.cjs` `GEN_BUTTONS` "Send Complete Kit" and the status lines built from the kind label ("Queued: Complete Kit …");
  `lib/required-inputs.json` product name "The Complete Kit" (owner "N things to upload before … can start"; the same text is in
  Launchpad `client_jobs.PRODUCT_NAMES` and `_uma.html`); code comments; `PORTAL-API.md`; owner-side tests asserting those
  strings (unchanged, still valid).
- Test expectations updated (not run): `owner.test.cjs` (summary, paid line, delivery mail subject), `owner-ui.test.cjs`,
  `home-todo-ui.test.cjs`, `client-nav-ui.test.cjs`, `your-work-ui.test.cjs`, `your-work.test.cjs`.

Launchpad (`social-kit-rename`, worktree `fb-social-kit`):
- `crm/launchpad_crm/launchpad/docs/pricing.json`: the same one-line change; `git diff --no-index` against the master shows no
  difference (byte-identical).
- Stripe: `checkout.py` builds the Checkout line item with inline `price_data.product_data.name` = this name
  (+ " · Instagram"), so new Checkout sessions show "The Social Kit" automatically. No Stripe Price/Product ids are used for the
  packages (`payment-links.json` is empty), so there is nothing to rename in the Stripe dashboard. Sessions and receipts made
  before the change keep the old name. The "New paid customer" My Work note uses the same name.
- Renamed owner screens that sit next to that name: `ceo.py` `PKG_LABELS` "Social Kit ($29)" (key `kit` unchanged),
  `uma_funnel.py` Mark-paid error, `_uma_funnel.html` hint, `_uma_leads_top.html` lead form option (value `snapshot` unchanged),
  `static/lp-research.js` option text (value `kit` unchanged).
- Left: `client_jobs.PRODUCT_NAMES` and `_uma.html` paused line (mirror the portal's required-inputs name), `static/lp-simple.js`
  `KIND_WORDS` (mirrors the portal kind label), docs (`STRIPE.md`, `UMA-API.md`, `HANDBOOK.md`, `launch/*.md`), test fixtures
  that hold portal API data.
- Tests updated (not run): `test_launchpad_ceo.py`, `test_launchpad_stripe.py`, `test_launchpad_uma_funnel.py`.
- Not mine and not committed: `worker_bundles/windows/scripts/keep-worker-running.vbs` was already modified in that worktree.

## 8. Things I decided (change any of them)

- Screenshots of /, /social/, /pricing/, /in-store/ at 1280 and 390 were NOT made: they need a local server and a headless
  browser, and this run was limited to git/node/python build commands. To make them: `python -m http.server 8767 --bind
  127.0.0.1` in the repo, then open each page at 1280 px and 390 px wide (browser dev tools device mode) and capture.
- Not verified in a browser at all: the hero at ≥960 px against the comp, the 760–959 and phone layouts, the zone tabs, the
  waitlist form against the live intake (no live POST was made, as instructed), the portal sign-up → quote flow, RTL rendering.
- Copy not given in the brief, written by me: zones heading "What your store needs" / "ما يحتاجه محلك"; the waitlist heading
  reuses "Join the waitlist"; the Store Kit section lead reuses the pricing card line; field label "Business type";
  validation messages; the waitlist consent line; the noscript line; the four FAQ answers (25 rewritten for the portal on
  2026-10-18, and 17 adjusted); meta titles/descriptions; the AR translation of everything, including "لديك حساب لدينا؟ سجّل الدخول".
- "Create a free account" contains "free", which `build/check.mjs` bans in visible text (no free offers). The check now lets
  exactly "free account" / "حسابًا مجانيًا" through (the brief's own line, now "Create a free account and tell us what you
  need."); every other "free" still fails the build.
- Promise nothing (2026-10-18), my calls: I read "delivery promise" as covering "delivered to your door", so it is gone from
  `is.sub`, `is.p3x`, `faq.23a1` and `faq.26a1`; `studio.copy.068` no longer says cost and delivery are confirmed (now "Nothing is
  made or charged until you agree to it."); `physical.scope` no longer says "we … quote it separately"; `meta.d.in-store` and
  `faq.17a1` say "tell us about custom pieces" instead of "request a quote". The bundle cards keep one item per line (not a
  "·" row). The portal's `qr_email_hint` "We reply to this address." became "We use this address to contact you." (no reply
  promise). Left as they are: `faq.15a1` (Social Kit timing, "We confirm the timing by email when we reply"), the portal's
  `request_sent` ("We will reply in Messages", the client-requests page, not quotes) and `signup_closed` ("email {email} and we
  will set up your account").
- `build/check.mjs` new checks: /in-store/ (EN + AR) has no `[…]` and no "launch price", "to your door" / "we deliver" /
  "delivered to", "quoted per" or "business days" (EN + AR forms) in visible text ("delivery bag stickers" is a product, so a
  bare "deliver" is allowed); home, /pricing/ and /faq/ have no `[…]`; no page says "launch price"; no page (nor
  404.html) has "snapshot" / "سنابشوت" / "سناب شوت" in visible text, meta or JSON-LD (URLs excluded).
- Not changed, worth a look: `terms.acct.p` still reads "If we open a client portal account for you …" (accounts can now also
  be self-created for quotes); legal text, so I left it for you.
- The H1 is split into two keys (`is.h1a` / `is.h1b`) so the line break matches the comp ("We design it, brand it" / "and make
  it."). AR uses the feminine plural (the pieces): "نصمّمها ونضع عليها هويتك / ونصنعها لك."
- Home order: hero → businesses → seasons → In-store teaser → four packages → good to know (the brief's architecture did not
  mention seasons; I kept it with the social content). The teaser has no "Coming soon" pill (the Store Kit card carries the one
  mention) and no sub-paragraph (compact: headline, 3 panels, waitlist button + "What's in the kit").
- "Four packages" heading on home and /pricing/ (The Store Kit counted as the fourth).
- Abaya shop: chip and zone built; no "Abaya Shop Store Kit" card (no contents given, Decision 3).
- Custom pieces eyebrow is "Custom · Open now" as briefed; the name "Custom pieces" appears in the FAQ, meta and JSON-LD.
- Contrast on cream: #8d8a7e (~3.2:1) is used only for input borders and inside the illustrations; small labels use #6c6a60
  (the comp's eyebrow colour, 4.8:1 on #f3f1ea) and the small terracotta numbers/labels use #b4492a (5:1) instead of the comp's
  #c4512f (4.4:1). The SVG drawings keep the comp's colours.
- Without JavaScript the zone chips are hidden and all four zones are listed with their names.
- `meta.d.about` now uses the descriptor; `about.lead` is unchanged.
- `build/check.mjs`: the hreflang count was still 5 (four languages) since Spanish and French were removed, so it failed on main
  already; it now expects languages + x-default. New checks: footer keeps every destination, no "Complete Kit" anywhere, Store
  Kit cards have no price/buy button, /in-store/ has its sections and forms and exactly one "coming soon".
- `design/` and this file are excluded from GitHub Pages (`_config.yml`).
- Removed i18n keys (no longer used): `nav.kit`, `meta.t.kit`, `meta.d.kit`, `nav.physical`, `meta.t.physical`,
  `meta.d.physical`, `physical.title`, `physical.lead`, `physical.work`, `studio.copy.067` (the old mailto button), `deck.cta`.

## 9. Snapshot wording (Adham 2026-10-18: no "free snapshot" anywhere)

Display copy only. Ids, keys, kinds, DB values, the product value `"snapshot"`, the API route
`/api/public/snapshot-request`, the `/snapshot/` redirect stubs and `BRAND.snapshotUrl` are unchanged.

Site (`instore-restructure`):
- Swept `i18n/en.json`, `i18n/ar.json`, `templates/`, `site.js`, `build/build.mjs` and the built pages (every `index.html`,
  `404.html`) for snapshot / Snapshot / سنابشوت / سناب شوت / free snapshot: no visible copy had it any more. The only hits are the
  intake URL in `data-endpoint` (attribute), the product value `"snapshot"` and code comments in `site.js` / `build.mjs`, and
  the redirect-stub folders. Nothing to replace.
- New check in `build/check.mjs`: no built page (40 pages + 404.html) has "snapshot" (any case), سنابشوت or سناب شوت in visible
  text, meta tags or JSON-LD (URLs excluded). The old case-sensitive `/Snapshot/` "retired wording" check stays too.

Portal (uma-main `quote-signup`): the client-facing name of the `snapshot` kind (the short business report PDF made by local
models) is now "Business report" / "تقرير النشاط":

| Key | Old EN | New EN | Old AR | New AR |
|---|---|---|---|---|
| `order_product_snapshot` | Snapshot | Business report | Snapshot | تقرير النشاط |
| `product_snapshot` | Snapshot | Business report | تقرير Snapshot | تقرير النشاط |
| `plan_pkg_snapshot` | Snapshot | Business report | Snapshot | تقرير النشاط |
| `plan_addon_snapshot_pdf` | Snapshot PDF | Business report PDF | Snapshot بصيغة PDF | تقرير النشاط بصيغة PDF |
| `gift_item_snapshot` (gift e-mail + banner) | a Snapshot PDF | a business report PDF | ملف Snapshot بصيغة PDF | ملف تقرير النشاط بصيغة PDF |
| `gift_name_snapshot` | Snapshot PDF | Business report PDF | ملف Snapshot بصيغة PDF | ملف تقرير النشاط بصيغة PDF |
| `yw_d_snapshot` | Snapshot | Business report | لمحة سريعة | تقرير النشاط |
| `client_lang_text` | … reports, the Snapshot and posts. … | … reports and posts. … | … التقارير وتقرير Snapshot والمنشورات. … | … التقارير والمنشورات. … |

- `lib/owner.cjs` `LEGACY_KIND_LABEL.snapshot` "Snapshot (PDF)" -> "Business report (PDF)": it is the fallback title of the
  client's delivery e-mail ("Your {title} is ready"; there is no `kind_name_snapshot`), the order's package line the client sees,
  and the owner's labels.
- No "free" offer was left in client strings: the only "free" is "Create a free account" (the account, not an offer).
  `get_snapshot` (key) already reads "See plans" / "اطّلع على الباقات".
- Test expectation updated (not run): `test/work-ui.test.cjs` tracker title "working on your Business report".
- Left (owner-only or not shown to clients), listed for you: `lib/owner.cjs` comment and `COST_LINE` (`snapshot` key);
  `lib/required-inputs.json` `_note` ("The free Snapshot for leads is not a paid product …", a maintainer note);
  `lib/pricing.json` legacy package `"name": "Snapshot only"` (legacy, not sold; editing it changes the sha256 that the site's
  `data/pricing.json` is checked against, so it needs a re-publish — left for you); code comments in `lib/app.cjs`,
  `lib/feedback.cjs`, tests; docs `PORTAL-API.md`, `CHECKLIST-PORTAL.md`, `REPORT-PORTAL.md`; the `snapshots` table and API route.

Launchpad (`social-kit-rename`, worktree `fb-social-kit`):
- `crm/launchpad_crm/launchpad/web_public.py` `CONSENT_TEXT` (stored with every intake lead and shown in the owner ping):
  "Agreed on crierstudio.com that Crier Studio may use these details to prepare and email the free snapshot." -> "Agreed on
  crierstudio.com that Crier Studio may use these details to contact them by email about what they asked for." No test
  asserted the old text (searched every `test_*.py`), so no test changed. Nothing else in the CRM changed.
- Left (owner-only), listed for you: `web_public.py` deal notes "crierstudio.com: free snapshot, then the one-time Plan." (line
  179), the "Snapshot requested" deal name, `uma_funnel.py` `CONSENT_TEXT_VERSION` "crierstudio.com snapshot form, 2026-10-01"
  (a version id), the `_uma_leads_top.html` option value `snapshot`.
