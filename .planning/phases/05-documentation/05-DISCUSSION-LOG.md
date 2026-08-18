# Phase 05: Documentation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-18
**Phase:** 05-documentation
**Areas discussed:** Docs home / format, README treatment, Frozen contract doc, Storybook examples (DOCS-03)

---

## Docs home / format

| Option | Description | Selected |
|--------|-------------|----------|
| Markdown in-repo + Storybook | Prose docs as Markdown under `docs/` linked from README (GitHub-native); Storybook home for runnable examples; retire `docs/*.html`. | ✓ |
| Storybook Docs single source | MDX + CEM autodocs as sole source; requires hosting Storybook; GitHub-landing consumers see nothing. | |
| Extend existing HTML site | Keep building `docs/*.html`; not published, duplicates Storybook, drifts from CEM. | |

**User's choice:** Markdown in-repo + Storybook
**Notes:** Consumers install from GitHub Packages and read on GitHub — Markdown renders natively there. Hand-authored HTML site is retired/frozen, not expanded.

---

## README treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Rebuild as consumer quick-start | Replace roadmap/vision doc with consumer-first README (install, peer-dep, browser floor, usage, links); move vision prose out. | ✓ |
| Layer onto existing README | Keep 702-line roadmap, add install/usage at top. | |
| Rebuild + keep vision section | Quick-start on top, trimmed vision lower in same file. | |

**User's choice:** Rebuild as consumer quick-start
**Notes:** Current README is a "Library Roadmap/Vision" doc, not a package entry point. Vision prose relocated (destination = Claude's discretion), not lost.

---

## Frozen contract doc

| Option | Description | Selected |
|--------|-------------|----------|
| Generate from CEM | Script generates slot/part/token reference from `custom-elements.json` (same source Phase 6's gate guards) + hand-written freeze intro; CI-regenerable. | ✓ |
| Curated hand-written | Hand-write from `api/AUDIT.md`; readable but 212 tokens + 76 parts + 21 slots drift-prone. | |
| Point to AUDIT.md | Link the internal audit tables; lowest effort, not consumer-shaped. | |

**User's choice:** Generate from CEM
**Notes:** Consistent with house style (AUDIT.md, tokens.css, baseline all generated). Follow `scripts/build-audit.mjs` pattern.

---

## Storybook examples (DOCS-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated pattern stories | New `patterns/validation.stories.ts` + `patterns/virtualization.stories.ts`, runnable interactive. | ✓ |
| Augment component stories | Add to data-grid/combobox/input stories; co-located but fragmented. | |
| Static examples | Non-interactive snapshots; loses "runnable" value. | |

**User's choice:** Dedicated pattern stories
**Notes:** Cross-cutting patterns span multiple components; pattern-level home is findable. Interactive (live controls), not static.

---

## Claude's Discretion

- Destination for relocated vision prose (`docs/vision.md`, `CONTRIBUTING.md`, or `.planning/`).
- Directory layout / filenames under `docs/`.
- Whether FEAT-03/04 shortcut registry gets its own usage page or folds into general usage docs.
- Whether validation prose docs and validation Storybook examples cross-link.

## Deferred Ideas

- Publishing / hosting a public Storybook — separate concern (Phase 6 or post-1.0).
- Docs versioning — post-1.0.
- Full per-component API reference site beyond the frozen-contract doc — Storybook autodocs already covers it.
