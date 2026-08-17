---
"@willramanand/amris": minor
---

Freeze the public slot / `::part()` / `--am-*` token surface as the v1.0 contract (API-04, D-11)

The complete documented **slot**, **`::part()`**, and **`--am-*` token** surface is
now declared FROZEN in `api/AUDIT.md` and captured in
`api/custom-elements.baseline.json`. This is the published v1.0 styling/composition
contract — a **one-way door** (D-11): these names must not churn after 1.0.

### Frozen surface (post-normalization, Plans 03–08)

| Dimension | Count (unique) |
| --------- | -------------- |
| Global semantic `--am-*` tokens | 212 |
| Per-component `--am-{component}-*` `@cssprop` tokens | 54 |
| Slot names | 21 |
| `::part()` names | 76 |

### Newly documented token

One used-but-undocumented token flagged by the audit was tagged so it enters the
frozen contract (freeze decision `freeze-all-documented`):

| Token | Owner | Was | Now |
| ----- | ----- | --- | --- |
| `--am-z-toast` | `am-toast-region` | referenced in `css` (`z-index: var(--am-z-toast, 1500)`) but untagged — invisible to CEM | documented via `@cssprop --am-z-toast` and enumerated into the frozen surface |

This is **additive** — a comment-only `@cssprop` JSDoc tag documenting an already
consumer-overridable CSS custom property. No runtime behavior changes; the token's
`1500` fallback is unchanged. No slot, part, or token was renamed or removed, and
no element was added or removed from the CEM tagName set.

**Intentionally-internal exclusions:** _None_ — every used token/part/slot is now
part of the frozen public contract.
