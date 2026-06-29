---
name: Excel multi-sheet export/import
description: How the multi-sheet workbook export/import was implemented in excel-io.ts
---

The core sheet-building logic was extracted from `exportTabToExcel` into a private `_addWorksheetToWb` function. Both the single-tab export and the new multi-sheet export delegate to this helper.

**Key pattern:**
- `_addWorksheetToWb(wb, filter, rows, globalUnit, tabLabel, hSchedules, listSheetSuffix)` — adds one worksheet to an existing workbook. The `listSheetSuffix` parameter avoids name collisions for hidden `_Lists` sheets (e.g. `_Lists_Conduit`, `_Lists_Reservoir`).
- `exportTabToExcel` — thin wrapper that creates its own workbook, calls `_addWorksheetToWb`, then downloads.
- `exportAllSheetsToExcel` — creates one workbook, loops over `ALL_SHEET_TYPES`, calls `_addWorksheetToWb` for each type that has rows, downloads as `whamo_all_<ProjectName>_YYYY-MM-DD.xlsx`.
- `importAllSheetsFromExcel` — reads each worksheet, maps sheet name → FilterKey via `SHEET_LABEL_TO_FILTER`, processes rows using same column/label matching as single-tab import, returns `ImportAllResult` with per-sheet summary.

**Why:** Users need to export all element types in one workbook and import them back after editing — the per-tab workflow was cumbersome for large networks.

**How to apply:** When filter is `'all'` in FlexTable.tsx, call the multi-sheet variants. For any other filter, use the original single-tab functions. Sheet names must match `ALL_SHEET_TYPES` labels exactly for import matching.
