# Phase 4: Performance & Feature Capabilities - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-18
**Phase:** 4-performance-feature-capabilities
**Areas discussed:** Validation display policy, Virtualization activation, Shortcut registry design, New-dependency packaging

---

## Validation display policy

### Error timing
| Option | Description | Selected |
|--------|-------------|----------|
| Blur + submit (`:user-invalid`) | Error appears on blur OR submit, tracks live after; matches native | ✓ |
| Submit only | Errors hidden until submit attempt, then surface all at once | |
| Consumer-driven | Component emits invalid event + CSS state; consumer decides timing | |

### Hint vs error
| Option | Description | Selected |
|--------|-------------|----------|
| Error replaces hint | Material `supporting-text`→`error-text`; hint returns when error clears | ✓ |
| Error stacks below hint | Both visible; two message rows, two describedby refs | |
| Consumer chooses per field | Per-field attribute toggle | |

### Error source precedence (`setCustomError`)
| Option | Description | Selected |
|--------|-------------|----------|
| Custom error wins | Consumer/server message overrides native `validationMessage`; clears to native fallback | ✓ |
| Native constraint wins | Browser constraint errors show first; custom only when natively valid | |
| Custom replaces entirely | `setCustomError` = pure manual mode; native ignored until cleared | |

### Screen-reader announcement
| Option | Description | Selected |
|--------|-------------|----------|
| Polite, assertive on submit | `aria-live=polite` per-field; `role=alert` on failed submit | ✓ |
| Always polite | All errors polite, never interrupt | |
| Always assertive | All errors interrupt (`role=alert`) | |

**User's choice:** `:user-invalid` timing; error replaces hint; custom error wins with native fallback; polite per-field / assertive on submit.
**Notes:** All within the locked "no auto-show on first paint" anti-feature. Recommended option chosen in each case.

---

## Virtualization activation

### Grid activation
| Option | Description | Selected |
|--------|-------------|----------|
| Auto above a row threshold | Virtualizes above N rows; no new public attribute → freeze-neutral | ✓ |
| Opt-in `virtualized` attribute | Explicit boolean attribute; adds public surface | |
| Both: auto default + attribute override | Auto + forceable attribute; largest surface | |

### Popup virtualization
| Option | Description | Selected |
|--------|-------------|----------|
| Same auto-threshold model | Popups virtualize on same model as grid; small lists stay on `repeat()` | ✓ |
| Different threshold per surface | Independently tuned grid vs popup cutovers | |
| Always virtualize popups | Every option list virtualized regardless of size | |

### Threshold value
| Option | Description | Selected |
|--------|-------------|----------|
| You decide from benchmarks | Set exact cutover from measured render cost (likely ~100) | ✓ |
| ~100 rows | Lock ~100 now | |
| ~50 rows | Lock ~50 now | |

**User's choice:** Auto above threshold (no public attribute); same model for grid + popups; threshold tuned from benchmarks (Claude's discretion).
**Notes:** Preserves the ROADMAP "internal-only / freeze-neutral" promise for virtualization.

---

## Shortcut registry design

### Registration API
| Option | Description | Selected |
|--------|-------------|----------|
| Imperative registry via provider | `<am-shortcuts>` provides registry via `@lit/context`; `register({id,keys,scope,handler})` | ✓ |
| Declarative `<am-shortcut>` elements | Child elements read by provider; adds a second registered element | |
| Both (imperative core + declarative wrapper) | Largest surface, most flexible | |

### command-palette fallback (no provider)
| Option | Description | Selected |
|--------|-------------|----------|
| Self-register default `mod+k` | Drop-in Cmd/Ctrl+K keeps working; registers through registry when present | ✓ |
| Inert without a provider | Only opens via `open()` when no provider; breaks current behavior | |
| Warn + self-register | Same fallback + console warning | |

### Reserved combos + single-keys
| Option | Description | Selected |
|--------|-------------|----------|
| Block OS combos + single-keys opt-in | Refuse browser/OS combos; single-keys opt-in, remappable, suppressed while typing (WCAG 2.1.4) | ✓ |
| Block combos, single-keys allowed freely | Reserve combos only; single-keys free | |
| Advisory only (warn, never block) | Warn but never refuse | |

### Same-scope conflict behavior
| Option | Description | Selected |
|--------|-------------|----------|
| Refuse + report result | Keep first binding, refuse second, return inspectable result + dev warning; no throw | ✓ |
| Last registration wins (override) | Newer replaces older + warning | |
| Throw on conflict | `register()` throws | |

**User's choice:** Imperative registry via `am-shortcuts`/`@lit/context`; command-palette self-registers `mod+k` without a provider; block OS combos, single-keys opt-in; refuse+report on same-scope conflict.
**Notes:** `am-shortcuts` + `register` API are new public surface bound at freeze (one-way).

---

## New-dependency packaging

### Dependency model
| Option | Description | Selected |
|--------|-------------|----------|
| Runtime deps, kept external/unbundled | In `dependencies`, auto-installed, but external (not bundled); same as Lit today | ✓ |
| peerDependencies (consumer installs) | Consumer runs `npm install` themselves | |
| Bundle into Amris output | Inline into ESM; inflates budgets, risks duplicate Lit | |

### Version pinning
| Option | Description | Selected |
|--------|-------------|----------|
| Exact-pin virtualizer, caret `@lit/context` | Pin pre-1.0 labs package; caret the stable one | ✓ |
| Exact-pin both | Lock both exactly | |
| Caret both | `^` ranges on both | |

**User's choice:** Runtime `dependencies`, kept external/unbundled; exact-pin `@lit-labs/virtualizer`, caret `@lit/context`.
**Notes:** `vite.config.ts:195` already externalizes `@lit/*` (covers `@lit/context`); `@lit-labs/virtualizer` needs `/^@lit-labs\//` added to the external list.

---

## Claude's Discretion

- Virtualization threshold row count (tune from benchmarks; likely ~100).
- PERF-04 `autoUpdate` gating across overlays via FloatingPositionController (mechanical, behavior-preserving).
- Cross-shadow `aria-describedby` wiring mechanism (`am-field` owns id + `aria-invalid`).
- Which of the 15 form-associated controls get validation wiring (exclude non-form-associated search-field / file-upload).
- CSS state exposure for invalid styling (`:state(...)` / `:host([invalid])`).
- Registry internals: scope-stacking resolution, `composedPath()` across shadow roots, serializable-config / help-sheet shape.
- Virtualization internals: uniform vs variable row heights, scroll-to-selected, identity-keyed selection/sort; document the mobile-SR `activedescendant` limitation.
- Exact `@lit-labs/virtualizer` version and reserved-combo blocklist contents.

## Deferred Ideas

- Validation/theming/usage docs + Storybook examples → Phase 5 (DOCS-02/03).
- Flip surface-diff gate to enforcing + release pipeline → Phase 6 (SHIP-01→04).
- Shortcut-config persistence helpers → v2 (FEAT-V2-01); registry exposes serializable config, storage stays consumer-owned.
- Editable/sortable virtualized grid → v2 (FEAT-V2-02); ship display virtualizer only.
- RTL audit across floating-ui overlays → v2 (RTL-V2-01).
- Declarative `<am-shortcut>` element wrapper — set aside (D-08 chose imperative); possible additive v1.x/v2 convenience.
