# Amris Public Contract — Frozen Slots, `::part()`s & `--am-*` Tokens

> **Generated** by `node scripts/build-contract-doc.mjs` from `dist/custom-elements.json`. Do NOT hand-edit — re-run the generator (`npm run build:contract-doc`). CI regenerates this file and fails on drift (`git diff --exit-code docs/contract.md`).

## What "frozen" means

At **v1.0**, the slot names, `::part()` names, and `--am-*` custom properties
enumerated on this page are the **frozen public contract** of `@willramanand/amris`.
You can build against them and trust that they will not churn:

- **They will not be renamed or removed within the 1.0 line.** A consumer who
  styles `::part(control)`, fills a named `<slot>`, or overrides an `--am-*`
  token can rely on that name continuing to work.
- **Any change to this surface is a versioned, deliberate act.** Adding, renaming,
  or removing a slot / part / token is a public-API change — it ships as a new
  release with a changeset, never silently.
- **CI blocks unversioned drift.** The surface is captured in
  `api/custom-elements.baseline.json` and checked by `npm run diff:surface`; this
  very document is regenerated from the same manifest and `git diff`-gated in CI,
  so it can never fall out of sync with the enforced surface.

Everything below is **generated from `dist/custom-elements.json`** — the same
Custom Elements Manifest the freeze gate enforces. It is the single source of
truth for the numbers and names on this page.

## Frozen surface at a glance

| Surface | Count |
| ------- | ----- |
| Global `--am-*` tokens (src/tokens/{primitives,semantic,dark}.css.ts) | **212** |
| Per-component `--am-*` tokens (CEM `@cssprop`) | **54** |
| Slots (unique names) | **21** |
| `::part()` names (unique) | **77** |

## Global `--am-*` tokens

All 212 global semantic/primitive tokens from
`src/tokens/{primitives,semantic,dark}.css.ts`. Override any of these on a host
element (or `:root`) to re-theme; every component reads them via `var(--am-*)`.

