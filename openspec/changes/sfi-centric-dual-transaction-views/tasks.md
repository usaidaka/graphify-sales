## 1. SFI Transaction Model

- [x] 1.1 Add direction-specific SFI anchor resolution and cycle-safe hierarchy extraction
- [x] 1.2 Add official-principal availability, replacement-hub selection, and branch assignment
- [x] 1.3 Add deterministic hierarchy and value-ranked radial position calculations
- [x] 1.4 Add unit tests for direct relationships, missing principals, cycles, ranks, and positions

## 2. Explorer State and Controls

- [x] 2.1 Add sales/purchase view and hierarchy/value layout mode to UI state
- [x] 2.2 Add accessible controls and responsive styling for both selections

## 3. Network Graph Integration

- [x] 3.1 Replace the transaction-flow overview with the SFI-centered selected graph and layout
- [x] 3.2 Apply fixed value-independent sizing plus SFI, principal, and replacement role styling
- [x] 3.3 Preserve focus, edge selection, filters, resizing, fullscreen, and viewport fitting
- [x] 3.4 Update overview guidance, legend, and empty states for the selected view

## 4. Verification

- [x] 4.1 Run unit tests, type checking, lint, and production build
- [x] 4.2 Validate the OpenSpec change and mark all tasks complete

## 5. Multi-Path Company Instances

- [x] 5.1 Add canonical company/edge IDs and branch-specific visual instance expansion
- [x] 5.2 Update hierarchy and value layouts to position repeated instances independently inside each principal path
- [x] 5.3 Update Cytoscape integration so duplicated instances preserve canonical selection, detail panels, search, and statistics
- [x] 5.4 Add tests for four-path duplication, within-branch deduplication, direct-plus-branch instances, cycles, and canonical identity
- [x] 5.5 Run tests, lint, type checking, production build, and strict OpenSpec validation
