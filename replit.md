# WHAMO Water Hammer Network Designer

## Overview

This is a web-based visual network designer for WHAMO (Water Hammer and Mass Oscillation) hydraulic analysis software. The application allows engineers to graphically design water distribution networks using an interactive node-graph editor, configure element properties, and export the network topology to WHAMO's `.inp` file format for hydraulic simulation.

The application supports various hydraulic components including reservoirs, nodes, junctions, surge tanks, and flow boundaries, connected by conduits (pipes) with configurable properties like length, diameter, celerity, and friction factors.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built using Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: Zustand for managing complex network state (nodes, edges, selections)
- **Data Fetching**: TanStack React Query for server state management
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Canvas/Diagram Editor**: @xyflow/react (React Flow) for interactive node-based diagram editing

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **API Pattern**: RESTful API with typed routes defined in shared schema
- **Development**: tsx for TypeScript execution, Vite for HMR in development
- **Production Build**: esbuild bundles server code, Vite builds client assets

### Data Storage
- **Storage**: In-memory storage (no database required)
- **Schema Location**: `shared/schema.ts` contains type definitions and Zod validation schemas

### Project Structure
```
├── client/src/          # React frontend
│   ├── components/      # UI components (NetworkNode, PropertiesPanel, Toolbar)
│   ├── pages/           # Route pages (Designer, Home)
│   ├── lib/             # Utilities (store, queryClient, inp-generator)
│   └── hooks/           # Custom React hooks
├── server/              # Express backend
│   ├── routes.ts        # API route handlers
│   ├── storage.ts       # Database access layer
│   └── db.ts            # Drizzle database connection
├── shared/              # Shared code between client/server
│   ├── schema.ts        # Database schema + application types
│   └── routes.ts        # API route definitions with Zod validation
└── migrations/          # Drizzle migration files
```

### Key Design Patterns
- **Shared Types**: TypeScript types and Zod schemas are defined once in `shared/` and used by both frontend and backend
- **Type-Safe API**: Route definitions include input validation and response schemas
- **Component Architecture**: Custom React Flow node types for each hydraulic element (ReservoirNode, SimpleNode, JunctionNode, etc.)
- **Client-Side File Generation**: INP file export logic runs in the browser for immediate feedback
- **Visualization**: Tools → Visualization opens a full-screen overlay for loading and analyzing `.OUT` files with Profile Graph (animated HGL) and History Graph (time series). All parsing is done client-side, no server required. Components in `client/src/components/visualization/`, parsers in `client/src/lib/out-parser.ts` and `client/src/lib/history-parser.ts`.

## External Dependencies

### Database
- **In-Memory Storage**: Currently using in-memory storage (MemStorage class in server/storage.ts)
- **Drizzle ORM**: Schema definitions available for future database integration

### Key NPM Packages
- **@xyflow/react**: Interactive node-graph diagram editor for the network canvas
- **zustand**: Lightweight state management for network state synchronization
- **file-saver**: Client-side file download for exporting `.inp` and `.json` files
- **drizzle-orm / drizzle-zod**: Database ORM with Zod schema generation
- **@tanstack/react-query**: Server state management and caching

### UI Libraries
- **@radix-ui/***: Accessible UI primitive components
- **shadcn/ui**: Pre-built component library (new-york style variant)
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library

### Development Tools
- **Vite**: Frontend build tool with HMR
- **tsx**: TypeScript execution for server
- **esbuild**: Production server bundling

## Replit Environment Notes

- The app runs on port 5000 (required for webview output on Replit)
- Workflow: `Start application` runs `npm run dev` and exposes port 5000 as a webview
- Deployment build: `npm run build` → `node ./dist/index.cjs`
- No database is required — in-memory storage is used
- The WHAMO engine (`server/engines/WHAMO.EXE`) requires `wine` to run on Linux and is executed in an isolated temporary directory without invoking a shell