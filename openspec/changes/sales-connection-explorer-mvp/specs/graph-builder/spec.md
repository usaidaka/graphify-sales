## ADDED Requirements

### Requirement: Convert normalized graph to Cytoscape elements
The system SHALL convert the `NormalizedGraph` produced by the data normalizer into a Cytoscape.js elements array (`cy.add(elements)`) with one element per node and one element per merged edge.

#### Scenario: Nodes converted to Cytoscape elements
- **WHEN** the graph builder receives a NormalizedGraph
- **THEN** each NodeData is converted to a Cytoscape node element with `data.id`, `data.label`, `data.nodeType`, and `data.companyName`

#### Scenario: Edges converted to Cytoscape elements
- **WHEN** the graph builder receives a NormalizedGraph
- **THEN** each EdgeData is converted to a Cytoscape edge element with `data.id`, `data.source`, `data.target`, `data.invoiceCount`, `data.totalDPP`, `data.totalPPN`, `data.datasets`, `data.approvalStatus`, `data.periods`

---

### Requirement: Apply node type visual styles
The system SHALL define Cytoscape style rules that visually differentiate the four node types. Style properties SHALL include background color, border color, border width, and shape.

#### Scenario: Internal nodes styled distinctly
- **WHEN** the graph renders
- **THEN** nodes with `data.nodeType === "internal"` display with the Internal visual style (distinct color and shape)

#### Scenario: External nodes styled distinctly
- **WHEN** the graph renders
- **THEN** nodes with `data.nodeType === "external"` display with the External visual style

#### Scenario: Distributor nodes styled distinctly
- **WHEN** the graph renders
- **THEN** the Distributor node displays with a visually prominent style (e.g., larger size, unique color)

#### Scenario: Special External nodes styled distinctly
- **WHEN** the graph renders
- **THEN** the Special External node displays with its own distinct visual style

---

### Requirement: Render directional edges
The system SHALL render all edges as directed arrows from seller (source) to buyer (target). Arrow style SHALL clearly convey transaction direction.

#### Scenario: Edge directionality visible
- **WHEN** the graph renders an edge from company A to company B
- **THEN** an arrowhead is visible at the target end (company B)

---

### Requirement: Scale edge weight by invoice count
The system SHALL visually encode edge weight using line width proportional to `invoiceCount`. Higher invoice counts SHALL produce visibly thicker edges.

#### Scenario: High-volume edge is thicker
- **WHEN** edge A→B has invoiceCount=10 and edge C→D has invoiceCount=1
- **THEN** edge A→B renders with a visibly thicker line than edge C→D

---

### Requirement: Apply fcose layout
The system SHALL apply the `cytoscape-fcose` layout algorithm to the initial graph render. The layout SHALL run once and the result SHALL be stabilized before the graph is displayed to the user.

#### Scenario: Graph layout stabilized on load
- **WHEN** the graph builder completes and elements are added to Cytoscape
- **THEN** the fcose layout runs and the graph is displayed in a stable, non-overlapping configuration
