## Why

Sales teams and business analysts currently have no visual way to understand the network of transactional relationships between companies in the Sales Connection dataset. The raw Excel file (`Sales Connection.xlsx`) contains rich seller-buyer transaction data across four datasets (FM, FK, FM_CRTX, FK_CRTX) but it is impossible to explore supply chains, identify key distributors, or spot relationship patterns without building an interactive graph on top of it.

This change introduces the **Sales Connection Explorer MVP** — a fully frontend, read-only React + TypeScript application that parses the Excel file at runtime, normalizes the data into a graph model, and renders it as an interactive network graph using Cytoscape.js. The MVP's goal is to validate UX hypotheses and graph visualization effectiveness before investing in backend infrastructure.

## What Changes

This is a **greenfield project** — no prior codebase exists. The following capabilities will be built from scratch:

- **Excel ingestion pipeline**: Parse `Sales Connection.xlsx` in the browser using the `xlsx` library, extracting data from five worksheets (FM, FK, FM_CRTX, FK_CRTX, Data Perusahaan).
- **Data normalization layer**: Deduplicate companies, classify node types (Internal / External / Distributor / Special External), and smart-merge duplicate seller→buyer edges across datasets.
- **Interactive network graph**: Render the normalized graph with Cytoscape.js, with node type-based visual differentiation and directional edges.
- **Layer Manager**: Toggle each of the four transaction datasets (FM, FK, FM_CRTX, FK_CRTX) on/off independently; the graph updates reactively.
- **Focus Mode**: Clicking a node auto-centers, zooms, blurs non-connected nodes, highlights the direct connection chain, and opens a Company Detail Panel.
- **Company Explorer**: Search-based lookup that triggers Focus Mode on a matched company node.
- **Relationship Detail Panel**: Clicking an edge surfaces seller, buyer, invoice count, DPP, PPN, approval status, dataset source, and period.
- **Statistics Panel**: Aggregated metrics including total companies, internal/external breakdown, relationship count, top supplier, top customer, and most-connected company.
- **Legend**: Visual key for all node types and edge semantics.

## Capabilities

### New Capabilities

- `excel-parser`: Parses `Sales Connection.xlsx` in-browser; extracts all five sheets; provides typed row data per sheet.
- `data-normalizer`: Deduplicates company entities using business rules (Data Perusahaan = internal master, PT Software Farmer Indonesia = Distributor, CV Berkah Cahaya Abadi = Special External); produces a canonical node list and merged edge list.
- `graph-builder`: Converts normalized node/edge lists into Cytoscape.js elements; assigns node type styles; handles directional edges with aggregated metadata (invoice count, DPP, PPN, approval, dataset source).
- `network-explorer`: Main graph canvas view; renders the Cytoscape.js graph; supports pan, zoom, layout selection.
- `layer-manager`: UI control and state logic for independently toggling FM / FK / FM_CRTX / FK_CRTX layers; re-renders graph on toggle.
- `focus-mode`: Node-selection behavior — auto-center, auto-zoom, fade non-neighbors, highlight chain, trigger Company Detail Panel.
- `company-explorer`: Search input with autocomplete; on selection triggers Focus Mode for matched node.
- `relationship-detail`: Edge-click handler and panel; displays all edge metadata fields.
- `company-detail`: Node-click panel; displays company classification, connected sellers, connected buyers, invoice summaries.
- `statistics-panel`: Computes and displays aggregate graph metrics (total, internal, external, distributor, relationships, top supplier, top customer, most connected).
- `legend`: Static or semi-dynamic visual key for node types and edge types.

### Modified Capabilities

*(None — this is a greenfield project with no existing specs.)*

## Impact

- **New project scaffold**: React + TypeScript + Vite project initialized under `e:\syamil\graphify-sales\`.
- **Static data asset**: `Sales Connection.xlsx` bundled under `src/assets/data/` — no network requests.
- **Dependencies introduced**: `xlsx` (SheetJS), `cytoscape`, optionally `cytoscape-fcose` or `cytoscape-cola` for layout, `react`, `typescript`.
- **No backend impact**: Entirely frontend-only; no API contracts, no database schema.
- **No authentication**: No session management or access control in scope.
- **Future phases affected**: Architecture decisions made here (data model shape, graph element schema) will be the foundation that Phase 2 (upload) and Phase 3 (backend) build on. Choosing a clean, normalized graph model now reduces future migration cost.
