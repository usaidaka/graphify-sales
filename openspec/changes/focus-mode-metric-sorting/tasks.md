## 1. Focus Metric State

- [x] 1.1 Add the typed Focus Mode sort metric and `Total Omzet` default to UI state
- [x] 1.2 Add a reducer action for changing the Focus Mode sort metric

## 2. Focus Mode Sorting Control

- [x] 2.1 Render a `Total Omzet` / `Jumlah Faktur` selector only while Focus Mode is active
- [x] 2.2 Style the selector consistently with existing graph controls and responsive layouts

## 3. Metric Aggregation and Positioning

- [x] 3.1 Aggregate the selected metric per immediate neighbor from eligible active edges
- [x] 3.2 Rank neighbors descending while preserving a shared radius for equal values
- [x] 3.3 Recalculate and animate neighbor positions when the selected metric changes
- [x] 3.4 Preserve saved global positions and prevent metric changes from rerunning the global layout

## 4. Verification

- [x] 4.1 Add or update tests for metric selection, aggregation, equal ranks, and Focus Mode-only visibility
- [x] 4.2 Run lint, type checking, tests, and production build
