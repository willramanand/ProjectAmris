# @willramanand/amris

## 1.1.0

### Minor Changes

- d8b2ef1: Add the opt-in `@willramanand/amris/compat-forms` side-effect subpath.

  Importing it once at app init enables a hidden-input Light-DOM form-participation
  fallback strictly below the ElementInternals form-association floor (e.g. Safari
  < 16.4), restoring native `<form>` submission and native `required`/`pattern`
  constraint validation for Amris form controls on engines without
  `ElementInternals`.

  The fallback is XOR-gated with ElementInternals — never both channels, so no
  double-submit — and is a no-op at or above the floor (ElementInternals wins). It
  is entirely opt-in: nothing activates unless the consumer imports the subpath.
  This adds no change to the frozen public CEM surface — component
  props/events/slots/parts and design tokens are unchanged; the subpath registers
  no custom element.

## 1.0.0

### Major Changes

- 65cc8d0: Freeze the public API and ship v1.0

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

### Minor Changes

- 83ae4a3: Add the `am-shortcuts` keyboard-shortcut provider and registry

  **New public element:** `am-shortcuts` is a provider element that hosts a
  keyboard-shortcut registry for its subtree. Descendant components (and host
  applications) call the registry's `register(...)` contract to bind key
  combinations to commands, with the provider owning dispatch and lifecycle.

  **Registry `register(...)` contract:**

  | Capability                  | Behavior                                                                                                                                                  |
  | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Scopes                      | Shortcuts are registered within a scope so overlapping bindings can coexist across regions of the app                                                     |
  | `mod` / `opt` normalization | `mod` resolves to Cmd on macOS and Ctrl elsewhere; `opt` resolves to the platform's Alt/Option, so bindings are authored once and normalized per platform |
  | Conflict detection          | Registering a combination already bound in the same active scope is detected and surfaced rather than silently shadowed                                   |
  | Reserved-combo blocklist    | Browser/OS-reserved combinations are blocked from registration to avoid hijacking essential shortcuts                                                     |

  **Command palette refactor:** `am-command-palette` now consumes the shared
  registry and supports a rebindable modifier for its open shortcut
  (rebindable-`mod`+`k`) instead of a hardcoded combination.

  No breaking changes — `am-shortcuts` and the registry are new additive public
  surface.

- 83ae4a3: Add `setCustomError(message)` validation API to the form-associated controls

  **New public API:** All 14 form-associated controls now expose a
  `setCustomError(message: string): void` method that surfaces an
  application-supplied validation message. Passing a non-empty string marks the
  control invalid and renders the message through the shared validation controller;
  passing an empty string clears the custom error. The active message is also
  auto-surfaced via the native `validationMessage` so it participates in native
  form validation and constraint reporting.

  | Surface                   | Detail                                                                                                                                                                                                                                |
  | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `setCustomError(message)` | Added to `am-input`, `am-textarea`, `am-number-field`, `am-input-otp`, `am-checkbox`, `am-switch`, `am-radio-group`, `am-slider`, `am-color-picker`, `am-select`, `am-combobox`, `am-rich-select`, `am-date-picker`, `am-time-picker` |
  | `error` CSS part          | New part exposing the rendered validation message container on the affected controls                                                                                                                                                  |
  | `invalid` (reflected)     | Now reflected to an attribute on controls that gained validity reflection (`am-checkbox`, `am-radio-group`, `am-slider`, `am-switch`, and peers)                                                                                      |
  | `required`                | Added to `am-switch` and `am-color-picker` for parity with the other form controls                                                                                                                                                    |

  **Precedence (D-03):** a custom error set via `setCustomError` takes precedence
  over the control's built-in constraint messages; clearing it restores native
  constraint reporting.

  **Timing & politeness (D-01/D-04):** validation messages are announced on the
  existing validation-reporting cadence with the established ARIA live politeness,
  so screen-reader users hear the message without redundant interruptions.

  **am-field (D-02):** the field wrapper swaps to the control's active
  `validationMessage`/custom error when present, replacing its own helper text.

  No breaking changes — this is purely additive public surface.

- 584c7fd: Freeze the public slot / `::part()` / `--am-*` token surface as the v1.0 contract (API-04, D-11)

  The complete documented **slot**, **`::part()`**, and **`--am-*` token** surface is
  now declared FROZEN in `api/AUDIT.md` and captured in
  `api/custom-elements.baseline.json`. This is the published v1.0 styling/composition
  contract — a **one-way door** (D-11): these names must not churn after 1.0.

  ### Frozen surface (post-normalization, Plans 03–08)

  | Dimension                                            | Count (unique) |
  | ---------------------------------------------------- | -------------- |
  | Global semantic `--am-*` tokens                      | 212            |
  | Per-component `--am-{component}-*` `@cssprop` tokens | 54             |
  | Slot names                                           | 21             |
  | `::part()` names                                     | 76             |

  ### Newly documented token

  One used-but-undocumented token flagged by the audit was tagged so it enters the
  frozen contract (freeze decision `freeze-all-documented`):

  | Token          | Owner             | Was                                                                                      | Now                                                                           |
  | -------------- | ----------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
  | `--am-z-toast` | `am-toast-region` | referenced in `css` (`z-index: var(--am-z-toast, 1500)`) but untagged — invisible to CEM | documented via `@cssprop --am-z-toast` and enumerated into the frozen surface |

  This is **additive** — a comment-only `@cssprop` JSDoc tag documenting an already
  consumer-overridable CSS custom property. No runtime behavior changes; the token's
  `1500` fallback is unchanged. No slot, part, or token was renamed or removed, and
  no element was added or removed from the CEM tagName set.

  **Intentionally-internal exclusions:** _None_ — every used token/part/slot is now
  part of the frozen public contract.

