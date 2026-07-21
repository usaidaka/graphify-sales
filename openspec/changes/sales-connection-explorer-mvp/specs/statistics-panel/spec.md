## ADDED Requirements

### Requirement: Display total company count
The Statistics Panel SHALL display the total number of unique company nodes in the graph.

#### Scenario: Total company count shown
- **WHEN** the Statistics Panel is displayed
- **THEN** the total number of unique companies derived from all datasets is shown

---

### Requirement: Display company counts by type
The Statistics Panel SHALL display separate counts for Internal, External, Distributor, and Special External companies.

#### Scenario: Breakdown by node type shown
- **WHEN** the Statistics Panel is displayed
- **THEN** counts are shown for each of the four node types

---

### Requirement: Display total relationship count
The Statistics Panel SHALL display the total number of unique Seller→Buyer relationships (merged edges) in the graph.

#### Scenario: Relationship count shown
- **WHEN** the Statistics Panel is displayed
- **THEN** the total count of unique merged edges is displayed

---

### Requirement: Display Top Supplier
The system SHALL identify and display the company with the highest number of outgoing edges (selling to the most unique buyers) as Top Supplier.

#### Scenario: Top Supplier identified
- **WHEN** the Statistics Panel is displayed
- **THEN** the company name with the most outgoing edges is shown as "Top Supplier" with the count of buyers

---

### Requirement: Display Top Customer
The system SHALL identify and display the company with the highest number of incoming edges (buying from the most unique sellers) as Top Customer.

#### Scenario: Top Customer identified
- **WHEN** the Statistics Panel is displayed
- **THEN** the company name with the most incoming edges is shown as "Top Customer" with the count of sellers

---

### Requirement: Display Most Connected Company
The system SHALL identify the company with the highest total degree (sum of incoming and outgoing edges) as Most Connected Company.

#### Scenario: Most Connected Company shown
- **WHEN** the Statistics Panel is displayed
- **THEN** the company name with the highest combined in-degree + out-degree is shown

---

### Requirement: Statistics reflect active layers
The system SHALL recompute statistics based on the currently active layers. When a layer is toggled off, statistics SHALL update to reflect only data from active layers.

#### Scenario: Statistics update on layer toggle
- **WHEN** the user toggles a layer off
- **THEN** all statistics in the Statistics Panel recalculate to reflect only active layer data