`--am-active-overlay`, `--am-border`, `--am-border-0`, `--am-border-1`, `--am-border-2`, `--am-border-strong`, `--am-border-subtle`, `--am-color-danger-100`, `--am-color-danger-200`, `--am-color-danger-300`, `--am-color-danger-400`, `--am-color-danger-50`, `--am-color-danger-500`, `--am-color-danger-600`, `--am-color-danger-700`, `--am-color-danger-800`, `--am-color-danger-900`, `--am-color-danger-950`, `--am-color-info-100`, `--am-color-info-200`, `--am-color-info-300`, `--am-color-info-400`, `--am-color-info-50`, `--am-color-info-500`, `--am-color-info-600`, `--am-color-info-700`, `--am-color-info-800`, `--am-color-info-900`, `--am-color-info-950`, `--am-color-neutral-0`, `--am-color-neutral-100`, `--am-color-neutral-1000`, `--am-color-neutral-150`, `--am-color-neutral-200`, `--am-color-neutral-300`, `--am-color-neutral-400`, `--am-color-neutral-50`, `--am-color-neutral-500`, `--am-color-neutral-600`, `--am-color-neutral-700`, `--am-color-neutral-800`, `--am-color-neutral-850`, `--am-color-neutral-900`, `--am-color-neutral-950`, `--am-color-primary-100`, `--am-color-primary-200`, `--am-color-primary-300`, `--am-color-primary-400`, `--am-color-primary-50`, `--am-color-primary-500`, `--am-color-primary-600`, `--am-color-primary-700`, `--am-color-primary-800`, `--am-color-primary-900`, `--am-color-primary-950`, `--am-color-secondary-100`, `--am-color-secondary-200`, `--am-color-secondary-300`, `--am-color-secondary-400`, `--am-color-secondary-50`, `--am-color-secondary-500`, `--am-color-secondary-600`, `--am-color-secondary-700`, `--am-color-secondary-800`, `--am-color-secondary-900`, `--am-color-secondary-950`, `--am-color-success-100`, `--am-color-success-200`, `--am-color-success-300`, `--am-color-success-400`, `--am-color-success-50`, `--am-color-success-500`, `--am-color-success-600`, `--am-color-success-700`, `--am-color-success-800`, `--am-color-success-900`, `--am-color-success-950`, `--am-color-warning-100`, `--am-color-warning-200`, `--am-color-warning-300`, `--am-color-warning-400`, `--am-color-warning-50`, `--am-color-warning-500`, `--am-color-warning-600`, `--am-color-warning-700`, `--am-color-warning-800`, `--am-color-warning-900`, `--am-color-warning-950`, `--am-danger`, `--am-danger-active`, `--am-danger-hover`, `--am-danger-subtle`, `--am-danger-text`, `--am-disabled-opacity`, `--am-duration-fast`, `--am-duration-instant`, `--am-duration-normal`, `--am-duration-slow`, `--am-duration-slower`, `--am-ease-default`, `--am-ease-in`, `--am-ease-in-out`, `--am-ease-out`, `--am-ease-spring`, `--am-focus-ring`, `--am-focus-ring-offset`, `--am-focus-ring-width`, `--am-font-mono`, `--am-font-sans`, `--am-hover-overlay`, `--am-info`, `--am-info-subtle`, `--am-info-text`, `--am-leading-none`, `--am-leading-normal`, `--am-leading-relaxed`, `--am-leading-snug`, `--am-leading-tight`, `--am-neutral-subtle`, `--am-primary`, `--am-primary-active`, `--am-primary-hover`, `--am-primary-subtle`, `--am-primary-subtle-hover`, `--am-primary-subtle-text`, `--am-primary-text`, `--am-radius-2xl`, `--am-radius-3xl`, `--am-radius-full`, `--am-radius-lg`, `--am-radius-md`, `--am-radius-none`, `--am-radius-sm`, `--am-radius-xl`, `--am-secondary`, `--am-secondary-active`, `--am-secondary-hover`, `--am-secondary-subtle`, `--am-secondary-subtle-hover`, `--am-secondary-text`, `--am-shadow-2xl`, `--am-shadow-lg`, `--am-shadow-md`, `--am-shadow-none`, `--am-shadow-overlay`, `--am-shadow-raised`, `--am-shadow-sm`, `--am-shadow-surface`, `--am-shadow-xl`, `--am-shadow-xs`, `--am-size-lg`, `--am-size-md`, `--am-size-sm`, `--am-space-0`, `--am-space-0-5`, `--am-space-1`, `--am-space-1-5`, `--am-space-10`, `--am-space-12`, `--am-space-16`, `--am-space-2`, `--am-space-2-5`, `--am-space-20`, `--am-space-24`, `--am-space-3`, `--am-space-4`, `--am-space-5`, `--am-space-6`, `--am-space-8`, `--am-space-px`, `--am-success`, `--am-success-subtle`, `--am-success-text`, `--am-surface`, `--am-surface-overlay`, `--am-surface-raised`, `--am-surface-sunken`, `--am-text`, `--am-text-2xl`, `--am-text-3xl`, `--am-text-4xl`, `--am-text-5xl`, `--am-text-6xl`, `--am-text-base`, `--am-text-disabled`, `--am-text-inverse`, `--am-text-lg`, `--am-text-link`, `--am-text-secondary`, `--am-text-sm`, `--am-text-tertiary`, `--am-text-xl`, `--am-text-xs`, `--am-tracking-normal`, `--am-tracking-tight`, `--am-tracking-tighter`, `--am-tracking-wide`, `--am-tracking-wider`, `--am-warning`, `--am-warning-subtle`, `--am-warning-text`, `--am-weight-bold`, `--am-weight-medium`, `--am-weight-regular`, `--am-weight-semibold`, `--am-z-base`, `--am-z-dropdown`, `--am-z-modal`, `--am-z-overlay`, `--am-z-popover`, `--am-z-sticky`, `--am-z-tooltip`

