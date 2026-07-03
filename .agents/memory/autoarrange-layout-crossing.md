---
name: Auto-arrange layout crossing bug
description: Why the "Arrange" layout button could visually cross two parallel, non-intersecting network branches even when the underlying topology/data was correct.
---

The layered auto-layout ("Arrange" button) sorts nodes within each depth level to minimize edge crossings. The original implementation scored each node by averaging the Y-position of BOTH its parents and its children in a single pass, repeated 3 times, using the same shared `tempY` map for all levels simultaneously.

**Why:** This mixes both directions of influence at once, so a level's sort order can flip in a way that contradicts the sort order of the adjacent level it's connected to, even when the true data/topology is a set of parallel, never-crossing branches. Confirmed on a real WHAMO `.inp` import with two independent symmetric branches (e.g. `Node26→Node27` and `Node31→Node32`) — the raw parsed data and initial import layout had them correctly side-by-side/non-crossing, but after running "Arrange" the two branches were swapped between adjacent levels, producing a visible "hourglass" crossing that did not exist in the reference software's rendering or in the source file.

**How to apply:** Fixed by replacing the single simultaneous-average barycenter pass with the standard two-phase Sugiyama approach in `client/src/lib/store.ts` `autoArrange`:
1. Seed the initial per-level order via a BFS traversal from the seed (source) nodes — this visits each parent's children consecutively so sibling subtrees start out grouped/non-crossing.
2. Refine with alternating down-sweep (order by parents' already-fixed index) / up-sweep (order by children's already-fixed index) passes using the **median** of neighbor indices, never both directions at once.

Any future layout/crossing-reduction work on this graph should keep this alternating-direction-with-median pattern rather than reverting to a simultaneous parents+children average, which is the specific pattern that caused the regression.
