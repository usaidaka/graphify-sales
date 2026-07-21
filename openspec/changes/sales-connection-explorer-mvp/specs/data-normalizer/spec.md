## ADDED Requirements

### Requirement: Deduplicate company nodes
The system SHALL produce a single canonical node for each unique company that appears across all transaction sheets and the Data Perusahaan master. Deduplication key SHALL be the company name after applying `trim()` normalization. The original display name SHALL be taken from Data Perusahaan if available, otherwise from the first occurrence in transaction data.

#### Scenario: Same company appears in multiple sheets
- **WHEN** a company name appears in both FM and FK sheets
- **THEN** only one node is created for that company in the graph

#### Scenario: Company name has leading/trailing whitespace
- **WHEN** a company name like " PT Example " appears in a sheet
- **THEN** it is normalized to "PT Example" before deduplication

---

### Requirement: Classify nodes as Internal
The system SHALL classify a company node as **Internal** if its normalized name appears in the Data Perusahaan master list.

#### Scenario: Internal company classified
- **WHEN** a company name is found in the Data Perusahaan list
- **THEN** its node type is set to `"internal"`

---

### Requirement: Classify node as Distributor
The system SHALL classify the company "PT Software Farmer Indonesia" as **Distributor**, overriding any other classification including Internal.

#### Scenario: Distributor takes precedence
- **WHEN** the normalized company name is "PT Software Farmer Indonesia"
- **THEN** its node type is set to `"distributor"` regardless of Data Perusahaan membership

---

### Requirement: Classify node as Special External
The system SHALL classify the company "CV Berkah Cahaya Abadi" as **Special External**, overriding the External default.

#### Scenario: Special External classified
- **WHEN** the normalized company name is "CV Berkah Cahaya Abadi"
- **THEN** its node type is set to `"special-external"`

---

### Requirement: Classify remaining nodes as External
The system SHALL classify all companies not matching Internal, Distributor, or Special External rules as **External**.

#### Scenario: Default External classification
- **WHEN** a company does not match any special classification rule
- **THEN** its node type is set to `"external"`

---

### Requirement: Smart merge duplicate edges
The system SHALL merge all transaction rows that share the same (sellerName, buyerName) pair into a single canonical edge. The merged edge SHALL accumulate: total invoice count, sum of DPP, sum of PPN, union of approval statuses, union of dataset sources, and union of period values.

#### Scenario: Two rows with same seller-buyer pair merged
- **WHEN** FM contains two rows with seller="A" buyer="B"
- **THEN** a single edge A→B is created with invoiceCount=2 and summed DPP/PPN

#### Scenario: Same seller-buyer pair across different datasets merged
- **WHEN** FM has A→B and FK also has A→B
- **THEN** a single edge A→B is created with `datasets: ["FM", "FK"]`

---

### Requirement: Maintain per-dataset edge attribution
The system SHALL tag each source transaction row's dataset on the merged edge so that Layer Manager filtering can show/hide edges based on active datasets.

#### Scenario: Edge with mixed datasets filtered by layer
- **WHEN** a merged edge has `datasets: ["FM", "FK"]` and the FM layer is toggled off
- **THEN** the edge remains visible because the FK layer is still active; edge metadata shows only FK-sourced data

#### Scenario: Edge with single dataset hidden by layer toggle
- **WHEN** a merged edge has `datasets: ["FM"]` and the FM layer is toggled off
- **THEN** the edge is hidden from the graph

---

### Requirement: Produce typed NormalizedGraph output
The system SHALL produce a `NormalizedGraph` object containing a `nodes: NodeData[]` array and `edges: EdgeData[]` array as the output of normalization. This object SHALL be the single input to the graph builder.

#### Scenario: NormalizedGraph produced successfully
- **WHEN** normalization completes on valid parsed data
- **THEN** a `NormalizedGraph` with non-empty nodes and edges arrays is available in the application context
