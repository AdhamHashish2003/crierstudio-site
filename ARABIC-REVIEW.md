# Arabic copy: lines to double-check (2026-10-30)

All Arabic strings in `i18n/ar.json` were rewritten in light, friendly Modern Standard Arabic, with a few common Gulf/Egyptian words where they read naturally (منيو، بدري، الصبح، كرك). These are the lines I am less sure about. Each has an English gloss; please have a native speaker read them.

| Key | Arabic | English gloss | Why I'm unsure |
|---|---|---|---|
| `home.h1` | عرّفنا على مشروعك، ونصمّم لك منشورات السوشيال ميديا. | Introduce us to your business, and we design your social media posts. | "عرّفنا على" is friendly and neutral. An alternative is "أخبرنا عن مشروعك". |
| `foot.blurb` | منشورات سوشيال ميديا للمشاريع المحلية، نصمّمها على مقاس ما تخبرنا به عن مشروعك. | Social media posts for local businesses, designed to fit what you tell us about your business. | "على مقاس" (tailored to) is a figure of speech. It may feel a bit casual for a footer. |
| `nav.instore` | للمحل | For the shop | Replaces "داخل المحل" (inside the shop). It is shorter, but on its own as a menu item it may be unclear. |
| `nav.social` | السوشيال ميديا | Social media | Was "السوشيال". Now the full phrase. |
| `wt.big` | لا يُنشر شيء قبل موافقتك. | Nothing gets posted before you agree. | The meaning is right. Check the tone. |
| `dash.reviewPostTitle` | معمول التمر، طازج من ٧ الصبح | Date maamoul, fresh from 7 am | "الصبح" is colloquial (Egypt and the Levant). "صباحًا" is more neutral. English says "date rolls". |
| `dash.caption` | معمول التمر خارج من الفرن الساعة ٧ الصبح. تعال بدري، يخلص بسرعة. | Date maamoul straight from the oven at 7 am. Come early, it sells out fast. | Written on purpose as a casual Gulf/Egyptian Instagram caption ("بدري"، "يخلص"). |
| `dash.reviewNote` | رائع لزبائن الصباح. | Great for the morning customers. | Short. Check it sounds like a real client note. |
| `dash.changeText` | ممكن عنوان أوضح؟ | Could we have a clearer headline? | Conversational client request. |
| `dash.markPosted` | تم النشر | Posted | The button label ("Mark as posted") now matches the "Posted" status. "علّمه كمنشور" would be more literal. |
| `dash.typeCarousel` | منشور صور متعددة | Multi-image post | Many Arabic users simply say "كاروسيل". |
| `hero.ig.p4s` | من فرننا | From our oven | Short and friendly. Check it suits a café. |
| `hero.ig.p6s` | يكفي الطاولة كلها | Enough for the whole table | Casual. |
| `pkg.kit.eye` | البداية | The start | Was "أساسك" (your foundation). |
| `pkg.visible.eye` | منشورات كل شهر | Posts every month | Plain description instead of "your monthly rhythm". |
| `pkg.growing.eye` | نموّك كل شهر | Your growth every month | Close to the plan name "نمو مستمر". |
| `pkg.kit.f3` / `terms.offer.p1` | موقع علامتك، وتصوّر لجمهورك | Your brand's position, and a picture of your audience | Renders "positioning, audience hypotheses". It may need a marketing-native term (e.g. "التموضع"). |
| `pkg.kit.f4` | أسلوب الكلام | Way of speaking (voice) | Renders "voice guidelines". "نبرة العلامة" is the usual term. |
| `is.z.salon.team`, `is.kit.salon.i1` | أرواب | Robes / capes | Salon capes. Some regions say "مريول" or "كاب". |
| `is.pc.mat` and others | دواسة باب / دواسة مدخل | Door mat | Was "سجادة باب". "دواسة" is common in the Gulf and Egypt. Check it reads well everywhere. |
| `is.foot` | مقهى غير حقيقي للتوضيح | A not-real café, for illustration | Means "fictional". "مقهى خيالي" is shorter. |
| `sc.renders` | الصور تصاميم تخيّلية. | The images are imagined designs. | Renders "concept renders" (hidden Sculptures page). |
| `sc.ink` | داكن | Dark | Colour name for "Ink". |
| `sc.voiceLine` | واضح وواثق، مثل منادي المدينة. | Clear and confident, like the town crier. | Wordplay on "Crier". May not land in Arabic. |
| `consent.decline` | لا، شكرًا | No, thanks | Friendlier than "رفض". `privacy.ga.p2` now says "إذا رفضت". |
| `faq.18q` / `faq.18a1` | هل Crier Studio شركة مسجّلة؟ / ليس بعد… | Is Crier Studio a registered company? / Not yet… | Kept, because the task only removed the standalone footer/About line. Remove both languages if the FAQ entry should go too. |
| `leg.conv` | هذه الترجمة للتسهيل فقط، والنسخة الإنجليزية هي المعتمدة. | This translation is for convenience only; the English version governs. | Legal wording. Please confirm. |
| `privacy.law.p` | المرسوم بقانون اتحادي رقم 45 لسنة 2021 بشأن حماية البيانات الشخصية | UAE Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data | The official law titles should be checked against the official Arabic names. |

