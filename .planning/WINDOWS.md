---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-08-11T22:29:43.739Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | unrun-verify | src/components/dialog/dialog.ts | 196 | Overlay focus restoration lacks isConnected guard; restore to a removed opener silently no-ops (FIX-03, Phase 3) | open |  | 2026-08-11T22:29:43.739Z |  |

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
  }
]
````
