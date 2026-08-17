---
"@willramanand/amris": minor
---

Normalize overlay lifecycle events to `am-open`/`am-close`

**Breaking change (D-01/D-04):** The three overlay outliers now emit the canonical
open/close lifecycle events, matching the native `<dialog>` vocabulary and the
existing majority (`am-dialog`, `am-drawer`, `am-command-palette`, `am-toast`).
The old event names are removed outright — there is no backward-compat alias and
no dual-firing.

| Component | Old event | New event |
| --------- | --------- | --------- |
| `am-dropdown` | `am-show` | `am-open` |
| `am-dropdown` | `am-hide` | `am-close` |
| `am-popover` | `am-show` | `am-open` |
| `am-popover` | `am-hide` | `am-close` |
| `am-context-menu` | `am-show` | `am-open` |
| `am-context-menu` | `am-hide` | `am-close` |

**Migration:** Rebind any listeners on these components from `am-show`/`am-hide`
to `am-open`/`am-close`. The already-canonical overlays (`am-dialog`, `am-drawer`,
`am-command-palette`, `am-toast`, `am-alert`) are unchanged.
