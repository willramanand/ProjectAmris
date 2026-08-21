---
phase: 03
slug: reliability-leak-fixes
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-08-17
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

This phase hardens component lifecycle teardown (timers, animation listeners, focus restoration) and fixes three code-review defects. It adds **no attack surface**: no user-input parsing, no network I/O, no new DOM sinks, no `innerHTML`/`eval`, and no new dependency installs. The frozen public API surface is unchanged (CEM surface diff: no drift).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| (none new) | Internal Web Component lifecycle only — teardown/focus/animation hardening across am-toast, am-dialog, am-drawer, am-command-palette, and 6 existing overlays. No trust boundary crossed. | None |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-03-01 | Denial of Service | am-toast dismiss timer | low | mitigate | `TeardownScope` bounds the 300ms fallback + `animationend` listener to the connected component; drained by `_clearTimer()` (called by `disconnectedCallback`). Verified: `toast.ts:219,260,277-278`. | closed |
| T-03-02 | Denial of Service | am-dialog nudge animation listener | low | mitigate | `disconnectedCallback` drains `TeardownScope`; `_nudge` listener bound to `_teardown.signal`. Verified: `dialog.ts:185-189,241`. | closed |
| T-03-03 | Denial of Service | am-dialog focus restoration | low | mitigate | `isConnected` guard prevents `focus()` against disconnected nodes on close. Verified: `dialog.ts:213`. | closed |
| T-03-04 | Denial of Service | am-drawer / am-command-palette focus restoration | low | mitigate | `isConnected` guard on both close paths. Verified: `drawer.ts:217`, `command-palette.ts:232`. | closed |
| T-03-05 | Denial of Service | 6 overlay components' document listeners (combobox, dropdown, context-menu, date-picker, popover, tooltip) | low | accept | Already gated-on-open + torn-down-on-disconnect; proven green by the TEST-05 teardown-spy suites. All six carry `disconnectedCallback`. No change required. | closed |
| T-03-SC | Tampering | package installs (supply chain) | n/a | accept | No npm/pip/cargo installs in this phase — internal source + tests only. No supply-chain surface introduced. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

All dispositions are `mitigate` (implemented and verified in source) or `accept` (documented). Every threat is low or n/a severity; `security_block_on` is `high`, so nothing counts toward the blocking gate. `threats_open: 0`.

The 03-04 gap-closure changes (command-palette `_ordered` ordering, `else if (prev)` lifecycle guards, toast `animationName` gate) are pure correctness/lifecycle logic — no new sinks, no new surface — and introduce no new threats.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-03-05 | The 6 overlays' document click/keydown teardown is pre-existing, gated-on-open, and asserted green by TEST-05 spies; re-implementing 6 working components would add regression risk against the phase no-regression directive. | willramanand | 2026-08-17 |
| AR-03-02 | T-03-SC | No dependency installs occur in this phase; there is no supply-chain surface to mitigate. | willramanand | 2026-08-17 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-17 | 6 | 6 | 0 | gsd-secure-phase (L1 grep-depth; register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-17
