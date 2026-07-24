## Context

`NetworkGraph` already rearranges a focused company's immediate neighbors into ranked radial distances. The current implementation aggregates `totalDPP`, sorts descending, and assigns larger values to smaller radii. The selected metric is implicit and local to the component, while other graph filters live in `UIContext`.

The change must make the metric user-selectable without affecting the Dagre/fCoSE global layout. Existing edge data already exposes both `totalDPP` and `invoiceCount`.

## Goals / Non-Goals

**Goals:**

- Let users select total omzet or invoice count as the Focus Mode ranking metric.
- Recalculate and animate neighbor positions immediately when the metric changes.
- Preserve equal-value radius grouping and all active graph filters.
- Preserve existing total-omzet behavior as the default.

**Non-Goals:**

- Sorting or rerunning the global graph layout.
- Adding new financial metrics.
- Changing graph normalization, workbook parsing, or edge data formats.
- Changing which nodes belong to the one-hop Focus Mode neighborhood.

## Decisions

### Store the selected metric in UI context

Add a `FocusSortMetric` union (`total-omzet | invoice-count`) and a corresponding state/action in `UIContext`. This keeps the control and graph behavior synchronized and makes the selection available to any Focus Mode UI surface.

Keeping component-local state was considered, but it would couple the control location to `NetworkGraph` and make future Focus Mode surfaces harder to coordinate.

### Aggregate the selected metric per neighbor

For every active edge connected to the focused node, aggregate:

- `total-omzet`: `totalDPP`
- `invoice-count`: `invoiceCount`

Multiple active edges resolving to the same neighbor are summed before ranking. Only edges that survive the active layer, scope, and universe filtering participate.

### Reuse the existing radial ranking algorithm

Sort aggregated neighbors descending. The first rank uses the minimum radius; each strictly lower value adds the existing fixed rank gap; equal values reuse the previous radius. Changing the metric retriggers the positioning effect and uses the existing animation behavior.

This minimizes layout risk and preserves the Focus Mode visual language users already know.

### Keep global layout isolated

The selected metric is included only in the Focus Mode positioning effect. It is not passed to Dagre/fCoSE and does not trigger global layout computation. Exiting Focus Mode restores the saved global positions as it does today.

### Present a Focus Mode-only control

Render a compact labeled selector only while a node is focused. The options use the user-facing labels `Total Omzet` and `Jumlah Faktur`. The default selection is `Total Omzet`.

## Risks / Trade-offs

- **Rapid selection changes can overlap Cytoscape animations** → Stop or supersede current node animations before applying the newest positions.
- **Zero or missing metric values can create ambiguous ranks** → Treat missing values as zero; equal zero values share a radius.
- **Filter handling can diverge between graph visibility and metric calculation** → Reuse the same active-edge eligibility already used by Focus Mode.
- **Control placement may compete with graph controls or side panels** → Use the existing graph-control visual pattern and show it only in Focus Mode.

## Migration Plan

No data migration is required. Deploy the UI state, control, and Focus Mode calculation together. Rollback consists of removing the new state/control and restoring the fixed `totalDPP` calculation.

## Open Questions

None. Product alignment has confirmed that sorting applies only to Focus Mode and the global graph remains unchanged.
