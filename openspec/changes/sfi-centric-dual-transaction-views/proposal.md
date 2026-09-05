## Why

The current global transaction-flow overview chooses internal hubs automatically and mixes sales and purchases, so it cannot express the business model in which SFI is the permanent center and LDN, GBA, MSP, and LJ are preferred principal branches. Analysts also need direct SFI counterparties to remain visible when they bypass those principals and need to switch between a compact hierarchy view and a value-ranked distance view.

## What Changes

- Replace the global multi-hub overview with separate `Penjualan` and `Pembelian` SFI-centered views.
- Keep SFI as the fixed center and preserve truthful transaction direction for every displayed relationship.
- Treat LDN, GBA, MSP, and LJ as preferred principal branch anchors when they transact directly with SFI in the active view.
- Fill each unavailable principal slot with the highest-value eligible non-principal direct SFI counterparty, without reclassifying that company as a business principal.
- Display every eligible direct SFI counterparty even when it is not a principal or replacement hub.
- Build cycle-safe transaction hierarchy levels outward from SFI while preserving direct relationships as direct edges.
- Allow one canonical company to have a separate visual instance in each of the four principal paths when transactions place it in those paths, while keeping totals and company identity canonical.
- Add `Hierarki Transaksi` and `Ranking Nilai` layout modes. Hierarchy mode uses transaction level only; value mode uses dense value ranks so larger transactions are closer to their actual parent.
- Keep node size and edge thickness independent from transaction value; ranking is communicated through position and rank labels.

## Capabilities

### New Capabilities

- `sfi-centered-transaction-views`: Covers sales/purchase view separation, fixed SFI centering, principal and replacement-hub selection, hierarchy extraction, and hierarchy/value layout behavior.

### Modified Capabilities

None. The prior overview experiments remain historical change artifacts and this capability supersedes their rendering behavior.

## Impact

- Replaces the overview model and positioning logic used by `NetworkGraph`.
- Adds transaction-view and layout-mode state and controls.
- Adds pure, unit-tested graph selection, per-branch visual-instance expansion, hierarchy, hub replacement, and radial positioning utilities.
- Extends Cytoscape element metadata with canonical company/relationship IDs so duplicated visual instances still open one canonical detail record and do not inflate statistics.
- Reuses the normalized seller-to-buyer graph and existing period, universe, scope, and dataset filters.
- Introduces no new runtime dependencies and does not change workbook parsing or normalized data formats.
