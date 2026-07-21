## Context

Sales Connection Explorer MVP is a greenfield, frontend-only application. There is no existing codebase, no backend, no database. The sole data source is a static Excel file (`Sales Connection.xlsx`) bundled with the application. The tech stack is React + TypeScript + Vite + Cytoscape.js + SheetJS (`xlsx`). The application must run entirely in the browser with no server-side processing.

The product visualizes Seller → Buyer transaction relationships as an interactive network graph. Data comes from five worksheets: FM, FK, FM_CRTX, FK_CRTX (transaction sheets) and Data Perusahaan (company master). Node classification uses three hard-coded business rules: Data Perusahaan companies are Internal; PT Software Farmer Indonesia is Distributor; CV Berkah Cahaya Abadi is Special External; all others are External.

## Goals / Non-Goals

**Goals:**
- Parse and normalize `Sales Connection.xlsx` entirely in the browser at startup
- Render a performant, interactive Cytoscape.js network graph with 4 distinct node types
- Support independent layer toggling for FM, FK, FM_CRTX, FK_CRTX datasets
- Implement Focus Mode (click node → auto-center, zoom, blur, highlight chain, Company Detail Panel)
- Implement Company Explorer (search → Focus Mode)
- Implement Relationship Detail Panel (click edge → metadata panel)
- Implement Statistics Panel with aggregate business metrics
- Deliver a visually premium, production-quality UI

**Non-Goals:**
- No file upload in MVP (Phase 2)
- No backend, API, or database in MVP (Phase 3)
- No authentication or access control
- No CRUD operations
- No real-time data updates
- No export functionality

## Decisions

### D1: Build System — Vite over Create React App

**Decision**: Use Vite + React + TypeScript.

**Rationale**: Vite offers significantly faster HMR, smaller bundles, and native ESM support. CRA is officially deprecated. For a graph-heavy application, fast dev iteration is critical.

**Alternative considered**: Next.js — rejected because SSR/SSG is irrelevant for a static, client-only data app with no routing complexity.

---

### D2: Graph Library — Cytoscape.js (as specified in PRD)

**Decision**: Use Cytoscape.js with an appropriate layout plugin.

**Rationale**: PRD specifies Cytoscape.js explicitly. It handles large graphs efficiently, supports custom styling per node type, and has rich interaction APIs (tap, select, zoom, fit).

**Layout plugin decision**: Use `cytoscape-fcose` (Force-Directed Clustered layout with overlap prevention) over the built-in `cose` layout. `fcose` produces cleaner, less-overlapping layouts for business network graphs and supports incremental layout when layers toggle.

**Alternative considered**: `cytoscape-cola` — good for constraint-based layouts but slower for large graphs; `dagre` — too rigid for a multi-directional business network.

---

### D3: Excel Parsing — SheetJS (xlsx) at App Startup

**Decision**: Parse the Excel file once at application startup using `xlsx.read()` with the file imported as a raw binary via Vite's `?url` asset import. Cache the parsed result in a React context.

**Rationale**: Parsing at startup means all subsequent interactions (layer toggles, search, focus) operate on pre-normalized in-memory data with no latency. The Excel file is small enough that one-time parsing cost is negligible.

**Alternative considered**: Lazy parse on first graph render — rejected because it introduces a visible delay on the main interactive surface.

---

### D4: State Management — React Context + useReducer (no Redux)

**Decision**: Use a single `GraphDataContext` that holds the full normalized graph data and a `UIContext` for UI state (active layers, selected node/edge, search query, focus mode state).

**Rationale**: The application has no server state to synchronize and no deeply nested async flows. Context + useReducer provides sufficient predictability without the boilerplate of Redux or the magic of Zustand.

**Alternative considered**: Zustand — viable, but adds a dependency for a use case that Context handles cleanly.

---

### D5: Smart Edge Merge Strategy

**Decision**: When multiple transaction rows in the same or different datasets share the same (seller, buyer) pair, merge them into a single Cytoscape edge. The merged edge stores:
- `invoiceCount`: total number of source rows
- `totalDPP`: sum of DPP across rows
- `totalPPN`: sum of PPN across rows
- `approvalStatus`: array of distinct approval values
- `datasets`: array of dataset sources (e.g., `["FM", "FK"]`)
- `periods`: array of distinct period values

**Rationale**: Without smart merge, the graph would have many parallel edges between the same pair of companies, making the visualization unreadable. The PRD explicitly requires smart merge.

