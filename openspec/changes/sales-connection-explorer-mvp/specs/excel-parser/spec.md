## ADDED Requirements

### Requirement: Parse Excel workbook at startup
The system SHALL load and parse `Sales Connection.xlsx` from `src/assets/data/` once at application startup using the SheetJS (`xlsx`) library. Parsed data SHALL be cached in memory for the lifetime of the session.

#### Scenario: Successful workbook load
- **WHEN** the application initializes
- **THEN** `Sales Connection.xlsx` is loaded from the bundled asset path and all five sheets (FM, FK, FM_CRTX, FK_CRTX, Data Perusahaan) are extracted into typed row arrays

#### Scenario: Missing workbook asset
- **WHEN** `Sales Connection.xlsx` is not found at the expected asset path
- **THEN** the application SHALL display a clear error state with a message indicating the data file is missing

---

### Requirement: Extract transaction rows from FM sheet
The system SHALL parse the FM worksheet and extract rows as typed `FMRow` objects. Each row SHALL capture: seller company name, buyer company name, invoice number, DPP amount, PPN amount, approval status, and period.

#### Scenario: Valid FM rows extracted
- **WHEN** the FM sheet is parsed
- **THEN** each data row is mapped to a `FMRow` typed object with all required fields; empty rows are skipped

---

### Requirement: Extract transaction rows from FK sheet
The system SHALL parse the FK worksheet using the same column mapping conventions as FM, producing `FKRow` typed objects.

#### Scenario: Valid FK rows extracted
- **WHEN** the FK sheet is parsed
- **THEN** each data row is mapped to a `FKRow` typed object; empty rows are skipped

---

### Requirement: Extract transaction rows from FM_CRTX sheet
The system SHALL parse the FM_CRTX worksheet and produce `FMCRTXRow` typed objects.

#### Scenario: Valid FM_CRTX rows extracted
- **WHEN** the FM_CRTX sheet is parsed
- **THEN** each data row is mapped to a `FMCRTXRow` typed object; empty rows are skipped

---

### Requirement: Extract transaction rows from FK_CRTX sheet
The system SHALL parse the FK_CRTX worksheet and produce `FKCRTXRow` typed objects.

#### Scenario: Valid FK_CRTX rows extracted
- **WHEN** the FK_CRTX sheet is parsed
- **THEN** each data row is mapped to a `FKCRTXRow` typed object; empty rows are skipped

---

### Requirement: Extract company master from Data Perusahaan sheet
The system SHALL parse the Data Perusahaan worksheet and extract the list of internal company names. This list is used as the master reference for Internal node classification.

#### Scenario: Company master extracted
- **WHEN** the Data Perusahaan sheet is parsed
- **THEN** a Set of internal company names is produced for O(1) lookup during normalization

---

### Requirement: Normalize column names across sheets
The system SHALL apply a per-sheet column name mapping configuration to handle differences in column headers across sheets. Column names SHALL be trimmed of whitespace before mapping.

#### Scenario: Column name normalization applied
- **WHEN** parsing any transaction sheet
- **THEN** raw header strings are mapped to canonical field names (e.g., "Nama Penjual" → `sellerName`) before row objects are constructed
