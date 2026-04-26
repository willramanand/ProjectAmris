# Fixes

Tracking known issues from review on 2026-04-24. Severity: **P0** ship-blocker, **P1** real cost / DX cliff, **P2** polish.

## Performance

- [x] **P0 — Global listeners always-on.** popover, dropdown, context-menu, combobox, select, date-picker fixed (lazy attach/detach on open). `command-palette` keydown intentionally global (Cmd+K shortcut). `time-picker` had no global listener. Done 2026-04-24.
- [x] **P0 — DataGrid O(n²) render.** Replaced `indexOf` with O(n) `Map<row, index>`. Added `repeat()` keyed by `getRowId`. Done 2026-04-24.
- [x] **P1 — DataGrid string-coerced sort.** Added `column.type` + `column.compare` with default comparators per type. Done 2026-04-24.
- [x] **P1 — No `repeat` directive in long-list components.** Added keyed `repeat()` to combobox (filtered options), rich-select (grouped options), command-palette (groups + items), file-upload (file list), data-grid (rows). Bounded lists (calendar weeks, color-picker swatches, pagination pages) left as `.map()`. Done 2026-04-24.
- [x] **P2 — Floating-ui restarts.** Audited: every `_startAutoUpdate` is gated by `changed.has('open'|'_open')` open-transition or by enter/leave handlers (tooltip). No restart on unrelated `updated()`. Done 2026-04-25.

## Component implementations

- [x] **P0 — DataGrid a11y.** Added `role=grid`, `aria-rowcount`, `aria-colcount`, `aria-sort`, `aria-selected`, `aria-multiselectable`, sortable header keyboard activation, row roving tabindex, ArrowUp/Down/Home/End nav, Space/Enter selection toggle. Done 2026-04-25.
- [x] **P1 — Button `type=submit` form-associated.** Added `static formAssociated = true`, `attachInternals()`, `name`/`value` props, `form` getter; submit/reset now route through internals. Submitter identity for `SubmitEvent` still limited by spec (custom elements can't be submitter); `requestSubmit()` invoked via `internals.form`. Done 2026-04-24.
- [x] **P1 — Asymmetric reset delegation.** Reset now uses internals same as submit. Done 2026-04-24.
- [x] **P1 — `composed: true` audit.** Reviewed all `composed: true` usages: every one is a public-facing event that needs to cross the shadow boundary (form `input`/`change`, `am-show/hide/open/close`, `am-toggle`, `am-row-select`, `am-sort`, `am-search`, etc.). `am-select-option` already switched to `composed: false` (light-DOM bubble). Done 2026-04-25.
- [x] **P2 — Theme-provider footgun.** Added `scripts/build-tokens-css.mjs` (wired into `npm run build`) that emits `dist/styles/tokens.css` with `:host` → `:root` and `:host([theme='dark'])` → `:root[data-theme="dark"]`. Exposed via `@willramanand/amris/styles/tokens.css` export. Done 2026-04-25.
- [x] **P2 — Reflecting string props.** Spot-checked badge, spinner, skeleton, divider, avatar, stat: every `reflect:true` enum prop is consumed by a `:host([prop=...])` CSS selector. No unused reflects found. Done 2026-04-25.
- [x] **P2 — Toast timer cleanup.** Verified: `disconnectedCallback` calls `_clearTimer()` (toast.ts:191-194). Done 2026-04-25.
- [x] **P2 — `override ariaLabel`.** Switched button to `label` prop (still bound to `aria-label` attribute), no longer overrides `ARIAMixin.ariaLabel`. Done 2026-04-25.

## Developer UX

- [x] **P0 — Verbose subpath imports.** Per-component `index.ts` barrels added; `package.json` exports `./components/*` → `./dist/components/*/index.js`. Now `import '@willramanand/amris/components/button'`. Done 2026-04-24.
- [x] **P1 — DataGrid uncontrolled-only.** Added `selectedKeys` controlled prop + `am-selection-change` event. Done 2026-04-24.
- [x] **P2 — CSS variable tokens not catalogued.** Audited: 30 components expose component-scoped override hooks via `@cssprop`; remaining 37 components consume only global theme tokens (documented at `am-theme-provider`). Added missing `@cssprop` entries to `am-button` for `--am-button-radius` and `--am-button-font-weight`. No undocumented component-scoped vars remain. New per-component override hooks tracked separately as feature work, not docs gap. Done 2026-04-25.
- [x] **P2 — No SSR / lit-ssr story.** Added SSR section to README (§17a) documenting client-only status, `dynamic({ ssr: false })`/`<ClientOnly>`/`onMount` patterns, tokens.css being SSR-safe, and `resetUniqueIdCounter()` usage for future deterministic SSR. DSD/`@lit-labs/ssr` deferred. Done 2026-04-25.
- [x] **P2 — `uniqueId()` SSR safety.** Exported `resetUniqueIdCounter()` from `@willramanand/amris/core` and root entry — call at start of each SSR request to keep IDs deterministic. Done 2026-04-25.

## Order of work

1. P0 — per-component barrels + exports map (fixes DX cliff before anyone consumes the package).
2. P0 — global listener lazy-attach (perf, low risk).
3. P0 — DataGrid render perf + a11y pass.
4. P1 — Button form-association.
5. P1 — DataGrid sort comparators + controlled selection.
6. P1 — `composed:true` audit.
7. P2 polish.
