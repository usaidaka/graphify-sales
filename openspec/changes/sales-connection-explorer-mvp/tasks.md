## 1. Project Scaffold & Configuration

- [x] 1.1 Initialize Vite + React + TypeScript project in `e:\syamil\graphify-sales` using `npm create vite@latest`
- [x] 1.2 Install core dependencies: `cytoscape`, `cytoscape-fcose`, `xlsx`, and their TypeScript types
- [x] 1.3 Configure Vite to serve `Sales Connection.xlsx` as a static asset (copy to `public/data/` or `src/assets/data/`)
- [x] 1.4 Set up project directory structure: `src/assets/data`, `src/parsers`, `src/graph`, `src/components`, `src/hooks`, `src/pages`, `src/context`, `src/utils`
- [x] 1.5 Configure TypeScript strict mode and path aliases (e.g., `@/parsers`, `@/graph`)
- [x] 1.6 Set up global CSS baseline and Google Fonts (Inter or Outfit) for premium typography

## 2. Excel Parser (`excel-parser`)

- [x] 2.1 Define TypeScript interfaces: `RawFMRow`, `RawFKRow`, `RawFMCRTXRow`, `RawFKCRTXRow`, `RawDataPerusahaanRow`
- [x] 2.2 Inspect `Sales Connection.xlsx` and document exact column headers for all five sheets in a `src/parsers/columnMaps.ts` config file
- [x] 2.3 Implement `parseWorkbook(buffer: ArrayBuffer): ParsedWorkbook` function using `xlsx.read()` with sheet-to-typed-array conversion
- [x] 2.4 Implement `parseFMSheet(sheet: WorkSheet): RawFMRow[]` with column name normalization (trim + map)
- [x] 2.5 Implement `parseFKSheet`, `parseFMCRTXSheet`, `parseFKCRTXSheet` — each with their own column map
- [x] 2.6 Implement `parseDataPerusahaanSheet(sheet: WorkSheet): string[]` returning the list of internal company names
- [x] 2.7 Write a Vite asset loader that fetches the bundled `.xlsx` file as an ArrayBuffer and calls `parseWorkbook()`
- [x] 2.8 Add error handling for missing file, missing sheets, and malformed rows

## 3. Data Normalizer (`data-normalizer`)

- [x] 3.1 Define canonical TypeScript types: `NodeData`, `EdgeData`, `NormalizedGraph`
- [x] 3.2 Implement company name normalization utility (`normalizeCompanyName(name: string): string` — trim, no further casing change to preserve display names)
- [x] 3.3 Implement `classifyNode(name: string, internalSet: Set<string>): NodeType` — applying the priority order: Distributor → Special External → Internal → External
- [x] 3.4 Implement `buildNodeMap(rows: AllTransactionRows[], internalSet: Set<string>): Map<string, NodeData>` — deduplicates companies from all four sheets
- [x] 3.5 Implement `mergeEdges(rows: AllTransactionRows[]): Map<string, EdgeData>` — groups by `${sellerKey}→${buyerKey}`, accumulates invoiceCount, DPP, PPN, datasets, approvalStatus, periods
- [x] 3.6 Implement `normalize(parsed: ParsedWorkbook): NormalizedGraph` — orchestrates steps 3.4 and 3.5, returns `{ nodes, edges }`
- [x] 3.7 Write unit tests or manual validation to verify node count, edge count, and a sample merged edge against the raw Excel data

## 4. Graph Builder (`graph-builder`)

- [x] 4.1 Implement `buildCytoscapeElements(graph: NormalizedGraph): cytoscape.ElementDefinition[]` — maps NodeData to node elements and EdgeData to edge elements with all metadata in `data`
- [x] 4.2 Define Cytoscape style sheet in `src/graph/styles.ts` — distinct colors and shapes for Internal, External, Distributor, Special External node types
- [x] 4.3 Implement edge weight scaling function: map `invoiceCount` to line width (min 1px, max 8px using linear scale)
- [x] 4.4 Register `cytoscape-fcose` plugin and define default layout config in `src/graph/layout.ts`
- [x] 4.5 Implement `runLayout(cy: cytoscape.Core): Promise<void>` that runs fcose and resolves when layout is done

