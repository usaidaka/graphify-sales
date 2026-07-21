## ADDED Requirements

### Requirement: Open Relationship Detail Panel on edge click
The system SHALL open a Relationship Detail Panel when the user clicks on an edge in the graph. The panel SHALL appear as a side panel or overlay without hiding the graph canvas.

#### Scenario: Edge click opens detail panel
- **WHEN** the user clicks on an edge between company A and company B
- **THEN** the Relationship Detail Panel opens and displays information for that edge

---

### Requirement: Display seller and buyer information
The system SHALL display the seller company name and buyer company name in the Relationship Detail Panel, clearly labelled.

#### Scenario: Seller and buyer names shown
- **WHEN** the Relationship Detail Panel is open for edge A→B
- **THEN** the panel displays "Seller: [A name]" and "Buyer: [B name]"

---

### Requirement: Display invoice count
The system SHALL display the total number of invoices (merged row count) for the relationship.

#### Scenario: Invoice count displayed
- **WHEN** the Relationship Detail Panel is open
- **THEN** the panel displays the `invoiceCount` value labeled as "Total Invoices" or equivalent

---

### Requirement: Display DPP and PPN totals
The system SHALL display the total DPP (Dasar Pengenaan Pajak) and total PPN (Pajak Pertambahan Nilai) for the relationship, formatted as currency (IDR).

#### Scenario: DPP and PPN displayed
- **WHEN** the Relationship Detail Panel is open
- **THEN** `totalDPP` and `totalPPN` are shown formatted as Indonesian Rupiah (e.g., Rp 1.234.567)

---

### Requirement: Display approval status
The system SHALL display all distinct approval status values for the relationship.

#### Scenario: Approval status shown
- **WHEN** the Relationship Detail Panel is open
- **THEN** all distinct approval statuses from the merged edge are listed

---

### Requirement: Display dataset sources
The system SHALL display the dataset sources (e.g., FM, FK, FM_CRTX, FK_CRTX) that contributed to the relationship.

#### Scenario: Dataset sources listed
- **WHEN** the Relationship Detail Panel is open
- **THEN** all contributing dataset labels are shown (e.g., "Sources: FM, FK")

---

### Requirement: Display periods
The system SHALL display all distinct period values for the relationship.

#### Scenario: Periods listed
- **WHEN** the Relationship Detail Panel is open
- **THEN** the period values are shown (e.g., monthly periods or fiscal periods)

---

### Requirement: Close Relationship Detail Panel
The system SHALL provide a mechanism to close the Relationship Detail Panel (close button, background click, or Escape key).

#### Scenario: Panel closed by user
- **WHEN** the user clicks the close button or presses Escape
- **THEN** the Relationship Detail Panel closes and the edge returns to its default visual state
