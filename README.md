# Sales Connection Explorer MVP

A premium React application for visualizing and exploring transactional relationships between companies.

## Tech Stack
- **Framework**: React 18 with Vite
- **Language**: TypeScript
- **Visualization Engine**: Cytoscape.js with fcose layout algorithm
- **Data Parsing**: SheetJS (xlsx) for static Excel parsing
- **Styling**: Vanilla CSS with glassmorphism and modern dark mode
- **State Management**: React Context + useReducer

## Setup & Run
1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Build for production: `npm run build`

## Architecture & Data
This application operates entirely on the frontend. The data source is a single static Excel file (`Sales Connection.xlsx`) located in `src/assets/data/`. The file is bundled by Vite and fetched locally.

**Important Data Caveats for Maintainers**:
- The Excel parser relies strictly on the column headers as currently defined.
- If the Excel schema changes, `src/parsers/columnMaps.ts` must be updated.
- The `Data Perusahaan` sheet is used as the master list of "Internal" companies.
- Do not add extraneous header rows above the main header row without adjusting the `startRow` index in `src/parsers/index.ts`.