## 5. Application Context & State (`context`)

- [x] 5.1 Create `GraphDataContext` with `NormalizedGraph`, loading state, and error state; wire up workbook loading on mount
- [x] 5.2 Create `UIContext` with: `activeLayers: Set<DatasetName>`, `focusedNodeId: string | null`, `selectedEdgeId: string | null`, `searchQuery: string`
- [x] 5.3 Implement `useReducer` dispatchers for: `TOGGLE_LAYER`, `SET_FOCUS_NODE`, `CLEAR_FOCUS`, `SELECT_EDGE`, `CLEAR_EDGE_SELECTION`, `SET_SEARCH`
- [x] 5.4 Wrap the app root with `GraphDataContext.Provider` and `UIContext.Provider`

## 6. Network Explorer Component (`network-explorer`)

- [x] 6.1 Create `<CytoscapeGraph>` component using `useRef` for the Cytoscape instance; initialize `cy` on mount with elements, styles, and layout
- [x] 6.2 Implement zoom controls: Zoom In button, Zoom Out button, Fit to Screen button using Cytoscape's `cy.zoom()` and `cy.fit()` APIs
- [x] 6.3 Implement loading spinner overlay that renders while `GraphDataContext.loading === true`
- [x] 6.4 Register node tap handler: dispatch `SET_FOCUS_NODE` to UIContext
- [x] 6.5 Register edge tap handler: dispatch `SELECT_EDGE` to UIContext
- [x] 6.6 Register canvas background tap handler: dispatch `CLEAR_FOCUS` and `CLEAR_EDGE_SELECTION`

## 7. Layer Manager Component (`layer-manager`)

- [x] 7.1 Create `<LayerManager>` component with four toggle buttons for FM, FK, FM_CRTX, FK_CRTX
- [x] 7.2 Wire toggle state to `UIContext.activeLayers`; dispatch `TOGGLE_LAYER` on click
- [x] 7.3 Implement `useLayerFilter` hook that watches `activeLayers` and calls `cy.elements().show()/hide()` based on each element's `datasets` property
- [x] 7.4 Ensure layer filter does NOT trigger layout recalculation (use `cy.batch()` for performance)
- [x] 7.5 Style Layer Manager toggles to show active/inactive state clearly (e.g., accent color when on, muted when off)

## 8. Focus Mode (`focus-mode`)

- [x] 8.1 Implement `useFocusMode` hook that watches `UIContext.focusedNodeId`
- [x] 8.2 On focus change: collect 1-hop neighborhood using `cy.$('#id').neighborhood()`; animate viewport with `cy.animate()` to fit neighborhood with padding
- [x] 8.3 Apply `dimmed` CSS class to all non-neighborhood elements; apply `highlighted` class to focused node and its edges
- [x] 8.4 Define Cytoscape style rules for `.dimmed` (opacity: 0.15) and `.highlighted` (elevated opacity, accent border)
- [x] 8.5 On `CLEAR_FOCUS`: remove all `dimmed` and `highlighted` classes; reset viewport

## 9. Company Explorer Component (`company-explorer`)

- [x] 9.1 Create `<CompanyExplorer>` search input component with controlled state
- [x] 9.2 Implement search filter logic: filter `NormalizedGraph.nodes` by partial name match (case-insensitive)
- [x] 9.3 Render dropdown with up to 10 results; show company name and node type badge per result
- [x] 9.4 On result click: dispatch `SET_FOCUS_NODE` to UIContext and clear search
- [x] 9.5 Implement clear button that resets input and closes dropdown
- [x] 9.6 Handle "no results" empty state message

## 10. Relationship Detail Panel (`relationship-detail`)

- [x] 10.1 Create `<RelationshipDetailPanel>` component; render when `UIContext.selectedEdgeId !== null`
- [x] 10.2 Look up the selected edge's `EdgeData` from `NormalizedGraph.edges` by ID
- [x] 10.3 Display: Seller name, Buyer name, Invoice Count, Total DPP (formatted as IDR), Total PPN (formatted as IDR), Approval statuses, Dataset sources, Periods
- [x] 10.4 Implement IDR currency formatter utility: `formatIDR(value: number): string` (e.g., "Rp 1.234.567")
- [x] 10.5 Implement close button; dispatch `CLEAR_EDGE_SELECTION`

