## Why

Focus Mode currently positions connected companies only by transaction value (total DPP), with no way for users to compare relationship importance by transaction frequency. Users need to switch the ranking basis between total omzet and invoice count while keeping the global graph layout unchanged.

## What Changes

- Add a Focus Mode sorting control with `Total Omzet` and `Jumlah Faktur` options.
- Keep `Total Omzet` as the default to preserve current behavior.
- Rank each immediate neighbor using the selected metric across its active relationships with the focused company.
- Animate Focus Mode neighbors to new ranked radii whenever the metric changes.
- Place equal metric values on the same radius.
- Respect the currently active dataset layers, scope filter, and invoice universe when calculating both metrics.
- Leave the global graph layout unchanged.

## Capabilities

### New Capabilities

- `focus-mode-metric-sorting`: Metric selection, neighbor aggregation, ranking, and animated Focus Mode repositioning.

### Modified Capabilities

None.

## Impact

- Focus Mode UI state and controls.
- Focus Mode neighbor aggregation and radial positioning in `src/components/NetworkGraph.tsx`.
- Relevant component styling and automated tests.
- No new runtime dependencies, data format changes, or global layout changes.
