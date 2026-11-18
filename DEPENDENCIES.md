# Dependency monitoring (audit 3 O08, 2026-11-17)

The public site has **no third-party packages and no workflows**: GitHub Pages serves the committed static files, and the
build and check scripts use only Node's standard library. There is nothing for an advisory to match.

- Third-party code the visitor's browser loads (Google Analytics / Tag Manager, behind the consent choice) is not a package
  here: it is covered by the privacy page and the consent model, not by Dependabot.
- **Dependabot alerts** (Settings → Code security, owner switch, free) stay on so that a manifest added later is watched
  from its first commit. Adding one: commit its lockfile, add a `.github/dependabot.yml` entry (security updates,
  `open-pull-requests-limit: 0`).
- Owner of triage: Adham (see uma `ci/DEPENDENCIES.md` for the steps).
