# Delta Spec: Graph Builder

## Delta Requirements

### ADDED Requirements

- `graph-builder` SHALL assign distinct visual colors to outgoing sales arrows (`penjualan` / seller → buyer) and incoming purchase arrows (`pembelian` / buyer ← seller).
- `graph-builder` SHALL compute dynamic edge weights and lengths scaled by total DPP transaction volume.

### MODIFIED Requirements

- `graph-builder` SHALL apply directional edge highlight colors during Focus Mode based on edge direction relative to the selected node.