## Per-component `--am-*` tokens (`@cssprop`)

The 54 per-component `--am-{component}-*` tokens each element
documents. Set them on the element to tune it without piercing the Shadow DOM.

| Component | `--am-*` tokens (`@cssprop`) |
| --------- | ---------------------------- |
| `am-alert` | --am-alert-radius |
| `am-app-shell` | --am-app-shell-header-height, --am-app-shell-sidebar-width |
| `am-avatar` | --am-avatar-radius, --am-avatar-size |
| `am-breadcrumb` | --am-breadcrumb-separator |
| `am-button` | --am-button-font-weight, --am-button-radius |
| `am-card` | --am-card-padding, --am-card-radius |
| `am-dialog` | --am-dialog-padding, --am-dialog-radius |
| `am-divider` | --am-divider-color, --am-divider-spacing, --am-divider-width |
| `am-drawer` | --am-drawer-size |
| `am-field` | --am-field-gap |
| `am-grid` | --am-grid-gap, --am-grid-min |
| `am-icon` | --am-icon-color, --am-icon-size |
| `am-icon-button` | --am-icon-button-radius |
| `am-input` | --am-input-radius |
| `am-link-button` | --am-button-radius |
| `am-list` | --am-list-divider |
| `am-nav-bar` | --am-nav-bar-height, --am-nav-bar-padding |
| `am-panel` | --am-panel-padding, --am-panel-radius |
| `am-progress` | --am-progress-color, --am-progress-radius |
| `am-progress-ring` | --am-progress-ring-color, --am-progress-ring-size |
| `am-side-nav` | --am-side-nav-width |
| `am-skeleton` | --am-skeleton-color, --am-skeleton-highlight, --am-skeleton-radius |
| `am-spinner` | --am-spinner-color, --am-spinner-size, --am-spinner-track, --am-spinner-width |
| `am-split-view` | --am-split-view-divider-size, --am-split-view-min |
| `am-stack` | --am-stack-gap |
| `am-status-dot` | --am-status-dot-color, --am-status-dot-size |
| `am-surface` | --am-surface-padding, --am-surface-radius |
| `am-table` | --am-table-radius |
| `am-textarea` | --am-textarea-min-height, --am-textarea-radius |
| `am-toast-region` | --am-z-toast |
| `am-tooltip` | --am-tooltip-bg, --am-tooltip-color, --am-tooltip-radius |

## Slots (`@slot`)

The 21 unique named slots (plus the default slot) exposed for content
composition. Project content into a component with `slot="<name>"`.

| Component | Slots |
| --------- | ----- |
| `am-accordion` | (default) |
| `am-accordion-item` | (default), header |
| `am-alert` | (default), action, icon |
| `am-app-shell` | (default), footer, header, sidebar |
| `am-avatar` | (default) |
| `am-badge` | (default), prefix |
| `am-breadcrumb` | (default) |
| `am-breadcrumb-item` | (default) |
| `am-button-group` | (default) |
| `am-card` | (default), footer, header |
| `am-checkbox` | (default) |
| `am-context-menu` | (default), menu |
| `am-dialog` | (default), footer, header |
| `am-drawer` | (default), footer, header |
| `am-dropdown` | (default), content |
| `am-empty-state` | (default), action, heading, icon |
| `am-error-text` | (default) |
| `am-field` | (default), error, hint, label |
| `am-grid` | (default) |
| `am-hint-text` | (default) |
| `am-icon` | (default) |
| `am-icon-button` | (default) |
| `am-input` | prefix, suffix |
| `am-label` | (default) |
| `am-link-button` | (default), prefix, suffix |
| `am-list` | (default) |
| `am-list-item` | (default), description, prefix, suffix |
| `am-menu` | (default) |
| `am-menu-item` | (default), prefix, suffix |
| `am-nav-bar` | (default), actions, brand |
| `am-option` | (default) |
| `am-panel` | (default), header |
| `am-popover` | (default), content |
| `am-progress-ring` | (default) |
| `am-radio` | (default) |
| `am-radio-group` | (default) |
| `am-select` | (default) |
| `am-shortcuts` | (default) |
| `am-side-nav` | (default), footer, header |
| `am-side-nav-item` | (default), prefix |
| `am-split-view` | end, start |
| `am-stack` | (default) |
| `am-stat` | (default), description, icon, label |
| `am-status-dot` | (default) |
| `am-surface` | (default) |
| `am-switch` | (default) |
| `am-tab` | (default) |
| `am-tab-panel` | (default) |
| `am-table` | (default) |
| `am-tabs` | (default), nav |
| `am-theme-provider` | (default) |
| `am-timeline` | (default) |
| `am-timeline-item` | (default), heading, icon, timestamp |
| `am-toast` | (default), icon |
| `am-toast-region` | (default) |
| `am-tooltip` | (default) |
| `am-tree-item` | (default), icon |
| `am-tree-view` | (default) |
| `am-visually-hidden` | (default) |

