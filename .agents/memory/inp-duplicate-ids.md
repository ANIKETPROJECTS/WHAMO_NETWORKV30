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

**Deeper import-side bug (found after the above):** even with export validation in place, *importing* a `.inp` file that already has duplicate `ELEM <id> AT <node>` declarations (e.g. two different flow boundaries both named `FBC7`) silently dropped one of them. `client/src/lib/inp-parser.ts` kept `elemAt` as a plain `Map<elemId, nodeId>` — `.set()` on a repeated key overwrote the earlier node, so only the last-declared node for that ID ever got its typed element (flowBoundary/pump/turbine/etc.); the other node silently fell back to a plain generic node in the graph. Fixed by adding `allElemAt: {id, nodeId}[]` (mirroring the existing `allElemLinks` pattern used for reused LINK ids) that records every AT occurrence, and switching all the node-type-creation loops in `buildReactFlowGraph` to iterate over `allElemAt` instead of `elemAt.forEach`. `elemAt` (the map) is kept only for first-occurrence property lookups. Any future WHAMO parsing code that maps "element ID → single node/link" must use the "all occurrences" array pattern, not a Map keyed by ID, whenever the source format doesn't guarantee unique IDs.
