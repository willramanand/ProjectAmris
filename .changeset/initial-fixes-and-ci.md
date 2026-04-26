---
"@willramanand/amris": minor
---

Closes the 2026-04-24 review punch list and adds project infrastructure.

**Components**
- `am-data-grid`: row roving tabindex, ArrowUp/Down/Home/End navigation, Space/Enter selection toggle, full ARIA grid roles.
- `am-button`: switched fragile `override ariaLabel` to `label` prop. Now form-associated via `attachInternals()` with `name`/`value`/`form` accessors.
- `am-rich-select`: `aria-invalid` now reflects on the trigger when the `invalid` attribute is set.

**API additions**
- `resetUniqueIdCounter()` exported from `@willramanand/amris/core` and root entry — call at the start of each SSR request to keep generated IDs deterministic.
- `@willramanand/amris/styles/tokens.css` — global stylesheet alternative to `<am-theme-provider>`. Built from the same source-of-truth token modules.

**Performance**
- Audited every floating-ui `autoUpdate` call — confirmed all are gated by `open` transitions, never restart on unrelated `updated()`.
- Verified all `composed: true` usages — every one is a public-facing event that must cross the shadow boundary.

**Project infrastructure**
- CI workflow (`.github/workflows/ci.yml`): typecheck + tests + build on every PR/push.
- Changesets workflow (`.github/workflows/release.yml`): version PRs and publish driven by `.changeset/*.md` entries.
- New tests for `am-combobox`, `am-data-grid`, `am-rich-select` (31 cases across 3 files).
