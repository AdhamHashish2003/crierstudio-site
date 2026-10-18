# Translations

crierstudio.com and its three legal pages are available in 2 languages: en, ar (right-to-left: ar). Spanish and French were removed on 2026-10-16 (their old URLs redirect to English). Strings live in `i18n/<code>.json` (one key set in both files, enforced by `node build/check.mjs`; there is no fallback to English). The build writes each language as static HTML.

Rules used: "Crier Studio" and "Brand Deck" stay in Latin script; the package names are translated (ar: حزمة السوشيال ميديا (The Social Kit, was الحزمة الكاملة)، حضور دائم، نمو مستمر، حزمة المحل (The Store Kit)); the two lines are السوشيال (nav) and داخل المحل (In-store), and Custom pieces is قطع حسب الطلب; prices are shown in the visitor's currency (SAR, AED or EGP with VAT added, US dollars elsewhere; see README); legal pages show "This translation is for convenience; the English version governs." in non-English languages. Contact: team@crierstudio.com.

## Needs native check

The ar file was written by an AI translator, not a native speaker. Check it, the legal pages first:

- ar: "Brand Deck" stays in Latin script; the other package names are translated.
- ar (2026-10-18): the Custom pieces links on /ar/in-store/ (`is.c.acct` "أنشئ حسابًا مجانيًا لطلب عرض سعر.", `is.c.login`) and the
  changed FAQ answers `faq.25a1` / `faq.17a1` (quotes are now asked in the client portal). The portal's own Arabic strings
  for the quote page are in uma-main `portal/public/i18n/ar.json` (`qr_*`, `quote_*`, `signup_closed`, `nav_quote`).
- "free account" / "حسابًا مجانيًا" is the one allowed use of free (a portal account, not an offer); `build/check.mjs` lets only that phrase through.
