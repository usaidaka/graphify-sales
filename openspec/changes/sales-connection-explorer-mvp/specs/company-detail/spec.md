## ADDED Requirements

### Requirement: Display company classification
The Company Detail Panel SHALL display the company name and its node type classification (Internal, External, Distributor, Special External) prominently at the top of the panel.

#### Scenario: Company name and type shown
- **WHEN** Focus Mode is activated for a company node
- **THEN** the Company Detail Panel displays the company name and classification type

---

### Requirement: Display connected sellers (incoming relationships)
The system SHALL list all companies that sell TO the focused company (incoming edges), with each entry showing the seller company name and total invoice count.

#### Scenario: Incoming sellers listed
- **WHEN** Focus Mode is active for company B which receives from A and C
- **THEN** the panel lists A and C under a "Suppliers / Sellers" section with their respective invoice counts

---

### Requirement: Display connected buyers (outgoing relationships)
The system SHALL list all companies that the focused company sells TO (outgoing edges), with each entry showing the buyer company name and total invoice count.

#### Scenario: Outgoing buyers listed
- **WHEN** Focus Mode is active for company A which sells to B and D
- **THEN** the panel lists B and D under a "Customers / Buyers" section with their respective invoice counts

---

### Requirement: Display invoice summary for the company
The system SHALL display aggregate financial metrics for the focused company: total invoices as seller, total invoices as buyer, total DPP as seller, total DPP as buyer.

#### Scenario: Invoice summary shown
- **WHEN** the Company Detail Panel is open
- **THEN** aggregate totals for the company's selling and buying activity are displayed

---

### Requirement: Navigate to connected company
The system SHALL allow the user to click on a connected company name listed in the Company Detail Panel to shift Focus Mode to that company.

#### Scenario: Click connected company name changes focus
- **WHEN** the user clicks the name of a connected company in the Company Detail Panel
- **THEN** Focus Mode transitions to the clicked company (new center, new panel content)