- e1ee486: Normalize overlay lifecycle events to `am-open`/`am-close`

  **Breaking change (D-01/D-04):** The three overlay outliers now emit the canonical
  open/close lifecycle events, matching the native `<dialog>` vocabulary and the
  existing majority (`am-dialog`, `am-drawer`, `am-command-palette`, `am-toast`).
  The old event names are removed outright — there is no backward-compat alias and
  no dual-firing.

  | Component         | Old event | New event  |
  | ----------------- | --------- | ---------- |
  | `am-dropdown`     | `am-show` | `am-open`  |
  | `am-dropdown`     | `am-hide` | `am-close` |
  | `am-popover`      | `am-show` | `am-open`  |
  | `am-popover`      | `am-hide` | `am-close` |
  | `am-context-menu` | `am-show` | `am-open`  |
  | `am-context-menu` | `am-hide` | `am-close` |

  **Migration:** Rebind any listeners on these components from `am-show`/`am-hide`
  to `am-open`/`am-close`. The already-canonical overlays (`am-dialog`, `am-drawer`,
  `am-command-palette`, `am-toast`, `am-alert`) are unchanged.

- ea0a4b8: Normalize the remaining event/prop outliers (D-03 full normalization)

  **Breaking change (D-03/D-04):** The final pre-1.0 rename wave normalizes every
  remaining outlier the consistency audit surfaced beyond the overlay (Plan 03) and
  selection (Plan 04) waves. Old names are removed outright — there is no
  backward-compat alias and no dual-firing.

  ### Event rename

  | Component(s)                                           | Old event       | New event   | Detail shape            |
  | ------------------------------------------------------ | --------------- | ----------- | ----------------------- |
  | `am-tabs` (also observed on `am-tab` / `am-tab-panel`) | `am-tab-change` | `am-change` | `{ panel }` (unchanged) |

  The value-changing tabs event now uses the canonical `am-change` vocabulary,
  matching `am-pagination`. Expand-state events (`am-accordion` / `am-tree-view`
  `am-toggle`) are a distinct semantic and are left unchanged; `am-pagination`
  `am-change` was already canonical and is unchanged.

  ### Property / attribute renames

  | Component     | Old prop (attribute) | New prop (attribute)                    | Rationale                                                                      |
  | ------------- | -------------------- | --------------------------------------- | ------------------------------------------------------------------------------ |
  | `am-combobox` | `select` (`select`)  | `searchInTrigger` (`search-in-trigger`) | Boolean collided with the `<am-select>` element name and read ambiguously      |
  | `am-combobox` | `async` (`async`)    | `remote` (`remote`)                     | `async` reads as a reserved JS concept; `remote` names the server-fed behavior |

  Combobox runtime behavior is unchanged — only the public property names and their
  reflected attributes are renamed (internals refactor is a later plan).

  **Migration:**

  - `am-tabs` consumers: rebind any `am-tab-change` listener to `am-change`
    (`event.detail.panel` is unchanged).
  - `am-combobox` consumers: rename the `select` attribute/property to
    `search-in-trigger` / `searchInTrigger`, and the `async` attribute/property to
    `remote`.

- 2f20e2f: Normalize selection events under the change-vs-select split (`am-change`)

  **Breaking change (D-02/D-04):** Value-changing selection controls now emit
  `am-change` (the native `<select>` vocabulary), while discrete pick actions keep
  `am-select`. The old selection event names are removed outright — there is no
  backward-compat alias and no dual-firing.

  | Component                             | Old event(s)                            | New event   | Detail shape                                         |
  | ------------------------------------- | --------------------------------------- | ----------- | ---------------------------------------------------- |
  | `am-option` (consumed by `am-select`) | `am-select-option`                      | `am-change` | `{ value }` (unchanged, `composed: false` preserved) |
  | `am-data-grid`                        | `am-row-select` + `am-selection-change` | `am-change` | `{ keys }` (aggregate selection set)                 |

  **Data-grid reconciliation:** the former per-row `am-row-select` event
  (`{ row, index, id, selected, keys }`) and aggregate `am-selection-change` event
  (`{ keys }`) are collapsed into a single `am-change` value-change event carrying
  the aggregate selection set as `{ keys }` — matching native value-change
  semantics (the event reports the new value). Selection runtime logic (which rows
  become selected) is unchanged; only the emitted event name and detail shape change.

  **Migration:**

  - `am-select` consumers: rebind any listener on `am-select-option` to `am-change`.
  - `am-data-grid` consumers: replace `am-row-select`/`am-selection-change` listeners
    with a single `am-change` listener and read `event.detail.keys`. Consumers that
    relied on per-row detail must diff the aggregate `keys` set to derive the changed row.

  The discrete-pick `am-select` on `am-menu`, `am-list`, `am-tree-view`, and
  `am-command-palette` is already canonical and is unchanged.

## 0.2.0

### Minor Changes

- 2c73b22: Closes the 2026-04-24 review punch list and adds project infrastructure.

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
