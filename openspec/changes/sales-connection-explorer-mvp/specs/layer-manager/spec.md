## ADDED Requirements

### Requirement: Display layer toggles for four datasets
The system SHALL display four toggle controls, one for each dataset: FM, FK, FM_CRTX, FK_CRTX. Each toggle SHALL have a visible label and an active/inactive visual state.

#### Scenario: All layers shown by default
- **WHEN** the application loads
- **THEN** all four layer toggles are in the active (on) state and all edges from all datasets are visible

---

### Requirement: Toggle a single layer independently
The system SHALL allow each layer to be activated or deactivated independently without affecting other layers.

#### Scenario: FM layer toggled off
- **WHEN** the user clicks the FM toggle to deactivate it
- **THEN** all edges whose `datasets` array contains ONLY "FM" are hidden; edges shared across multiple datasets remain visible; no other layer state changes

#### Scenario: FM layer toggled back on
- **WHEN** the user clicks the FM toggle to activate it again
- **THEN** all FM edges are shown again and the graph reflects the restored state

---

### Requirement: Reflect layer state in edge visibility
The system SHALL compute edge visibility based on the intersection of the edge's `datasets` array and the currently active layer set. An edge is visible if at least one of its source datasets is in the active set.

#### Scenario: Mixed-dataset edge visibility
- **WHEN** edge A→B has datasets ["FM","FK"] and FM is toggled off while FK is active
- **THEN** edge A→B remains visible

#### Scenario: All contributing layers disabled hides edge
- **WHEN** edge A→B has datasets ["FM"] and FM is toggled off
- **THEN** edge A→B is hidden

---

### Requirement: Layer toggle updates graph without full re-render
The system SHALL apply layer visibility changes using Cytoscape element show/hide operations, not by rebuilding the graph. The update SHALL be visually instantaneous (no layout recalculation).

#### Scenario: Layer toggle performance
- **WHEN** the user toggles a layer
- **THEN** the graph updates within 100ms without a visible flash or layout jump
