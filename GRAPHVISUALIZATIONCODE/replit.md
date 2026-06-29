# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### WHAMO Viewer (`artifacts/whamo-viewer`)
- **Purpose**: Visualize WHAMO simulation `.OUT` files
- **Features**: 
  - Upload .OUT files via drag-and-drop or file picker
  - Parses the SIMULATION SUMMARY section
  - 3 profile charts: Energy Elevation, Discharge, Time of Occurrence
  - Uses Recharts for visualization
  - Clean white professional theme
  - Expandable raw data table
- **Key files**:
  - `src/lib/parser.ts` — .OUT file parser extracting simulation summary data
  - `src/components/ProfileChart.tsx` — Recharts-based visualization (3 charts)
  - `src/components/FileUpload.tsx` — Drag-and-drop file upload
  - `src/components/DataTable.tsx` — Raw data table view
  - `src/components/SummaryInfo.tsx` — File metadata display

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
