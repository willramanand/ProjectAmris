---
schema_version: 1
open_count: 4
waived_count: 0
fixed_count: 0
total_count: 4
last_updated: 2026-08-27T22:52:25.835Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | unrun-verify | src/components/dialog/dialog.ts | 196 | Overlay focus restoration lacks isConnected guard; restore to a removed opener silently no-ops (FIX-03, Phase 3) | open |  | 2026-08-11T22:29:43.739Z |  |
| 2 | 06 | deviation | docs/contract.md |  | Pre-existing stale docs/contract.md (::part count 76->77, new am-shortcuts slot, new error parts on am-checkbox/am-color-picker); npm run build regenerates it; CI Contract-doc drift check will fail until regenerated+committed. Out of scope for 06-01 (touches no src/ or contract generator). See phase deferred-items.md. | open |  | 2026-08-19T17:25:13.375Z |  |
| 3 | 06 | unmet-truth | .size-limit.json |  | Pre-existing: npm run size RED on base commit 3274a9a with zero edits (core 25.07kB/23, full 68.16kB/55, data-grid 11.99kB/3.5). SHIP-02 truth 'Phase 1 tree-shaking/size canary stays green' is unmet. Plan 06-02 changes are size-neutral (identical numbers with/without edits) — NOT caused by 06-02. size CI job will fail until budgets are re-baselined or bundles shrunk (user decision). Out of scope for 06-02. | open |  | 2026-08-19T17:45:32.349Z |  |
| 4 | 10 | todo | src/components/card/card.ts | 84 | Empty-slot-collapse :not(:has(::slotted(*))) rules across 6 layout components are inert: ::slotted pseudo-element is invalid inside :has(), so browsers drop the rule (verified Chromium selector(:has(::slotted(*)))=false). Guarded for COMPAT-06; repairing the collapse feature is a separate behavior-changing decision (out of scope this phase). | open |  | 2026-08-27T22:52:25.835Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "src/components/dialog/dialog.ts",
    "line": 196,
    "description": "Overlay focus restoration lacks isConnected guard; restore to a removed opener silently no-ops (FIX-03, Phase 3)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-11T22:29:43.739Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "06",
    "file": "docs/contract.md",
    "line": null,
    "description": "Pre-existing stale docs/contract.md (::part count 76->77, new am-shortcuts slot, new error parts on am-checkbox/am-color-picker); npm run build regenerates it; CI Contract-doc drift check will fail until regenerated+committed. Out of scope for 06-01 (touches no src/ or contract generator). See phase deferred-items.md.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-19T17:25:13.375Z",
    "resolved_at": null
  },
  {
    "id": 3,
    "kind": "unmet-truth",
    "phase": "06",
    "file": ".size-limit.json",
    "line": null,
    "description": "Pre-existing: npm run size RED on base commit 3274a9a with zero edits (core 25.07kB/23, full 68.16kB/55, data-grid 11.99kB/3.5). SHIP-02 truth 'Phase 1 tree-shaking/size canary stays green' is unmet. Plan 06-02 changes are size-neutral (identical numbers with/without edits) — NOT caused by 06-02. size CI job will fail until budgets are re-baselined or bundles shrunk (user decision). Out of scope for 06-02.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-19T17:45:32.349Z",
    "resolved_at": null
  },
  {
    "id": 4,
    "kind": "todo",
    "phase": "10",
    "file": "src/components/card/card.ts",
    "line": 84,
    "description": "Empty-slot-collapse :not(:has(::slotted(*))) rules across 6 layout components are inert: ::slotted pseudo-element is invalid inside :has(), so browsers drop the rule (verified Chromium selector(:has(::slotted(*)))=false). Guarded for COMPAT-06; repairing the collapse feature is a separate behavior-changing decision (out of scope this phase).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-27T22:52:25.835Z",
    "resolved_at": null
  }
]
````
