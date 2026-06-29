---
name: Help modal
description: How the Help & User Guide modal was implemented
---

`HelpModal.tsx` is a standalone full-screen overlay (not a shadcn Dialog) — it renders as `fixed inset-0 z-[60]`. It has a dark sidebar nav (slate-900) and a main content area.

**Key decisions:**
- `showHelp` state already existed in `Header.tsx` (line ~283) before this was implemented — just needed to be wired up.
- Help button placed immediately after the Arrange button in the title bar, separated by a divider.
- Uses `HelpCircle` icon from lucide-react (no custom asset needed).
- Section content is keyed in a `SECTION_CONTENT` record; adding new sections requires adding to `SECTIONS` array and `SECTION_CONTENT` record.
- Uses `z-[60]` to render above the FlexTable dialog (`z-50`).

**Why:** The modal is full-screen for readability of long documentation content. Using a fixed overlay rather than shadcn Dialog avoids z-index stacking issues with the already-open output requests sidebar.
