## ADDED Requirements

### Requirement: Select Focus Mode ranking metric
The system SHALL provide a Focus Mode sorting control with `Total Omzet` and `Jumlah Faktur` options while a company node is focused. The default metric SHALL be `Total Omzet`.

#### Scenario: Focus Mode opens with default metric
- **WHEN** the user enters Focus Mode without previously changing the metric
- **THEN** the sorting control displays `Total Omzet` and neighbor positions are ranked by total omzet

#### Scenario: Control is limited to Focus Mode
- **WHEN** no company node is focused
- **THEN** the Focus Mode sorting control is not displayed and the global graph layout remains unchanged

### Requirement: Rank neighbors by total omzet
When `Total Omzet` is selected, the system SHALL aggregate total DPP across all eligible active relationships between the focused company and each immediate neighbor, sort neighbors in descending order, and place higher-ranked neighbors closer to the focused node.

#### Scenario: Higher omzet is positioned closer
- **WHEN** Focus Mode is active and neighbor A has a higher aggregated total DPP than neighbor B
- **THEN** neighbor A is positioned on a smaller radius than neighbor B

### Requirement: Rank neighbors by invoice count
When `Jumlah Faktur` is selected, the system SHALL aggregate invoice count across all eligible active relationships between the focused company and each immediate neighbor, sort neighbors in descending order, and place higher-ranked neighbors closer to the focused node.

#### Scenario: More invoices are positioned closer
- **WHEN** Focus Mode is active and neighbor A has a higher aggregated invoice count than neighbor B
- **THEN** neighbor A is positioned on a smaller radius than neighbor B

### Requirement: Preserve equal-value ranks
The system SHALL place neighbors with equal values for the selected metric on the same radius from the focused node.

#### Scenario: Neighbors have equal selected metric values
- **WHEN** two Focus Mode neighbors have equal aggregated values for the selected metric
- **THEN** both neighbors are assigned the same radial distance from the focused node

### Requirement: Reposition neighbors when metric changes
The system SHALL recalculate rankings and animate Focus Mode neighbors to their new positions whenever the user changes the selected metric.

#### Scenario: User changes from omzet to invoice count
- **WHEN** the user selects `Jumlah Faktur` while Focus Mode is active
- **THEN** neighbor rankings are recalculated using invoice count and the neighbors animate to their resulting radii

### Requirement: Respect active graph filters
Metric aggregation SHALL include only relationships eligible under the active dataset layers, scope filter, and invoice universe.

#### Scenario: Filter excludes a relationship
- **WHEN** a relationship is excluded by an active layer, scope, or universe filter
- **THEN** its omzet and invoice count do not contribute to the Focus Mode ranking

### Requirement: Preserve global graph layout
Changing the Focus Mode ranking metric SHALL NOT sort, reposition, or rerun the global graph layout.

#### Scenario: User exits Focus Mode after changing metric
- **WHEN** the user changes the metric and then exits Focus Mode
- **THEN** all nodes return to their previously saved global graph positions
