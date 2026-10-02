# Translations

crierstudio.com and its three legal pages are available in 30 languages. Strings live in `i18n/<code>.json` (one file per language, 211 keys each, loaded on demand; `en.json` is the source and fallback). `i18n.js` picks the language (?lang= > saved choice > browser languages > en), sets `<html lang>` and `dir`, loads the script font only for that language, and fills every `data-i18n` element.

Languages: en, ar, es, fr, de, it, pt-BR, nl, tr, ru, uk, pl, ro, sv, el, he, fa, ur, hi, bn, id, ms, th, vi, zh-Hans, zh-Hant, ja, ko, sw, fil. Right-to-left: ar, he, fa, ur.

Rules used: "Crier Studio" and "Snapshot" stay in Latin script everywhere; prices come from placeholders ({price} = $49, {regular} = $99, {n} = 20, always USD); `[entity name]` and the `[DRAFT: ...]` markers are kept as they are; the legal pages show "This translation is for convenience; the English version governs." in every non-English language (key `leg.conv`). The contact address is team@crierstudio.com. Check all languages with the key/placeholder script (every key, same placeholders and tags in every file).

## Needs native check

All 29 non-English files were written by an AI translator, not by native speakers. Every one needs a native check before the legal pages leave DRAFT. Specific points per language:

- ar (medium-high): "الخطة" as the name of The Plan; "{n} أمورًا" count grammar in deliv.lead; neutral Modern Standard Arabic register; Latin placeholder domain in f.webPh.
- es (high): "El Plan"; informal "tú" used (switch to usted if wanted); "precio de lanzamiento", "rubro".
- fr (high): "Le Plan"; vous; "Tarif de lancement"; French spacing before colons.
- de (high): "Der Plan"; Sie; "Gründerpreis"; "Gesellschaft" in terms.who.p; "{n} Leistungen".
- it (high): "Il Piano"; informal "tu" used (switch to Lei if wanted); "Prezzo di lancio"; "mock" left as a loanword.
- pt-BR (high): "O Plano"; "você"; "docerias".
- nl (high): "Het Plan"; informal je/jij (switch to u if wanted); "Oprichtersprijs"; "Branche", "Praktijken".
- tr (medium-high): "Plan" without article; apostrophe suffixes after Snapshot and Crier Studio; "Kuruluş fiyatı"; "Reel" left Latin.
- ru (medium-high): "Тариф" for The Plan (may read as a pricing tier); "Я согласен(на)"; "стартовая цена"; Latin "Reels".
- uk (medium-high): "План"; "Безплатно" vs "Безкоштовно"; "Дописи"; "стартова ціна".
- pl (high): "Ty" register (Państwo is the alternative); masculine verb forms; "Plan" declined; "Cena założycielska".
- ro (medium-high): formal "dumneavoastră" may read heavy; "Snapshot-ul"; "Ciornă" for draft; "Preț de fondator".
- sv (high): informal "du"; "Planen"; "Grundarpris"; "Utkast"; "Granskning" for audit.
- el (medium-high): "Το Πλάνο" (Πακέτο is the alternative); "Προσχέδιο"; "Τιμή ιδρυτών"; "Δωρεάν Snapshot".
- he (medium-high): plural/neutral address; "התוכנית"; "ה-Snapshot" with hyphen; "טיוטה"; "מחיר מייסדים"; "הדמיה" for mock.
- fa (medium-high): "طرح" for The Plan; "قیمت بنیان‌گذاری"; "ریل" for Reel; Western digits.
- ur (medium): "پلان"; loanwords (ریفنڈ, سبسکرپشن, آڈٹ); "بانی قیمت"; set in Noto Sans Arabic (not Nastaliq).
- hi (medium-high): "प्लान"; "संस्थापक कीमत"; English loanwords (ऑडिट, मॉक, रिफ़ंड, कैप्शन); "मसौदा".
- bn (medium): "প্ল্যান"; "প্রতিষ্ঠাতা মূল্য"; the "টি" counter after digits; genitive after Latin names; "খসড়া", "রিফান্ড".
- id (high): "Rencana"; "harga perdana"; "Mockup", "postingan"; localized f.webPh.
- ms (medium-high): "The Plan" left in English as the product name; "anda"; "Pakej", "Bayaran balik"; "Kuki".
- th (medium): "แผนงาน" for The Plan; no polite particles; "ฉบับร่าง"; "ราคาผู้ก่อตั้ง"; legal terms.
- vi (medium-high): "Gói Kế hoạch"; "bạn" vs "quý khách"; "BẢN NHÁP"; "Giá sáng lập".
- zh-Hans (medium-high): "行动计划" for The Plan; "您"; "创始价"; "首屏效果图"; "短视频" for Reel.
- zh-Hant (medium-high): "行動計畫"; Taiwan wording (隱私權政策, 在地商家, 蒐集, 貼文); "創始價"; "首屏示意圖".
- ja (medium-high): "ザ・プラン"; です/ます; nav.cta "無料Snapshot" length; clinic wording in ind.4x / ind.4note.
- ko (medium-high): "더 플랜"; 해요체 in marketing vs 합니다체 in legal; "이(가)" in terms.who.p.
- sw (medium): "Mpango"; "marekebisho" for fixes; "nafasi ya juu kwenye utafutaji" for search ranking; "kikoa".
- fil (medium): "Plano"; "Pangunahing presyo" (may read as "main price"); "mga trabahong pang-skilled"; "burahin"/"ituwid" in legal text.

The product name "The Plan" differs by language on purpose (translated as a name each time); pick one final rendering per language when the native check is done and change it in that language's JSON only.
