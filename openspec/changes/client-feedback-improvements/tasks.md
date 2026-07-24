# Tasks: Client Feedback Improvements & Supply Chain Flow

## Task List

- [x] 1. Install & configure `cytoscape-dagre` layout plugin
  - [x] 1.1 Install `cytoscape-dagre` package via npm
  - [x] 1.2 Register `cytoscape-dagre` plugin in `src/graph/layout.ts`
  - [x] 1.3 Implement `DAGRE_LAYOUT_OPTIONS` with `rankDir: 'LR'` (Left-to-Right rank flow)

- [x] 2. Update Excel Parser (`src/parsers/`)
  - [x] 2.1 Update `RawTransactionRow` interface to include `status`, `sellerNpwp`, `buyerNpwp`, and `isImport`
  - [x] 2.2 Update `parseDataPerusahaanSheet` to extract `Int. Pr` abbreviation alongside company full name
  - [x] 2.3 Update sheet row extraction in `src/parsers/index.ts` to parse `Status` and check for empty/dash NPWP (`isImport`)

- [x] 3. Update Normalizer & Alias Resolution (`src/graph/normalizer.ts`)
  - [x] 3.1 Implement alias resolution map using `data perusahaan` `Int. Pr` abbreviations
  - [x] 3.2 Update `classifyNode` to classify `PT SFI` & `PT BCA` as `special-external`
  - [x] 3.3 Add node normalization logic to merge full company names into canonical abbreviation nodes
  - [x] 3.4 Implement Universe partitioning (`Active Invoices` vs `Replaced/Cancelled Universe`)

- [x] 4. Update Graph Styling & Directional Colors (`src/graph/styles.ts` & `builder.ts`)
  - [x] 4.1 Define visual styles for outgoing (Penjualan) vs incoming (Pembelian) edge arrows with distinct colors
  - [x] 4.2 Update `buildCytoscapeElements` to set edge directional metadata and dynamic edge widths/weights
  - [x] 4.3 Update focus mode highlighting in `NetworkGraph.tsx` to color incoming and outgoing connection paths distinctly

- [x] 5. Add UI Controls for Scope & Universe Switching
  - [x] 5.1 Update `UIContext.tsx` with `scopeFilter` (`'with-external'` | `'internal-only'`) and `universeMode` (`'active'` | `'cancelled-replaced'`)
  - [x] 5.2 Add Scope Switcher control component to toolbar
  - [x] 5.3 Add Universe Switcher segmented control to toolbar
  - [x] 5.4 Connect UI switchers to reactive graph rendering in `NetworkGraph.tsx`

- [x] 6. Verification & Manual Testing
  - [x] 6.1 Verify node alias merging (confirm no duplicate full-name vs short-name nodes)
  - [x] 6.2 Verify Left-to-Right supply chain hierarchical flow matching Gambar 2 schema
  - [x] 6.3 Verify distinct incoming vs outgoing arrow colors on global view and Focus Mode
  - [x] 6.4 Verify Universe Switcher isolates `Batal` and `Diganti` invoices from Active view
  - [x] 6.5 Verify `Internal Only` scope filter correctly toggles external nodes

- [x] 7. Compact Layout & Tight Focus Spacing Enhancements
  - [x] 7.1 Auto-re-layout graph with compact rank & node separation (`rankSep: 70`, `nodeSep: 20`) when `Internal Only` scope is selected
  - [x] 7.2 Optimize Focus Mode camera framing & padding (`padding: 40`) to tightly focus on the selected node and its direct neighbors

- [x] 8. Volume-Based Distance Scaling Enhancement
  - [x] 8.1 Implement continuous logarithmic volume scaling (`idealEdgeLength`) so major transaction partners (high sales/purchases) are drawn tightly together ($50 - 70\text{px}$) while minor partners stretch farther away ($200 - 280\text{px}$)

- [x] 9. Relationship Volume Ranking (#1 Terdekat to Farthest)
  - [x] 9.1 Render explicit rank badges (`#1`, `#2`, `#3`...) directly on graph arrow lines in Focus Mode sorted by total DPP volume
  - [x] 9.2 Add gold `#1` rank badges to `CompanyDetailPanel.tsx` for Suppliers and Customers sorted by total transaction volume




