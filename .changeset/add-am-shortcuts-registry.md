---
"@willramanand/amris": minor
---

Add the `am-shortcuts` keyboard-shortcut provider and registry

**New public element:** `am-shortcuts` is a provider element that hosts a
keyboard-shortcut registry for its subtree. Descendant components (and host
applications) call the registry's `register(...)` contract to bind key
combinations to commands, with the provider owning dispatch and lifecycle.

**Registry `register(...)` contract:**

| Capability | Behavior |
| ---------- | -------- |
| Scopes | Shortcuts are registered within a scope so overlapping bindings can coexist across regions of the app |
| `mod` / `opt` normalization | `mod` resolves to Cmd on macOS and Ctrl elsewhere; `opt` resolves to the platform's Alt/Option, so bindings are authored once and normalized per platform |
| Conflict detection | Registering a combination already bound in the same active scope is detected and surfaced rather than silently shadowed |
| Reserved-combo blocklist | Browser/OS-reserved combinations are blocked from registration to avoid hijacking essential shortcuts |

**Command palette refactor:** `am-command-palette` now consumes the shared
registry and supports a rebindable modifier for its open shortcut
(rebindable-`mod`+`k`) instead of a hardcoded combination.

No breaking changes — `am-shortcuts` and the registry are new additive public
surface.