**Key rule**: A separate edge per dataset is maintained at the data model level (for layer filtering) but rendered as a single composite edge when multiple active layers share the same pair.

---

### D6: Node Classification Priority Order

**Decision**: Apply classification in this priority order:
1. **Distributor**: company name === "PT Software Farmer Indonesia"
2. **Special External**: company name === "CV Berkah Cahaya Abadi"
3. **Internal**: company name exists in Data Perusahaan worksheet
4. **External**: default for all others

**Rationale**: The PRD defines these three special-case companies. Priority ordering ensures the named overrides take precedence over the Data Perusahaan lookup.

**Edge case**: If PT Software Farmer Indonesia appears in Data Perusahaan, Distributor classification wins.

---

### D7: Layer Filtering Architecture

**Decision**: Layer filtering is applied at the Cytoscape element level using `.show()` / `.hide()` on elements tagged with a `dataset` property, rather than rebuilding the graph from scratch on each toggle.

**Rationale**: Hiding/showing elements in Cytoscape is O(elements) and does not trigger a full layout recalculation if the layout is already stabilized. This produces smooth, instant toggling.

**Alternative considered**: Re-run graph builder and `cy.add()` on each toggle — rejected because it causes visible flash and layout thrashing.

---

### D8: Focus Mode Implementation

**Decision**: On node tap:
1. `cy.animate()` to center and zoom to the node's neighborhood (1-hop successors and predecessors)
2. Apply a `dimmed` CSS class to all non-neighborhood nodes and edges
3. Apply a `highlighted` class to the target node and its direct edges
4. Open Company Detail Panel as a side panel (not a modal, to keep graph visible)

**Rationale**: Side panel preserves spatial context — the user can see the graph while reading the detail. A modal would obscure the graph and break exploration flow.

---

### D9: Project Structure (as suggested by PRD)

```
src/
  assets/data/          # Sales Connection.xlsx (bundled)
  parsers/              # Excel sheet parsers, raw row types
  graph/                # Normalizer, graph builder, Cytoscape style definitions
  components/           # UI components (NetworkGraph, LayerManager, FocusPanel, etc.)
  hooks/                # useGraphData, useFocusMode, useLayerManager, useSearch
  pages/                # App shell page
  utils/                # Type guards, formatters, aggregation helpers
  context/              # GraphDataContext, UIContext
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Large Excel file causes slow startup parse | Measure parse time; if >500ms, show a loading spinner with progress indicator |
| Cytoscape graph performance degrades with many nodes/edges | Use `cytoscape-fcose` with `nodeDimensionsIncludeLabels: false`; virtualize rendering for >200 nodes |
| Smart merge logic produces incorrect edge aggregation if seller/buyer column names differ across sheets | Normalize column names during parsing with a sheet-specific column mapping config |
| Node name inconsistencies across sheets (whitespace, casing) cause duplicate nodes | Apply `trim().toLowerCase()` canonicalization as key; display original name from Data Perusahaan master |
| "Data Perusahaan" sheet structure unknown | Need to inspect actual Excel file before finalizing column mapping — this is the highest pre-implementation risk |
| Cytoscape.js React integration requires `useRef` + imperative API, which conflicts with React's declarative model | Wrap Cytoscape in a single dedicated `<CytoscapeGraph>` component that owns the imperative instance; all other components interact through context/events only |
| Layer Manager toggling with smart-merged edges is ambiguous — if two datasets share an edge and one layer is hidden, should the edge be hidden or shown with reduced metadata? | **Decision**: Edge is shown as long as at least one of its contributing datasets is active; edge metadata is filtered to show only data from active layers |

## Open Questions

1. **What are the exact column headers in each sheet?** The PRD does not document column names. The parser design depends on this. → Resolve by inspecting `Sales Connection.xlsx` before writing parsers.
2. **What does "Approval" mean on an edge?** Is it a boolean, a status string, or a code? → Determines how approval is displayed in the Relationship Detail Panel.
3. **What constitutes a "Period"?** Is it a month-year field, a fiscal period, or a transaction date? → Affects how periods are displayed and whether time-based filtering makes sense as a future feature.
4. **Are company names guaranteed unique identifiers, or is there a company ID field?** If names are the key, name normalization is critical.
5. **What is the expected scale of the data?** Number of companies and transactions? This affects layout performance choices.