## 11. Company Detail Panel (`company-detail`)

- [x] 11.1 Create `<CompanyDetailPanel>` component; render when `UIContext.focusedNodeId !== null`
- [x] 11.2 Display company name and node type badge (color-coded by type)
- [x] 11.3 Compute and display list of connected sellers (incoming edges) with their invoice counts
- [x] 11.4 Compute and display list of connected buyers (outgoing edges) with their invoice counts
- [x] 11.5 Display aggregate summary: total invoices as seller, total invoices as buyer, total DPP as seller, total DPP as buyer
- [x] 11.6 Make each connected company name clickable; dispatch `SET_FOCUS_NODE` for the clicked company

## 12. Statistics Panel (`statistics-panel`)

- [x] 12.1 Create `<StatisticsPanel>` component
- [x] 12.2 Implement `useStatistics(graph: NormalizedGraph, activeLayers: Set<string>): Statistics` hook — computes all metrics reactively
- [x] 12.3 Display total company count and per-type breakdown (Internal, External, Distributor, Special External)
- [x] 12.4 Display total relationship count (filtered by active layers)
- [x] 12.5 Compute and display Top Supplier (company with highest out-degree in active graph)
- [x] 12.6 Compute and display Top Customer (company with highest in-degree in active graph)
- [x] 12.7 Compute and display Most Connected Company (highest total degree)
- [x] 12.8 Ensure statistics recompute when `activeLayers` changes

## 13. Legend Component (`legend`)

- [x] 13.1 Create `<Legend>` component
- [x] 13.2 Render node type legend (Internal, External, Distributor, Special External) with shape/color matching Cytoscape styles
- [x] 13.3 Render edge weight legend (Thin line = Few invoices, Thick line = Many invoices)
- [x] 13.4 Style panel with glassmorphism matching the rest of the UIbottom-left corner of the graph canvas

## 14. App Shell & Layout

- [x] 14.1 Build the main `<App>` page layout: header bar, left sidebar (Company Explorer + Layer Manager + Statistics), main canvas (CytoscapeGraph + Legend), right side panel (Company Detail / Relationship Detail)
- [x] 14.2 Implement responsive panel transitions (slide in/out) for Company Detail and Relationship Detail panels
- [x] 14.3 Add keyboard shortcut: Escape → `CLEAR_FOCUS` + `CLEAR_EDGE_SELECTION`
- [x] 14.4 Add app title, meta description, and favicon for SEO and browser tab identity

## 15. Visual Polish & Premium UI

- [x] 15.1 Refine dark mode color palette: slate/slate-blue backgrounds, crisp white text, vibrant accents (blue/emerald)
- [x] 15.2 Ensure smooth CSS transitions on hover states, layer toggles, and panel slide-ins
- [x] 15.3 Add custom scrollbar styling for detail panels to match the sleek UI
- [x] 15.4 Audit font weights and typography hierarchy (Inter/Outfit) for premium legibility
- [x] 15.5 Apply premium dark background to graph canvas with subtle grid or gradient

## 16. Validation & QA

- [x] 16.1 Verify all 11 spec requirements are implemented by cross-checking scenarios against the running app
- [x] 16.2 Validate edge merge logic against raw Excel data manually (spot-check 5+ seller-buyer pairs)
- [x] 16.3 Test layer toggle: verify hide/show behavior for all four layers independently and in combination
- [x] 16.4 Test Focus Mode: verify dim, highlight, center, zoom, panel open, and exit behaviors
- [x] 16.5 Test Company Explorer: search, select, no-results, clear
- [x] 16.6 Test Relationship Detail Panel: click edge, verify all fields, close
- [x] 16.7 Test Statistics Panel: toggle layers and confirm statistics update correctly
- [x] 16.8 Verify the app runs without console errors in Chrome and Edge
