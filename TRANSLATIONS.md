# Translations

crierstudio.com and its three legal pages are available in 2 languages: en, ar (right-to-left: ar). Spanish and French were removed on 2026-10-16 (their old URLs redirect to English). Strings live in `i18n/<code>.json` (one key set in both files, enforced by `node build/check.mjs`; there is no fallback to English). The build writes each language as static HTML.

Rules used: "Crier Studio" and "Brand Deck" stay in Latin script; the package names are translated (ar: الحزمة الكاملة، حضور دائم، نمو مستمر); prices are shown in the visitor's currency (SAR, AED or EGP with VAT added, US dollars elsewhere; see README); legal pages show "This translation is for convenience; the English version governs." in non-English languages. Contact: team@crierstudio.com.

## Needs native check

The ar file was written by an AI translator, not a native speaker. Check it, the legal pages first:

- ar: "Brand Deck" stays in Latin script; the other package names are translated.
