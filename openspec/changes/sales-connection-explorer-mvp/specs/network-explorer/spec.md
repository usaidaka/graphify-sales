## ADDED Requirements

### Requirement: Render the full graph canvas
The system SHALL display all company nodes and relationship edges in a scrollable, zoomable Cytoscape.js canvas. The canvas SHALL occupy the primary content area of the application.

#### Scenario: Graph canvas renders on app load
- **WHEN** the application finishes parsing and normalizing data
- **THEN** the full network graph is visible in the canvas area with all nodes and edges rendered

---

### Requirement: Support pan and zoom
The system SHALL allow users to pan the graph by click-dragging the canvas background and zoom by scrolling or pinching. Zoom controls (zoom-in, zoom-out, fit-to-screen buttons) SHALL be provided in the UI.

#### Scenario: User zooms in
- **WHEN** the user scrolls up over the canvas
- **THEN** the graph zooms in centered on the cursor position

#### Scenario: User pans the graph
- **WHEN** the user click-drags on the canvas background
- **THEN** the graph viewport pans in the drag direction

#### Scenario: Fit to screen button used
- **WHEN** the user clicks the fit-to-screen control
- **THEN** the viewport resets to show all nodes in the canvas bounds

---

### Requirement: Display node labels
The system SHALL display the company name as a label on or near each node. Labels SHALL be legible at the default zoom level.

#### Scenario: Node label visible
- **WHEN** the graph is rendered at default zoom
- **THEN** each node displays the company name as a text label

---

### Requirement: Show loading state during data initialization
The system SHALL display a loading indicator while the Excel file is being parsed and the graph is being built. The graph canvas SHALL not render until data is ready.

#### Scenario: Loading spinner shown
- **WHEN** the application is initializing data
- **THEN** a loading spinner or progress indicator is displayed in the canvas area

#### Scenario: Graph shown after data ready
- **WHEN** parsing and normalization complete
- **THEN** the loading indicator is replaced by the rendered graph
