---
"@willramanand/amris": minor
---

Normalize the remaining event/prop outliers (D-03 full normalization)

**Breaking change (D-03/D-04):** The final pre-1.0 rename wave normalizes every
remaining outlier the consistency audit surfaced beyond the overlay (Plan 03) and
selection (Plan 04) waves. Old names are removed outright — there is no
backward-compat alias and no dual-firing.

### Event rename

| Component(s) | Old event | New event | Detail shape |
| ------------ | --------- | --------- | ------------ |
| `am-tabs` (also observed on `am-tab` / `am-tab-panel`) | `am-tab-change` | `am-change` | `{ panel }` (unchanged) |

The value-changing tabs event now uses the canonical `am-change` vocabulary,
matching `am-pagination`. Expand-state events (`am-accordion` / `am-tree-view`
`am-toggle`) are a distinct semantic and are left unchanged; `am-pagination`
`am-change` was already canonical and is unchanged.

### Property / attribute renames

| Component | Old prop (attribute) | New prop (attribute) | Rationale |
| --------- | -------------------- | -------------------- | --------- |
| `am-combobox` | `select` (`select`) | `searchInTrigger` (`search-in-trigger`) | Boolean collided with the `<am-select>` element name and read ambiguously |
| `am-combobox` | `async` (`async`) | `remote` (`remote`) | `async` reads as a reserved JS concept; `remote` names the server-fed behavior |

Combobox runtime behavior is unchanged — only the public property names and their
reflected attributes are renamed (internals refactor is a later plan).

**Migration:**
- `am-tabs` consumers: rebind any `am-tab-change` listener to `am-change`
  (`event.detail.panel` is unchanged).
- `am-combobox` consumers: rename the `select` attribute/property to
  `search-in-trigger` / `searchInTrigger`, and the `async` attribute/property to
  `remote`.