## Landing C "Step-through" (2026-11-11): new and changed lines

Written in plain Modern Standard Arabic (the owner asked for MSA for the Gulf and Egypt). Most older lines on the same pages are Egyptian colloquial (احكيلنا، بنشتغل إزاي، تمام), so the page now mixes the two registers: a native speaker should decide whether to align them.

| Key | Arabic | English gloss | Why I'm unsure |
|---|---|---|---|
| `wt.1t` / `wt.1x` | أنشئ حسابك. / اكتب اسم مشروعك وموقعك أو حسابك على إنستجرام. | Create your account. / Type your business name and your website or Instagram. | MSA next to the Egyptian step titles around it. |
| `wt.5t` / `wt.5x` | المنشور جاهز. وأنت تنشره على إنستجرام. / … تنسخ النص وتحمّل المنشور وتنشره على حسابك في إنستجرام. | The post is ready. You share it on Instagram. | Must not suggest that the studio posts. Check "وأنت تنشره". |
| `wt.5screen` | تمام · جاهز · نشرته على إنستجرام | Approved · Ready · Shared on your Instagram | Mixes the portal's own status words with a sentence. |
| `dash.greet`, `dash.brand` | مساء الخير / مثال | Good afternoon / Example | "مثال" as the example client's name. |
| `st.type.*`, `st.f.*` | محل أو مكان يزوره الناس / منتجات على الإنترنت / خدمة أو تطبيق أو موقع | Shop or place people visit / Online products / Service, app or website | Should match the portal's own wording for the business type question. |
| `st.wall.h2`, `st.wall.cap` | ابحث عن نوع مشروعك / منشورات على سبيل المثال. كل مشروع يحصل على منشورات بهويته الخاصة. | Find your kind of business / Example posts. Each business gets posts in its own brand. | "بهويته" for "in its own brand". |
| `st.ok.x` | كل منشور ينتظر في صفحتك حتى توافق عليه، ثم تنشره أنت بنفسك على حسابك. | Every post waits in your client page until you say OK. Then you share it yourself. | Tone. |
| `st.kit.bb` | دليل الهوية | Brand book | The table still says "دليل البراند" (`la.t.bb`). Pick one. |
| `ex.k.*` | مقهى، مخبز، عيادة أسنان، صالون تجميل، نادٍ رياضي … | Business types under the example posts | "نادٍ رياضي" (gym) vs "جيم"; "دروس خصوصية" (tutoring). |
| Arabic tiles in `data/example-posts.json` | قبل موعدك، خبز اليوم، تشكيلة الخريف، غسيل وتلميع، احجز في ثلاث خطوات، لظهر أكثر راحة، روتين المساء، ركن القراءة، الرياضيات صعبة؟ | The Arabic example posts (both language pages show them in Arabic) | Written as short social-media posts. |
