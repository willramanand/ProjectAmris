---
"@willramanand/amris": major
---

Freeze the public API and ship v1.0

This is the v1.0 freeze release. The public surface of `@willramanand/amris`
— every custom element's attributes, public fields, events, slots, `::part()`s,
and `--am-*` CSS custom properties — is now a frozen, dependable contract that
consumers can build against with confidence.

**What v1.0 guarantees:**

- **Frozen public API.** The full custom-elements surface is captured in a
  committed baseline (`api/custom-elements.baseline.json`) and enforced in CI by
  the Changeset-aware surface-diff release gate — any unversioned change to the
  public surface fails the build.
- **Real test coverage.** Components are proven in a real browser lane (native
  ElementInternals, focus, dialog, positioning) plus a jsdom coverage gate and
  an in-browser accessibility pass, not just unit smoke.
- **Stable packaging.** Every documented entry point (full bundle, core bundle,
  per-component, tokens CSS, deep `./tokens` / `./utilities/*` / `./styles/*`
  exports) resolves from an installed tarball, with Lit kept as an unbundled
  peer dependency (`^3.3.2`).

This is a `major` bump because it is the first stable, API-frozen release: it
takes the package from its pre-1.0 `0.2.0` line to `1.0.0`, superseding the
pending pre-1.0 minor changesets that would otherwise only reach `0.3.0`.
