---
name: OPPUMP mode parsing
description: OPPUMP keyword stores operation mode (PUMP/SHUTOFF/MOTORSTARTUP/NORMALSTOP) and optional TOFF value — previously lost, now stored in pump data.
---

# OPPUMP mode parsing

## The rule
`oppumps` in `ParsedElements` is a `Map<string, { mode: string; toff?: number }>`, not a `Set`. The mode comes from parsing the OPPUMP keyword on the same line.

**Why:** INP files have two forms:
- `OPPUMP ID P1 PUMP FINISH` — pump runs continuously
- `OPPUMP ID P1 SHUTOFF TOFF 100.0 FINISH` — pump shuts off at t=100s

The old `Set<string>` lost this distinction; the generator always wrote `PUMP FINISH`, breaking round-trips for shutoff scenarios.

**How to apply:** 
- Parser: `oppumps.set(id, { mode, toff? })` — mode extracted with regex `/(PUMP|SHUTOFF|MOTORSTARTUP|NORMALSTOP)/i`
- Pump edge/node data: include `pumpOpMode: oppumpInfo?.mode ?? 'PUMP'` and `pumpToff: oppumpInfo?.toff`
- Generator: check `pumpOpMode` and emit `OPPUMP ID X SHUTOFF TOFF Y FINISH` or `OPPUMP ID X PUMP FINISH`
- Both `NodeData` and `EdgeData` in store.ts have `pumpOpMode?: string` and `pumpToff?: number`

## Pump-as-LINK topology (these INP files)
Pumps declared as `ELEM P1 LINK 4 5` become React Flow edges (type='connection', data.type='pump').
Check valves declared as `ELEM VC1 LINK 5 6` become React Flow edges (type='connection', data.type='checkValve').
The same conduit ID reused multiple times (e.g. C5 LINK 11 12, C5 LINK 12 13...) creates one edge per occurrence — all with the same label and properties.
