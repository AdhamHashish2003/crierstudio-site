// "How it works" video stage: builds the scene for ?lang=ar|en & size=desk|phone and exposes window.seek(seconds).
// Nothing here runs on a clock: every style is computed from the time passed to seek(), so a renderer can step frame by frame.
(() => {
  const q = new URLSearchParams(location.search);
  const lang = q.get('lang') === 'en' ? 'en' : 'ar', size = q.get('size') === 'phone' ? 'phone' : 'desk';
  const ar = lang === 'ar', rtl = ar;
  document.documentElement.lang = lang; document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  document.body.lang = lang; document.body.className = size;

  // ---- the five steps (seconds) ----
  const S = [0, 5.6, 12.2, 17.6, 23.6], END = 29.2;
  window.STEPS = S; window.DURATION = END;

  const T = ar ? {
    ex: 'مثال', money: n => n + ' ج.م', per: 'شهريًا',
    capL: ['الباقة', 'الدفع', 'مشروعك', 'المراجعة', 'النشر'],
    cap: ['اختر باقتك واضغط «اشترك عبر واتساب».', 'تصلك بيانات الدفع على واتساب. ادفع عبر InstaPay وأرسل الإيصال.', 'أخبرنا عن مشروعك في حسابك.', 'تصلك أول المنشورات. وافق عليها أو اطلب تعديلًا.', 'ننشر لك ونرد على التعليقات والرسائل.'],
    siteH: 'أربع باقات بأسعار واضحة', sub: 'اشترك عبر واتساب',
    pk: [['البرونزية', '2,500', '4 منشورات + 2 ريلز'], ['الفضية', '3,500', '7 منشورات + 3 ريلز'], ['الذهبية', '5,000', '12 منشورًا + 5 ريلز'], ['الماسية', '6,500', '15 منشورًا + 8 ريلز']],
    waSub: 'حساب تجاري', today: 'اليوم', ph: 'اكتب رسالة',
    m1: 'مرحبًا Crier Studio، أريد الاشتراك في الباقة الفضية (3,500 ج.م شهريًا). ما تفاصيل الدفع؟', // the site's own prefilled text (pay.wa.msg)
    greet: 'أهلاً بك في Crier Studio 👋\nشكرًا لاهتمامك بالاشتراك. إليك بيانات الدفع.\n\n<b>الباقات الشهرية:</b>\n🥉 البرونزية: 2,500 ج.م (4 منشورات + 2 ريلز)\n🥈 الفضية: 3,500 ج.م (7 منشورات + 3 ريلز)\n🥇 الذهبية: 5,000 ج.م (12 منشورًا + 5 ريلز)\n💎 الماسية: 6,500 ج.م (15 منشورًا + 8 ريلز)\n\nادفع قيمة اشتراكك عبر InstaPay إلى: <span class="blur">example@instapay</span>\n\nبعد الدفع، أرسل لنا هنا:\n1. صورة إيصال التحويل\n2. بريدك الإلكتروني المسجّل، أو اسم مشروعك\n\nسنراجع الدفع ونرد عليك هنا.',
    rc: 'إيصال تحويل', biz: 'شُرفة للقهوة',
    got: 'وصلنا الإيصال، شكرًا لك 🙏\nسنتأكد من التحويل ونرد عليك هنا فور تأكيده.',
    paid: 'تم تأكيد الدفع ✅\nحسابك جاهز: أكمل بيانات مشروعك.',
    bfH: 'أخبرنا عن مشروعك', bfSub: 'أسئلة قليلة، في 5 دقائق تقريبًا.',
    f1: 'اسم المشروع', f2: 'المجال', f3: 'أين ننشر لك؟', f4: 'لغة المحتوى',
    inds: ['مقهى', 'مطعم', 'عيادة', 'متجر'], langs: ['العربية', 'الإنجليزية'], send: 'إرسال',
    doneH: 'وصلتنا إجاباتك', doneX: 'نبدأ تصميم منشوراتك.',
    hmH: 'منشوراتك الأولى جاهزة', hmSub: 'راجعها، ثم وافق عليها أو اطلب تعديلًا.',
    wait: n => n + ' بانتظار مراجعتك', pend: 'بانتظار موافقتك', okd: 'تمت الموافقة', sched: 'مجدول للنشر',
    post: 'منشور', reel: 'ريلز', date: d => d + ' نوفمبر',
    posts: [['cafe-01-offer-ar', 'لاتيه مثلّج مع فطيرة التمر', 0, 18, 100], ['cafe-05-tips-ar', 'كيف تختار قهوتك؟', 0, 20, 100], ['cafe-03-place-ar', 'طاولتك تنتظرك', 0, 23, 100], ['cafe-09-reel-ar', 'قهوة على الطريقة المصرية', 1, 26, 70]],
    changes: 'اطلب تعديلات', approve: 'وافق',
    bn: ['الرئيسية', 'المنشورات', 'التقويم', 'الرسائل', 'المزيد'],
    igT: 'منشورات', igName: 'شُرفة', igAv: 'ش', toast: 'تم النشر', likes: n => n + ' إعجابًا',
    // no opening times or hours in any text here (owner 2026-11-15)
    igCap: 'لاتيه مثلّج مع فطيرة التمر.',
    c1u: 'ضيف', c1: 'يبدو لذيذًا. كم السعر؟', c2: '95 ج.م مع فطيرة التمر.', replied: 'تم الرد',
    co1k: 'باقتك', co1h: 'الباقة الفضية',
    co2k: 'الدفع عبر InstaPay', co2: [['عنوان InstaPay', 'يصلك على واتساب'], ['صورة الإيصال', 'ترسلها في المحادثة'], ['اسم مشروعك', 'لنربط الدفع بحسابك']],
    co3k: 'في حسابك', co3: [['المجال', 'مقهى'], ['المنصات', 'Instagram وFacebook'], ['اللغة', 'العربية']],
    co4k: 'أول المنشورات',
    co5k: 'ننشر ونرد', co5: [['تم النشر', 'على Instagram'], ['تعليق جديد', 'تم الرد'], ['رسالة جديدة', 'تم الرد']],
  } : {
    ex: 'Example', money: n => 'EGP ' + n, per: 'a month',
    capL: ['Package', 'Payment', 'Your business', 'Review', 'Publishing'],
    cap: ['Choose your package and tap “Subscribe on WhatsApp”.', 'Get the payment details on WhatsApp. Pay by InstaPay and send the receipt.', 'Tell us about your business in your account.', 'Your first posts arrive. Approve them or ask for a change.', 'We publish for you and reply to comments and messages.'],
    siteH: 'Four packages, clear prices', sub: 'Subscribe on WhatsApp',
    pk: [['Bronze', '2,500', '4 posts + 2 reels'], ['Silver', '3,500', '7 posts + 3 reels'], ['Gold', '5,000', '12 posts + 5 reels'], ['Diamond', '6,500', '15 posts + 8 reels']],
    waSub: 'Business account', today: 'Today', ph: 'Message',
    m1: 'Hi Crier Studio, I’d like to subscribe to Silver (EGP 3,500 a month). Could you send me the payment details?',
    greet: 'Welcome to Crier Studio 👋\nThank you for your interest in subscribing. Here are the payment details.\n\n<b>Monthly plans:</b>\n🥉 Bronze: 2,500 EGP (4 posts + 2 reels)\n🥈 Silver: 3,500 EGP (7 posts + 3 reels)\n🥇 Gold: 5,000 EGP (12 posts + 5 reels)\n💎 Diamond: 6,500 EGP (15 posts + 8 reels)\n\nPay for your subscription via InstaPay to: <span class="blur">example@instapay</span>\n\nOnce you’ve paid, send us:\n1. A screenshot of the transfer receipt\n2. The email you signed up with, or your business name\n\nWe’ll check your payment and reply here.',
    rc: 'Transfer receipt', biz: 'Shurfa Coffee',
    got: 'Thank you, we’ve received your receipt 🙏\nWe’ll check the transfer and get back to you here once it’s confirmed.',
    paid: 'Payment confirmed ✅\nYour account is ready: tell us about your business.',
    bfH: 'Tell us about your business', bfSub: 'A few questions, about 5 minutes.',
    f1: 'Business name', f2: 'Industry', f3: 'Where should we publish?', f4: 'Content language',
    inds: ['Café', 'Restaurant', 'Clinic', 'Shop'], langs: ['Arabic', 'English'], send: 'Send',
    doneH: 'We’ve got your answers', doneX: 'We’re starting on your posts.',
    hmH: 'Your first posts are ready', hmSub: 'Check them, then approve or ask for a change.',
    wait: n => n + ' awaiting your review', pend: 'Awaiting your approval', okd: 'Approved', sched: 'Scheduled',
    post: 'Post', reel: 'Reel', date: d => 'Nov ' + d,
    posts: [['cafe-02-photo-en', 'Coffee, the slow way.', 0, 18, 100], ['cafe-06-news-en', 'Iced hibiscus is back.', 0, 20, 12], ['cafe-04-carousel-en', '4 coffees, explained simply.', 0, 23, 100], ['cafe-09-reel-ar', 'Coffee, the Egyptian way', 1, 26, 70]],
    changes: 'Ask for changes', approve: 'Approve',
    bn: ['Home', 'Posts', 'Calendar', 'Messages', 'More'],
    igT: 'Posts', igName: 'Shurfa Coffee', igAv: 'S', toast: 'Published', likes: n => n + ' likes',
    igCap: 'Cardamom, dates and a tray for two.',
    c1u: 'guest', c1: 'Looks lovely. Do you have decaf?', c2: 'Yes, we do. See you soon.', replied: 'Replied',
    co1k: 'Your package', co1h: 'Silver',
    co2k: 'Pay by InstaPay', co2: [['InstaPay address', 'Sent to you on WhatsApp'], ['Receipt screenshot', 'You send it in the chat'], ['Your business name', 'So we match the payment']],
    co3k: 'In your account', co3: [['Industry', 'Café'], ['Platforms', 'Instagram and Facebook'], ['Language', 'Arabic']],
    co4k: 'Your first posts',
    co5k: 'We publish and reply', co5: [['Published', 'on Instagram'], ['New comment', 'Replied'], ['New message', 'Replied']],
  };

  // ---- markup ----
  const svg = (d, fill) => `<svg viewBox="0 0 24 24" fill="${fill ? 'currentColor' : 'none'}" stroke="${fill ? 'none' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  const I = { back: 'M15 6l-6 6 6 6', menu: 'M4 7h16M4 12h16M4 17h16', check: 'M4 12l5 5L20 6', send: 'M3 20l18-8L3 4v6l11 2-11 2z',
    cam: 'M3 7h11v10H3zM14 10l6-3v10l-6-3', tel: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z',
    heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z', cmt: 'M4 5h16v11H9l-5 4z', share: 'M4 11l16-7-6 16-2.5-6.5z', save: 'M6 4h12v16l-6-4-6 4z',
    home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z', layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5', cal: 'M4 5h16v15H4zM8 3v4M16 3v4M4 10h16', chat: 'M4 5h16v11H9l-5 4z', more: 'M5 12h.01M12 12h.01M19 12h.01' };
  const WA = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>';
  // pos: which part of the picture a cropped frame keeps (0 = top, 100 = bottom), chosen so a crop never cuts through the design's own text
  const img = (id, pos) => `<img src="img/${id}.webp" alt=""${pos == null ? '' : ` style="object-position:center ${pos}%"`}>`;
  const price = (p, cls = 'pk-p') => `<span class="${cls}"><bdi>${T.money(p)}</bdi> <small>${T.per}</small></span>`;
  const tick = id => `<span class="tk"><i id="${id}">${svg(I.check)}</i></span>`;
  const rows = (arr, pre) => `<div class="rows">${arr.map(([a, b], i) => `<div class="rw" id="${pre}r${i}">${tick(pre + 'k' + i)}<span>${a}<small>${b}</small></span></div>`).join('')}</div>`;
  const P = T.posts;

  document.getElementById('stage').innerHTML = `
  <div class="bg"></div><span class="ex">${T.ex}</span>
  <div class="cap">
    <div class="cap-top"><span class="cap-n"><b id="capn">01</b> / 05</span><span class="cap-seg">${S.map((_, i) => `<span><i id="seg${i}"></i></span>`).join('')}</span></div>
    <div class="cap-ts">${T.cap.map((c, i) => `<div class="cap-t" id="cap${i}"><span class="cap-l">${T.capL[i]}</span><p class="cap-h">${c}</p></div>`).join('')}</div>
    <img class="cap-logo" src="img/logo.webp" alt="">
  </div>
  <div class="dev" id="dev"><div class="ph"></div><div class="scr">
    <div class="sc sc-site" id="s-site"><div class="sb"></div>
      <div class="st-bar"><img src="img/logo.webp" alt=""><span class="st-url">crierstudio.com</span></div>
      <p class="st-h">${T.siteH}</p>
      <div class="st-list">${T.pk.map(([n, p, x], i) => `<div class="pk${i === 1 ? ' hot' : ''}" id="pk${i}"><div class="pk-r"><span class="pk-n">${n}</span>${price(p)}</div><div class="pk-x">${x}</div><div class="pk-b" id="pkb${i}">${WA}${T.sub}</div></div>`).join('')}</div>
    </div>
    <div class="sc sc-wa" id="s-wa">
      <div class="wa-hd"><span class="bk">${svg(I.back)}</span><span class="wa-av"><img src="img/mark.webp" alt=""></span><span class="wa-nm"><b>Crier Studio</b><small>${T.waSub}</small></span><span class="ic">${svg(I.cam)}</span><span class="ic">${svg(I.tel)}</span></div>
      <div class="wa-body" id="wab"><div class="wa-in" id="wain">
        <span class="wa-day">${T.today}</span>
        <div class="m out" id="m1">${T.m1}<time>10:24</time></div>
        <div class="m in" id="m2">${T.greet}<time>10:24</time></div>
        <div class="m out rc" id="m3"><div class="rc-card"><span class="rc-ok">${svg(I.check)}</span><span class="rc-t">${T.rc}</span><span class="rc-ln"><i style="width:34px"></i><i style="width:44px"></i></span><span class="rc-ln"><i style="width:26px"></i><i style="width:52px"></i></span><span class="rc-ln"><i style="width:40px"></i><i style="width:30px"></i></span><span class="rc-ex">${T.ex}</span></div><time>10:31</time></div>
        <div class="m out" id="m4">${T.biz}<time>10:31</time></div>
        <div class="m in" id="m5">${T.got}<time>10:32</time></div>
        <div class="m in" id="m6">${T.paid}<time>11:05</time></div>
      </div></div>
      <div class="wa-ft" id="waft"><div class="wa-inp"><span id="wainp" data-ph="${T.ph}"></span></div><span class="wa-send" id="wasend">${svg(I.send, 1)}</span></div>
    </div>
    <div class="sc sc-brief" id="s-brief">
      <div class="mt"><span class="mn">${svg(I.menu)}</span><img src="img/mark.webp" alt=""><b>crier studio</b></div>
      <div class="pg"><h3>${T.bfH}</h3><p class="sub">${T.bfSub}</p><div class="bf-prog"><i id="bfp"></i></div>
        <div class="card bf">
          <div class="fl"><label>${T.f1}</label><div class="fi" id="fi1"><span id="fi1t"></span><i class="caret" id="fi1c"></i></div></div>
          <div class="fl"><label>${T.f2}</label><div class="chips">${T.inds.map((x, i) => `<span class="chip" id="ind${i}">${x}</span>`).join('')}</div></div>
          <div class="fl"><label>${T.f3}</label><div class="chips">${['Instagram', 'Facebook', 'TikTok'].map((x, i) => `<span class="chip" id="plat${i}">${x}</span>`).join('')}</div></div>
          <div class="fl"><label>${T.f4}</label><div class="chips">${T.langs.map((x, i) => `<span class="chip" id="lng${i}">${x}</span>`).join('')}</div></div>
          <div class="btn" id="bfsend">${T.send}</div>
        </div>
        <div class="done" id="bfdone"><span class="done-ok" id="bfok">${svg(I.check)}</span><b>${T.doneH}</b><span>${T.doneX}</span></div>
      </div>
    </div>
    <div class="sc sc-home" id="s-home">
      <div class="mt"><span class="mn">${svg(I.menu)}</span><img src="img/mark.webp" alt=""><b>crier studio</b><span class="pill" id="hpill">${T.wait(4)}</span></div>
      <div class="pg"><h3>${T.hmH}</h3><p class="sub">${T.hmSub}</p>
        <div class="gr">${P.map(([id, t, reel, d, pos], i) => `<div class="card pc" id="pc${i}"><div class="pc-im">${img(id, pos)}<span class="pc-k">${reel ? T.reel : T.post}</span></div><div class="pc-t">${t}</div><div class="pc-m">${i ? `<i class="dot"></i>${T.pend}` : `<span class="st"><span id="pcw"><i class="dot"></i>${T.pend}</span><span class="st-ok" id="pca"><i class="dot"></i>${T.okd}</span></span>`}</div></div>`).join('')}</div>
      </div>
      <div class="bn">${[I.home, I.layers, I.cal, I.chat, I.more].map((d, i) => `<span${i ? '' : ' class="on"'}>${svg(d)}${T.bn[i]}</span>`).join('')}</div>
      <div class="scrim" id="scrim"></div>
      <div class="sheet" id="sheet"><div class="sh-im">${img(P[0][0], 100)}<div class="sh-ok" id="shok"><i id="shoki">${svg(I.check)}</i></div></div>
        <div class="sh-t">${P[0][1]}</div>
        <div class="sh-m"><span class="st"><span id="shw"><i class="dot"></i>${T.pend}</span><span class="st-ok" id="sha"><i class="dot"></i>${T.okd} · ${T.sched}: ${T.date(P[0][3])}</span></span></div>
        <div class="sh-b"><div class="btn sec">${T.changes}</div><div class="btn" id="shbtn">${T.approve}</div></div>
      </div>
    </div>
    <div class="sc sc-ig" id="s-ig">
      <div class="ig-hd"><span class="bk">${svg(I.back)}</span><b>${T.igT}</b></div>
      <div class="ig-u"><span class="ig-a"><i>${T.igAv}</i></span><span><b>yourbusiness</b><small>${T.igName} · ${T.ex}</small></span></div>
      <div class="ig-im">${img(P[0][0], size === 'phone' ? 0 : 100)}<span class="ig-heart" id="bigh">${svg(I.heart, 1)}</span><span class="ig-toast" id="toast">${svg(I.check)}${T.toast}</span></div>
      <div class="ig-ac"><span class="hl">${svg(I.heart)}<span id="hf" class="f" style="position:absolute;inset:0">${svg(I.heart, 1)}</span></span>${svg(I.cmt)}${svg(I.share)}<span class="sv">${svg(I.save)}</span></div>
      <p class="ig-lk" id="lk"></p>
      <p class="ig-cp"><b>yourbusiness</b>${T.igCap}</p>
      <div class="cms"><div class="cm" id="cm1"><i class="av"></i><span><b>${T.c1u}</b>${T.c1}</span></div>
        <div class="cm re" id="cm2"><i class="av"></i><span><b>yourbusiness</b>${T.c2}<small><em>✓ ${T.replied}</em></small></span></div></div>
    </div>
    <span class="island"></span>
  </div></div>
    <div class="co c1" id="co1"><div class="co-k">${T.co1k}</div><div class="co-h">${T.co1h}</div><div class="co-p"><bdi>${T.money('3,500')}</bdi> <small>${T.per}</small></div><div class="co-x">${T.pk[1][2]}</div><div class="co-b" id="co1b">${WA}${T.sub}</div></div>
    <div class="co c2" id="co2"><div class="co-k">${T.co2k}</div>${rows(T.co2, 'c2')}</div>
    <div class="co c3" id="co3"><div class="co-k">${T.co3k}</div>${rows(T.co3, 'c3')}</div>
    <div class="co c4" id="co4"><div class="co-k">${T.co4k}</div><div class="co-im">${img(P[0][0])}</div><div class="co-st"><span class="w" id="c4w">${T.pend}</span><span class="a" id="c4a">${svg(I.check)}${T.okd}</span></div></div>
    <div class="co c5" id="co5"><div class="co-k">${T.co5k}</div>${rows(T.co5, 'c5')}</div>`;

  if (size === 'phone') document.querySelector('.cap-top').appendChild(document.querySelector('.ex')); // on the small frame the Example label sits in the caption row
  // ---- the timeline engine ----
  const $ = id => document.getElementById(id);
  const ease = { out: t => 1 - Math.pow(1 - t, 3), io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, lin: t => t, back: t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); } };
  const tracks = new Map(), fns = [];
  // tr(el, prop, [[t, value], ...], ease): prop is o (opacity), x, y (px), s (scale), sx (scaleX)
  // a second call for the same element and property continues its track (calls are made in time order)
  function tr(el, prop, kfs, e = 'out') {
    if (typeof el === 'string') { const id = el; el = $(id); if (!el) throw new Error('no element #' + id); }
    if (!tracks.has(el)) tracks.set(el, {});
    const p = tracks.get(el); if (p[prop]) p[prop].kfs.push(...kfs); else p[prop] = { kfs: kfs.slice(), e: ease[e] };
  }
  const at = ({ kfs, e }, t) => { if (t <= kfs[0][0]) return kfs[0][1]; for (let i = 0; i < kfs.length - 1; i++) { const [t0, v0] = kfs[i], [t1, v1] = kfs[i + 1]; if (t < t1) return t1 === t0 ? v1 : v0 + (v1 - v0) * e((t - t0) / (t1 - t0)); } return kfs[kfs.length - 1][1]; };
  const fn = f => fns.push(f);
  const pop = (el, t0, { y = 8, d = .32, s = .92 } = {}) => { tr(el, 'o', [[t0, 0], [t0 + d * .7, 1]]); tr(el, 'y', [[t0, y], [t0 + d, 0]]); tr(el, 's', [[t0, s], [t0 + d, 1]], 'back'); };
  const swap = (a, b, t, d = .25) => { tr(a, 'o', [[t, 1], [t + d, 0]]); tr(b, 'o', [[t, 0], [t + d, 1]]); tr(b, 's', [[t, .8], [t + d * 1.4, 1]], 'back'); };
  const cls = (el, c, t0, t1 = 1e9) => { if (typeof el === 'string') el = $(el); fn(t => el.classList.toggle(c, t >= t0 && t < t1)); };
  const type = (el, text, t0, t1, caret) => { el = $(el); const cs = [...text]; fn(t => { const n = t < t0 ? 0 : t >= t1 ? cs.length : Math.round(cs.length * (t - t0) / (t1 - t0)); const v = cs.slice(0, n).join(''); if (el.textContent !== v) el.textContent = v; }); if (caret) fn(t => { $(caret).style.opacity = t >= t0 - .3 && t < t1 + .35 && Math.floor(t * 2.5) % 2 === 0 ? 1 : 0; }); };
  function tap(el, t) {
    el = $(el); const d = document.createElement('i'); d.className = 'tap'; el.appendChild(d);
    tr(d, 'o', [[t - .4, 0], [t - .15, 1], [t + .12, 1], [t + .45, 0]]); tr(d, 's', [[t - .4, 1.5], [t, .8], [t + .45, 1.6]], 'io');
    cls(el, 'is-press', t, t + .2);
  }
  // one screen slides out towards the start edge while the next comes in from the end edge
  const W = 270, dirX = rtl ? -1 : 1;
  function go(a, b, t, d = .5) { tr(a, 'x', [[t, 0], [t + d, -dirX * W * .35]], 'io'); tr(a, 'o', [[t, 1], [t + d, 0]], 'io'); tr(b, 'x', [[t, dirX * W], [t + d, 0]], 'io'); }

  function build() {
    // loop: the device fades in at the start and out at the end
    tr('dev', 'o', [[0, 0], [.45, 1], [END - .4, 1], [END, 0]], 'io');
    // captions
    S.forEach((s, i) => {
      const e = S[i + 1] ?? END;
      tr('cap' + i, 'o', [[s - .05, 0], [s + .3, 1], [e - .3, 1], [e - .05, 0]]); tr('cap' + i, 'y', [[s - .05, 12], [s + .35, 0], [e - .3, 0], [e - .05, -8]]);
      tr('seg' + i, 'sx', [[s, 0], [e, 1]], 'lin');
    });
    fn(t => { let n = 1; S.forEach((s, i) => { if (t >= s - .05) n = i + 1; }); const v = '0' + n; if ($('capn').textContent !== v) $('capn').textContent = v; });
    // desk callouts: centred beside the phone
    const co = (id, t0, t1, dy = 0) => { const el = $(id); el.style.marginTop = (-el.offsetHeight / 2 + dy) + 'px'; tr(el, 'o', [[t0, 0], [t0 + .45, 1], [t1 - .35, 1], [t1, 0]]); tr(el, 'x', [[t0, -dirX * 18], [t0 + .5, 0]]); tr(el, 'y', [[t0, 0], [t1, -6]], 'lin'); };

    // ---- step 1: choose the package, tap Subscribe on WhatsApp ----
    [0, 1, 2, 3].forEach(i => { tr('pk' + i, 'o', [[.25 + i * .12, 0], [.6 + i * .12, 1]]); tr('pk' + i, 'y', [[.25 + i * .12, 14], [.7 + i * .12, 0]]); });
    tr('pk1', 's', [[1.5, 1], [1.8, 1.025], [2.9, 1.025]], 'io');
    tap('pkb1', 2.6); co('co1', .9, 5.3, 20); tap('co1b', 2.6);
    go('s-site', 's-wa', 3.0); tr('s-wa', 'o', [[2.99, 0], [3, 1]]);
    fn(t => { const v = t < 4.4 ? T.m1 : ''; if ($('wainp').textContent !== v) $('wainp').textContent = v; }); // prefilled by the website link
    tap('wasend', 4.3);

    // ---- chat: messages appear in turn and the thread scrolls to keep the newest in view ----
    const ft = $('waft'); ft.style.position = 'absolute'; ft.style.insetInline = '0'; ft.style.bottom = '0';
    const view = $('wab').clientHeight - 46, inner = $('wain');
    const times = { m1: 4.45, m2: 5.9, m3: 8.7, m4: 10.15, m5: 11.05, m6: 12.45 };
    const ykf = [[0, 0]]; let y = 0;
    for (const [id, t] of Object.entries(times)) {
      const el = $(id); pop(el, t, { y: 10, s: .9 });
      const need = Math.max(0, el.offsetTop + el.offsetHeight + 6 - view);
      if (need > y) { ykf.push([t - .05, -y], [t + .4, -need]); y = need; }
    }
    tr(inner, 'y', ykf, 'io');
    // ---- step 2: receipt and business name ----
    co('co2', 6.3, 11.9); swap('c2k0x', 'c2k0', 6.9); swap('c2k1x', 'c2k1', 8.9); swap('c2k2x', 'c2k2', 10.3);
    type('wainp2', T.biz, 9.3, 9.95); tap('wasend', 10.05);
    // ---- step 3: payment confirmed, then the questions in the account ----
    go('s-wa', 's-brief', 13.5); tr('s-brief', 'o', [[13.49, 0], [13.5, 1]]);
    co('co3', 14.0, 17.3); swap('c3k0x', 'c3k0', 15.0); swap('c3k1x', 'c3k1', 15.85); swap('c3k2x', 'c3k2', 16.15);
    cls('fi1', 'is-focus', 14.0, 14.85); type('fi1t', T.biz, 14.1, 14.7, 'fi1c');
    tap('ind0', 14.95); cls('ind0', 'is-on', 14.95);
    tap('plat0', 15.4); cls('plat0', 'is-on', 15.4); tap('plat1', 15.75); cls('plat1', 'is-on', 15.75);
    tap('lng0', 16.1); cls('lng0', 'is-on', 16.1);
    tr('bfp', 'sx', [[14, .1], [14.7, .3], [14.95, .3], [15.1, .5], [15.4, .5], [15.9, .78], [16.1, .78], [16.3, 1]], 'io');
    tap('bfsend', 16.55);
    tr('bfdone', 'o', [[16.7, 0], [16.95, 1]]); tr('bfok', 's', [[16.75, .3], [17.15, 1]], 'back');
    // ---- step 4: the first posts arrive; approve or ask for a change ----
    go('s-brief', 's-home', 17.6); tr('s-home', 'o', [[17.59, 0], [17.6, 1]]);
    [0, 1, 2, 3].forEach(i => { const t = 18.15 + i * .2; tr('pc' + i, 'o', [[t, 0], [t + .3, 1]]); tr('pc' + i, 'y', [[t, -18], [t + .45, 0]], 'back'); tr('pc' + i, 's', [[t, .94], [t + .45, 1]]); });
    tap('pc0', 19.7);
    const sh = $('sheet'), shH = sh.offsetHeight + 20;
    tr('scrim', 'o', [[19.85, 0], [20.2, 1], [22.5, 1], [22.9, 0]]);
    tr(sh, 'y', [[19.85, shH], [20.35, 0], [22.5, 0], [22.95, shH]], 'io');
    co('co4', 20.1, 23.3);
    tap('shbtn', 21.45);
    tr('shok', 'o', [[21.55, 0], [21.7, 1], [22.5, 1]]); tr('shoki', 's', [[21.55, .3], [21.95, 1]], 'back');
    swap('shw', 'sha', 21.6); swap('c4w', 'c4a', 21.6); swap('pcw', 'pca', 21.6);
    fn(t => { const p = $('hpill'), ok = t >= 21.6, v = T.wait(ok ? 3 : 4); if (p.textContent !== v) p.textContent = v; });
    // ---- step 5: we publish and reply ----
    go('s-home', 's-ig', 23.6); tr('s-ig', 'o', [[23.59, 0], [23.6, 1]]);
    tr('toast', 'o', [[24.3, 0], [24.5, 1], [26.2, 1], [26.5, 0]]); tr('toast', 'y', [[24.3, -10], [24.6, 0]], 'back');
    tr('bigh', 'o', [[25.0, 0], [25.12, .95], [25.55, .95], [25.8, 0]]); tr('bigh', 's', [[25.0, .3], [25.3, 1.1], [25.45, 1], [25.8, 1.15]], 'io');
    tr('hf', 'o', [[25.05, 0], [25.15, 1]]); tr('hf', 's', [[25.05, .4], [25.35, 1]], 'back');
    const likeE = t => 1 - Math.pow(1 - t, 2.2);
    fn(t => { const n = t < 25.05 ? 0 : Math.round(1 + 127 * likeE(Math.min(1, (t - 25.05) / 3.6))); const v = n ? T.likes(n) : ' '; if ($('lk').textContent !== v) $('lk').textContent = v; });
    pop('cm1', 26.2); pop('cm2', 27.2);
    co('co5', 24.5, 28.85); swap('c5k0x', 'c5k0', 24.7); swap('c5k1x', 'c5k1', 27.35); swap('c5k2x', 'c5k2', 28.0);
  }

  // ticks start empty: give each a blank twin so swap() has something to fade from
  for (const k of document.querySelectorAll('.tk i')) { const x = document.createElement('b'); x.id = k.id + 'x'; k.parentNode.insertBefore(x, k); }
  // the composer's second use (typing the business name) writes into the same field
  $('wainp').insertAdjacentHTML('afterend', '<span id="wainp2"></span>');

  function seek(t) {
    for (const f of fns) f(t);
    for (const [el, p] of tracks) {
      if (p.o) { const o = at(p.o, t); el.style.opacity = o; el.style.visibility = o <= 0.001 ? 'hidden' : 'visible'; }
      if (p.x || p.y || p.s || p.sx) {
        const x = p.x ? at(p.x, t) : 0, y = p.y ? at(p.y, t) : 0;
        el.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px)` + (p.s ? ` scale(${at(p.s, t).toFixed(4)})` : '') + (p.sx ? ` scaleX(${at(p.sx, t).toFixed(4)})` : '');
      }
    }
    // typing the business name clears on send
    const w2 = $('wainp2'); if (t >= 10.15 && w2.textContent) w2.textContent = '';
    $('wainp').style.display = $('wainp2').textContent ? 'none' : '';
  }
  window.seek = seek;

  const imgs = [...document.images].map(i => i.decode ? i.decode().catch(() => {}) : null);
  Promise.all([document.fonts.ready, ...imgs]).then(() => document.fonts.load('700 12px "Noto Sans Arabic"')).then(() => {
    build(); seek(+q.get('t') || 0); window.__ready = true;
    if (q.get('play')) { const t0 = performance.now(); const loop = () => { seek(((performance.now() - t0) / 1000) % END); requestAnimationFrame(loop); }; loop(); }
  });
})();
