# Delta Spec: Network Explorer

## Delta Requirements

### ADDED Requirements

- `network-explorer` SHALL utilize `cytoscape-dagre` hierarchical Left-to-Right (`LR`) rank layout to visualize supply chain flow from suppliers → internal companies → customers.
- `network-explorer` SHALL provide a UI Scope Switcher control (`With External` vs `Internal Only`).
- `network-explorer` SHALL provide a UI Universe Switcher control (`Active Invoices` vs `Replaced & Cancelled`).

### MODIFIED Requirements

- `network-explorer` SHALL reactively re-layout and re-render when Scope Switcher or Universe Switcher state changes.
