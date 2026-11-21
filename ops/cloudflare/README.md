# Cloudflare Single Redirects for crierstudio.com (prepared 2026-11-20, NOT applied)

`redirect-rules.json` is the complete rule list for the zone's `http_request_dynamic_redirect` phase: real 301s for every old URL
of the site, so search engines and visitors reach the final page in one hop. GitHub Pages cannot send 301s, so until these rules
are applied the stub pages in the repository (noindex + canonical + meta refresh to the same page) do the job.

**Do not edit `redirect-rules.json` by hand.** `node build/build.mjs` writes it from the one redirect map in `build/build.mjs`
(`REDIRECTS`, also written to `build/redirects.json`), the same map that writes the stub pages, so the two always agree.
`node tests/redirect-map.mjs` evaluates the rules in JS for every stub in the built site and fails unless each one lands on a
page in `sitemap.xml` in one hop, matching the stub.

## The rules (10, the Free plan's limit)

| # | Name | Matches | Goes to |
| --- | --- | --- | --- |
| 1 | www to apex | `http.host eq "www.crierstudio.com"` | the same path on `https://crierstudio.com` |
| 2 | Social Kit: kit + snapshot | `/kit/`, `/snapshot/`, `/samples/` (Arabic root; also without the slash and with `index.html`) | `/social/` |
| 3 | Social Kit AR | the same under `/ar/` | `/social/` (was `/ar/social/`, itself a redirect) |
| 4 | Physical to Custom pieces | `/physical/` and the other parked Arabic pages: `/in-store/`, `/brand-deck/`, `/branddeck/`, `/crier-deck/`, `/sculptures/`, `/faq/`, `/about/` | `/` (was `/in-store/#custom`, a parked page) |
| 5 | Physical to Custom pieces AR | `/ar/`, and the same parked pages under `/ar/` (and `/ar/fiberglass/`) | `/` (was `/ar/in-store/#custom`) |
| 6 | English: parked pages to the English home page | the parked pages under `/en/`, `/es/`, `/fr/`, plus `/es/`, `/fr/`, the old studio deck and share-image page | `/en/` |
| 7 | English: samples, kit and snapshot to /en/social/ | `/en/`, `/es/`, `/fr/` + `kit/`, `snapshot/`, `samples/` | `/en/social/` |
| 8 | Old /ar/ pages to the Arabic pages at the root | `/ar/pricing/`, `/ar/social/`, `/ar/terms/`, `/ar/privacy/`, `/ar/refund/` | the same page at the root (`substring(path, 3)`) |
| 9 | Spanish and French pages to English | `/es/` and `/fr/` + `pricing/`, `social/`, `terms/`, `privacy/`, `refund/` | the same page under `/en/` |
| 10 | Old legal .html URLs | `/terms.html`, `/privacy.html`, `/refund.html` | `/terms/`, `/privacy/`, `/refund/` |

All are 301 with the query string kept. The exact paths are in `redirect-rules.json` (and `build/redirects.json`).
Rules 2-5 keep the names of the four rules the zone already has; their contents and targets change as above (see the batch
report: `/ar/social/` is a stub, and In-store is parked, so the old targets were a second redirect).

Not covered on purpose: `/fiberglass/` (the unlisted page, restored), every published page, `robots.txt`, `sitemap.xml` and the
IndexNow key file. Rules 8-10 compute the target, so they list only the trailing-slash form of each old URL (`/ar/pricing/`); the
rare `/ar/pricing` (no slash) first gets GitHub Pages' own slash redirect and then rule 8. The static rules (2-7) list all three
forms. A request to `www.` with an old path takes two hops (www, then the old path); rule 1 is kept exactly as specified.

## Apply it (owner, when ready)

The phase entrypoint holds the whole list: replacing it with this file keeps the four existing rules (updated) and adds the rest.
Back up the current list first.

### Dashboard

Cloudflare dashboard > crierstudio.com > Rules > Redirect Rules. For each rule in the file, in order: edit the rule with that name
(rules 2-5) or **Create rule** > Single Redirect (rules 1, 6-10): name = `description`; "Custom filter expression" > Edit expression,
paste `expression`; URL redirect type **Static** with the `target_url.value`, or **Dynamic** with the `target_url.expression`;
status code 301; tick **Preserve query string**. Drag the rules into the file's order ("www to apex" first). Deploy.

### API

A token with Zone > Single Redirect > Edit (or Zone Rulesets Edit) on the zone. `ZONE` = the zone id.

```sh
# 1. back up the current rules
curl -s "https://api.cloudflare.com/client/v4/zones/$ZONE/rulesets/phases/http_request_dynamic_redirect/entrypoint" \
  -H "Authorization: Bearer $CF_TOKEN" > redirect-rules.backup.json
# 2. replace the phase entrypoint's rules with the file (PUT "Update a zone entry point ruleset": the whole list at once)
curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE/rulesets/phases/http_request_dynamic_redirect/entrypoint" \
  -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" --data @ops/cloudflare/redirect-rules.json
```

To change one existing rule in place instead, `PATCH /zones/$ZONE/rulesets/<ruleset id>/rules/<rule id>` with that rule's object
(the ids are in the backup from step 1).

### Check after applying

```sh
for p in /kit/ /ar/kit/ /physical/ /ar/physical/ /ar/pricing/ /es/pricing/ /en/about/ /terms.html; do
  curl -s -o /dev/null -w "%{http_code} $p -> %{redirect_url}\n" "https://crierstudio.com$p?x=1"; done
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://www.crierstudio.com/pricing/
```

Each line must be `301` to a page that answers 200 (no second redirect).
