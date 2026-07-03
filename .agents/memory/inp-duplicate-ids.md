---
name: Duplicate element IDs cause JSON-vs-INP mismatches
description: Why the visual network graph can diverge from the exported/imported .inp file, and how it's now guarded against.
---

WHAMO requires globally unique IDs for flow boundaries, pumps, check valves, and turbines (each maps to exactly one property block in the .inp file). Conduits are the one exception — they may legitimately share a label across segments of the same physical pipe.

**Why:** A user-provided .inp file had `HPS8`, `PEN9`, `FBC7`, `FBC8` etc. each reused across two different branches of the network. Readers (including this app's own importer) silently keep only the first definition, so the second branch imports with wrong/missing properties — causing the rendered graph to not match the source .inp topology. There was previously no uniqueness check for these element types (only conduits had one), and duplicates could be introduced via manual label edits since there's no copy/paste feature.

**How to apply:**
- `client/src/lib/inp-generator.ts` now throws a descriptive error before export if any flowBoundary/pump/checkValve/turbine label is reused (checked across both nodes and edges, matching on `data.type`/`data.label`).
- `client/src/components/PropertiesPanel.tsx` has a `DuplicateLabelWarning` component shown inline under the Label/ID field for these four element types, warning the user live as they type.
- When detecting element "type" for validation, prefer `el.data?.type` over `el.type` — edges always carry a generic React Flow type like `"connection"`, so the real element kind only lives in `data.type`. Nodes mirror the kind on both fields.
