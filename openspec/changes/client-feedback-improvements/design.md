# Design Document: Client Feedback Improvements & Supply Chain Flow

## Overview

This design addresses client feedback by upgrading the data parsing pipeline, normalizing company aliases, enforcing invoice status filtering (Active vs Replaced/Cancelled), classifying special entities (PT SFI, PT BCA, Import), differentiating incoming/outgoing arrow colors, and transitioning to a hierarchical Left-to-Right supply chain layout (`dagre`).

## Architecture & Data Flow

```
Sales Connection.xlsx
  │
  ├── Excel Parser ──► Extracts Status, NPWP, Int.Pr Mapping, DPP, PPN
  │
  ├── Normalizer ───► 1. Alias Resolution (Full Name → Int. Pr)
  │                   2. Special External Classification (PT SFI, PT BCA)
  │                   3. Import Tagging (NPWP == '-' or empty)
  │                   4. Universe Partitioning (Active vs Replaced/Cancelled)
  │                   5. Scope Filtering (With External vs Internal Only)
  │
  ├── Graph Builder ─► Edge Weights & Incoming/Outgoing Colors
  │
  └── Network Explorer ──► Cytoscape + Dagre Layout (Left-to-Right Ranks) + UI Switchers
```

## Detailed Component Specifications

### 1. Excel Parser (`src/parsers/`)

- Update `RawTransactionRow`:
  ```ts
  export interface RawTransactionRow {
    sellerName: string;
    buyerName: string;
    sellerNpwp: string;
    buyerNpwp: string;
    invoiceNumber: string;
    dpp: number;
    ppn: number;
    approvalStatus: string;
    status: string; // 'Normal' | 'Normal-Pengganti' | 'Diganti' | 'Batal'
    period: string;
    isImport: boolean;
  }
  ```
- Update `DataPerusahaanRow`:
  ```ts
  export interface InternalCompanyMaster {
    fullName: string;      // e.g. "PT DIGITAL DATA MEDIA INDOSAKTI"
    abbreviation: string;  // e.g. "PT DDMI" (Int. Pr)
    group: string;         // e.g. "HEK"
  }
  ```
- Parser logic detects `NPWP Pembeli` / `NPWP Penjual` values of `'-'`, `'0'`, or empty strings as `isImport = true`.

### 2. Normalizer & Alias Merging (`src/graph/normalizer.ts`)

- **Alias Map**: Build a bidirectional lookup map between `fullName` and `abbreviation` from `data perusahaan`.
- **Node Classification**:
  - `PT SOFTWARE FARMER INDONESIA` (or `PT SFI`) → `special-external`
  - `CV BERKAH CAHAYA ABADI` / `PT BERKAH CAHAYA ABADI` (or `PT BCA`) → `special-external`
  - Internal names matching `data perusahaan` → `internal`
  - Import entities (where `isImport` is true) → `import-external` or `external` with import badge
  - Other companies → `external`
- **Universe Partitioning**:
  - `Active`: Rows where status is `Normal` or `Normal-Pengganti` (or status is empty/normal)
  - `Replaced/Cancelled`: Rows where status is `Diganti` or `Batal`
- **Scope Partitioning**:
  - `With External`: Include internal and external nodes & edges.
  - `Internal Only`: Filter out non-internal nodes and edges connecting to non-internal nodes.

### 3. Graph Builder & Arrow Colors (`src/graph/builder.ts` & `styles.ts`)

- **Outgoing Edges (Penjualan / Seller → Buyer)**:
  - Color: `#10b981` (Emerald Green) or `#3b82f6` (Blue)
- **Incoming Edges (Pembelian / Buyer ← Seller)**:
  - Color: `#f97316` (Orange) or `#ef4444` (Red)
- **Focus Mode**:
  - When a node is selected:
    - Edges originating from the node (sales out) highlight in **Outgoing Color** (Green/Blue).
    - Edges pointing into the node (purchases in) highlight in **Incoming Color** (Orange/Red).

### 4. Hierarchical Left-to-Right Layout (`src/graph/layout.ts`)

- Integrate `cytoscape-dagre` plugin.
- Configure layout options:
  ```ts
  export const DAGRE_LAYOUT_OPTIONS = {
    name: 'dagre',
    rankDir: 'LR', // Left to Right flow
    align: 'DL',
    ranker: 'network-simplex',
    nodeSep: 40,
    edgeSep: 20,
    rankSep: 120,
    fit: true,
    padding: 30
  };
  ```
- Tiers formed naturally:
  - **Rank 0 (Left)**: Suppliers, Special External (SFI, BCA), Import sources.
  - **Rank 1 (Mid-Left)**: Internal Companies.
  - **Rank 2 (Mid-Right)**: Primary Customers / Intermediaries.
  - **Rank 3 (Right)**: End External Buyers.

### 5. UI Controls (`src/context/UIContext.tsx` & Header Components)

- Add state fields:
  - `scopeFilter`: `'with-external' | 'internal-only'` (Default: `'with-external'`)
  - `universeMode`: `'active' | 'cancelled-replaced'` (Default: `'active'`)
- UI elements in `LayerManager` / Toolbar:
  - **Scope Switcher**: Toggle button group `[ With External | Internal Only ]`
  - **Universe Switcher**: Segmented tab control `[ Active Invoices | Replaced & Cancelled ]`