## `::part()` names (`@csspart`)

The 77 unique `::part()` names exposed for external styling. Target
them from outside the Shadow DOM with `am-component::part(<name>) { … }`.

| Component | Parts |
| --------- | ----- |
| `am-accordion-item` | body, chevron, header |
| `am-alert` | action, alert, content, icon |
| `am-app-shell` | footer, header, main, sidebar |
| `am-avatar` | fallback, image, initials |
| `am-badge` | badge, remove |
| `am-breadcrumb` | nav |
| `am-breadcrumb-item` | link, separator |
| `am-button-group` | group |
| `am-calendar` | day, grid, header |
| `am-card` | body, card, footer, header |
| `am-checkbox` | control, error, label |
| `am-color-picker` | error, panel, swatch |
| `am-combobox` | input, label, listbox |
| `am-command-palette` | dialog, input, item, list |
| `am-context-menu` | panel |
| `am-data-grid` | body, cell, header, header-cell, row, table |
| `am-date-picker` | calendar, input |
| `am-dialog` | backdrop, body, close, dialog, footer, header |
| `am-drawer` | body, close, dialog, footer, header |
| `am-dropdown` | panel |
| `am-empty-state` | action, body, container, heading, icon |
| `am-field` | field |
| `am-file-upload` | dropzone, file-list |
| `am-icon` | svg |
| `am-icon-button` | button |
| `am-input` | clear, error, input, label, wrapper |
| `am-input-otp` | cell, error |
| `am-label` | label |
| `am-link-button` | label, link |
| `am-list` | list |
| `am-list-item` | content, item, prefix, suffix |
| `am-nav-bar` | actions, brand, items, nav |
| `am-number-field` | decrement, error, increment, input |
| `am-panel` | body, header, panel |
| `am-popover` | arrow, popover |
| `am-progress` | fill, track |
| `am-progress-ring` | fill, track |
| `am-radio` | control, label |
| `am-rich-select` | listbox, trigger |
| `am-search-field` | clear, input, wrapper |
| `am-select` | clear, label, listbox, trigger |
| `am-side-nav` | nav |
| `am-side-nav-item` | item |
| `am-skeleton` | skeleton |
| `am-slider` | error, input |
| `am-split-view` | divider, end, start |
| `am-stack` | stack |
| `am-stat` | description, label, stat, trend, value |
| `am-status-dot` | dot, label |
| `am-surface` | surface |
| `am-switch` | error, label, thumb, track |
| `am-tab` | tab |
| `am-table` | table |
| `am-tabs` | nav |
| `am-textarea` | clear, error, label, textarea, wrapper |
| `am-time-picker` | input |
| `am-timeline-item` | content, dot, item |
| `am-toast` | toast |
| `am-tooltip` | arrow, tooltip |
| `am-tree-item` | children, label |
