# Proposal: Client Feedback Improvements & Supply Chain Flow

## Why

Following client review of the Sales Connection Explorer MVP, several key improvements were requested to refine visualization accuracy, supply chain readability, and interactive filtering:

1. **Directional Arrow Color Differentiation**: Transaction arrows currently share a single uniform color. Outgoing sales and incoming purchases must be visually distinguished with distinct colors.
2. **Scope Filter (Internal Only vs With External)**: Analysts need a quick control to switch between viewing the full network (`With External`) and viewing internal-only company interactions (`Internal Only`).
3. **Invoice Status & Universe Separation**: Cancelled (`Batal`) and replaced (`Diganti`) invoices currently pollute the primary graph. These must be excluded from the active visualization by default and isolated into a dedicated **Replaced/Cancelled Universe Switcher**.
4. **Company Alias Merging & Abbreviation Display**: Full company names and abbreviations (e.g., *PT DIGITAL DATA MEDIA INDOSAKTI* vs *PT DDMI*) both appear as separate nodes or verbose labels. Nodes must be normalized using `Int. Pr` abbreviations from `Data Perusahaan` and display short names exclusively.
5. **Hierarchical Supply Chain Flow Layout**: The force-directed layout (`fcose`) creates a tangled graph. The visualization must adopt a structured **Hierarchical Left-to-Right Flow** (matching client target schema) with distinct tiers: Suppliers/Import (Left) → Internal Companies (Mid-Left) → Intermediaries (Mid-Right) → End Customers (Right).
6. **Import Data & Special External Classification**:
   - Rows with empty or dash (`-`) NPWP values must be identified as **Import / Overseas** transactions.
   - Both `PT Software Farmer Indonesia` (PT SFI) and `CV / PT Berkah Cahaya Abadi` (PT BCA) must be classified as **Special External**.

## What Changes

This change modifies data parsing, graph normalization, visual styling, layout algorithm, and UI controls:

- **`excel-parser`**: Update parser to extract invoice `Status` (`Normal`, `Normal-Pengganti`, `Diganti`, `Batal`), NPWP fields (`NPWP Pembeli`, `NPWP Penjual`), and company abbreviation (`Int. Pr`) from `Data Perusahaan`.
- **`data-normalizer`**:
  - Classify `PT SFI` and `PT BCA` as `special-external`.
  - Identify NPWP `-` or empty as `import` transactions.
  - Implement company alias resolution using `Int. Pr` mapping from `Data Perusahaan` to merge redundant nodes.
  - Implement Universe filtering (`Active Invoices` vs `Replaced/Cancelled Universe`).
- **`graph-builder`**:
  - Assign distinct colors to outgoing (Penjualan) vs incoming (Pembelian) edges in focused/global state.
  - Dynamically scale `idealEdgeLength` / edge weights based on total transaction amount (`totalDPP`).
- **`network-explorer`**:
  - Install and integrate `cytoscape-dagre` layout for structured Left-to-Right (`LR`) supply chain rank flow.
  - Add Scope Switcher UI (`With External` vs `Internal Only`).
  - Add Universe Switcher UI (`Active Invoices` vs `Replaced/Cancelled`).

## Capabilities

### Modified Capabilities

- `excel-parser`: Enhanced to read invoice `Status`, `NPWP`, and `Int. Pr` abbreviation column.
- `data-normalizer`: Updated for company alias merging, `special-external` classification (SFI + BCA), import tagging, and universe filtering.
- `graph-builder`: Updated edge styling for incoming vs outgoing arrow colors and transaction-volume weighted edge lengths.
- `network-explorer`: Updated to use `dagre` hierarchical Left-to-Right layout and added Scope & Universe Switcher controls in the UI.

## Impact

- **Graph layout engine**: Adds `cytoscape-dagre` dependency for hierarchical DAG layout.
- **Data integrity**: Ensures total transaction amounts and node connections accurately reflect valid invoices without duplicate alias nodes.
- **UI / UX**: Enhances control bar with Scope Switcher (`With External` / `Internal Only`) and Universe Switcher (`Active Invoices` / `Replaced & Cancelled`).
