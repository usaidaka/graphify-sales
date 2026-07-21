## ADDED Requirements

### Requirement: Display node type legend
The Legend SHALL display an entry for each of the four node types (Internal, External, Distributor, Special External) showing the node color/shape sample and its label.

#### Scenario: All four node types in legend
- **WHEN** the Legend is displayed
- **THEN** entries for Internal, External, Distributor, and Special External are visible with their respective visual representations

---

### Requirement: Display edge type legend
The Legend SHALL display entries explaining edge semantics: directed arrow (Seller → Buyer) and edge weight meaning (line thickness = invoice volume).

#### Scenario: Edge semantics shown in legend
- **WHEN** the Legend is displayed
- **THEN** an arrow with "Seller → Buyer" label and a note about line thickness meaning are visible

---

### Requirement: Legend is always visible
The Legend SHALL be persistently visible on the graph canvas (e.g., as a floating overlay in a corner) and SHALL NOT require user action to open.

#### Scenario: Legend visible without interaction
- **WHEN** the graph is displayed
- **THEN** the legend is visible in a fixed position on the canvas without requiring any click or hover

---

### Requirement: Legend can be collapsed
The system SHALL provide a toggle to collapse the Legend to a minimal icon and re-expand it, to reduce visual clutter for advanced users.

#### Scenario: Legend collapsed
- **WHEN** the user clicks the collapse toggle on the Legend
- **THEN** the legend collapses to a small icon and the canvas area is no longer obscured

#### Scenario: Legend re-expanded
- **WHEN** the legend is collapsed and the user clicks the expand toggle
- **THEN** the full legend is shown again
