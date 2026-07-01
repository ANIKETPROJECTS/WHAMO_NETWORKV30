---
name: INP parser comment extraction
description: How extractComments() in inp-parser.ts decides which comment lines become an element's user-visible comment
---

WHAMO .inp files mix real user annotations with generic section-header/divider
comments (e.g. "c RESERVOIRS", "c ELEMENT PROPERTIES", "c ***...***"). The
parser's `extractComments()` used to treat every comment line as a pending
comment and attach whichever one immediately preceded an element block — so
generic headers got misattached as that element's comment whenever no real
comment separated them.

**Why:** the header text is a section divider for the whole file, not an
annotation for the specific element that happens to follow it; attaching it
produced spurious comments like "TURBINES" or "ELEMENT PROPERTIES" on
reservoirs/turbines/valves after import.

**How to apply:** `extractComments()` now skips setting `pendingComment` for
lines matching `GENERIC_SECTION_HEADERS` (case-insensitive, whitespace-
collapsed) or purely decorative lines (rows of `*`/`-`/`=`). If a real comment
follows a header line before the element, it naturally overwrites the pending
value, so genuine per-element comments are unaffected. Extend the allowlist if
new generic header phrases are found in other sample .inp files.
