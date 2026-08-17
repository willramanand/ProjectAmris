---
"@willramanand/amris": minor
---

Normalize selection events under the change-vs-select split (`am-change`)

**Breaking change (D-02/D-04):** Value-changing selection controls now emit
`am-change` (the native `<select>` vocabulary), while discrete pick actions keep
`am-select`. The old selection event names are removed outright — there is no
backward-compat alias and no dual-firing.

| Component | Old event(s) | New event | Detail shape |
| --------- | ------------ | --------- | ------------ |
| `am-option` (consumed by `am-select`) | `am-select-option` | `am-change` | `{ value }` (unchanged, `composed: false` preserved) |
| `am-data-grid` | `am-row-select` + `am-selection-change` | `am-change` | `{ keys }` (aggregate selection set) |

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
