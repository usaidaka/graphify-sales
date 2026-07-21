## ADDED Requirements

### Requirement: Enter Focus Mode on node click
The system SHALL enter Focus Mode when the user taps or clicks a company node. Focus Mode SHALL auto-center and zoom the viewport to the selected node and its immediate neighbors (1-hop predecessors and successors).

#### Scenario: Node clicked enters Focus Mode
- **WHEN** the user clicks on a company node
- **THEN** the viewport smoothly animates to center on that node and its direct neighbors with an appropriate zoom level

---

### Requirement: Dim non-connected nodes and edges
The system SHALL apply a dimmed visual state to all nodes and edges that are NOT part of the selected node's direct neighborhood. The dimmed state SHALL use reduced opacity to visually de-emphasize non-relevant elements.

#### Scenario: Background nodes dimmed
- **WHEN** Focus Mode is active for node A
- **THEN** all nodes not directly connected to A have reduced opacity (visually faded); node A and its direct neighbors are fully opaque

---

### Requirement: Highlight connection chain
The system SHALL apply a highlighted visual state to the selected node and all its direct edges. Highlighted edges SHALL use a distinct color or width to stand out from dimmed edges.

#### Scenario: Selected node and edges highlighted
- **WHEN** Focus Mode is active for node A
- **THEN** node A and all edges connected to A display with the highlighted style (elevated opacity, distinct color/weight)

---

### Requirement: Open Company Detail Panel on focus
The system SHALL open the Company Detail Panel as a side panel when Focus Mode is activated. The panel SHALL display information about the focused company.

#### Scenario: Company Detail Panel opens
- **WHEN** the user clicks on a company node
- **THEN** the Company Detail Panel slides open or becomes visible alongside the graph canvas

---

### Requirement: Exit Focus Mode
The system SHALL exit Focus Mode when the user clicks on the graph canvas background (outside any node) or presses Escape. On exit, all nodes and edges return to their normal (non-dimmed) visual state and the Company Detail Panel closes.

#### Scenario: Click background exits Focus Mode
- **WHEN** Focus Mode is active and the user clicks on the canvas background
- **THEN** Focus Mode deactivates, all nodes/edges return to normal opacity, and the Company Detail Panel closes

#### Scenario: Escape key exits Focus Mode
- **WHEN** Focus Mode is active and the user presses the Escape key
- **THEN** Focus Mode deactivates and the graph returns to normal state

---

### Requirement: Focus Mode triggered from Company Explorer
The system SHALL support entering Focus Mode for a company by selecting it from the Company Explorer search, as well as by direct node click.

#### Scenario: Company Explorer triggers Focus Mode
- **WHEN** the user selects a company from the Company Explorer search results
- **THEN** Focus Mode is activated for that company's node, identical to clicking it directly
