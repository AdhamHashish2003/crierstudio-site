# Translations

crierstudio.com and its three legal pages are available in 4 languages: en, es, fr, ar (right-to-left: ar). Strings live in `i18n/<code>.json` (211 keys each, loaded on demand; `en.json` is the source and fallback). `i18n.js` picks the language (?lang= > saved choice > browser languages > en), sets `<html lang>` and `dir`, loads Noto Sans Arabic only for ar, and fills every `data-i18n` element. Browser languages other than these four fall back to en.

Rules used: "Crier Studio" and "Snapshot" stay in Latin script; prices come from placeholders ({price} = $49, {regular} = $99, {n} = 20, always USD); `[entity name]` and the `[DRAFT: ...]` markers are kept; legal pages show "This translation is for convenience; the English version governs." in non-English languages. Contact: team@crierstudio.com.

## Needs native check

The es, fr and ar files were written by an AI translator, not native speakers. Check before the legal pages leave DRAFT:

- ar (medium-high): "الخطة" as the name of The Plan; "{n} أمورًا" count grammar in deliv.lead; neutral Modern Standard Arabic register; Latin placeholder domain in f.webPh.
- es (high): "El Plan"; informal "tú" used (switch to usted if wanted); "precio de lanzamiento", "rubro".
- fr (high): "Le Plan"; vous; "Tarif de lancement"; French spacing before colons.
