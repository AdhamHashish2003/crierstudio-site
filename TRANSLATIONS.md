# Translations

crierstudio.com and its three legal pages are available in 4 languages: en, es, fr, ar (right-to-left: ar). Strings live in `i18n/<code>.json` (one key set in all four files, enforced by `node build/check.mjs`; there is no fallback to English). The build writes each language as static HTML.

Rules used: "Crier Studio" and "Snapshot" stay in Latin script; there are no prices on the site; legal pages show "This translation is for convenience; the English version governs." in non-English languages. Contact: team@crierstudio.com.

## Needs native check

The es, fr and ar files were written by an AI translator, not native speakers. Check them, the legal pages first:

- es: informal "tú" used (switch to usted if wanted).
- fr: vous; French spacing before colons is not applied.
- ar: "Snapshot" and "Crier Deck" stay in Latin script (decision still open for "Snapshot").
