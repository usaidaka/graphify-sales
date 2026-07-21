## ADDED Requirements

### Requirement: Search companies by name
The system SHALL provide a search input that allows users to find companies by name. Search SHALL be case-insensitive and SHALL match on partial name substrings.

#### Scenario: User types partial company name
- **WHEN** the user types "software" in the Company Explorer search input
- **THEN** the search results show all companies whose names contain "software" (case-insensitive)

---

### Requirement: Display search results as a dropdown list
The system SHALL display matching companies in a dropdown list below the search input. The list SHALL show up to 10 results. Each result SHALL display the company name and its node type classification.

#### Scenario: Dropdown renders with results
- **WHEN** the search query matches one or more companies
- **THEN** a dropdown appears showing company name and type (e.g., "Internal", "External") for each match

#### Scenario: No results found
- **WHEN** the search query does not match any company
- **THEN** the dropdown shows a "No companies found" message

---

### Requirement: Select a company to trigger Focus Mode
The system SHALL trigger Focus Mode for the selected company when the user clicks a result in the dropdown. The graph SHALL animate to center on that company's node.

#### Scenario: Search result selection triggers focus
- **WHEN** the user clicks a company name in the search dropdown
- **THEN** Focus Mode is activated for that company's node in the graph and the dropdown closes

---

### Requirement: Clear search input
The system SHALL provide a clear button or mechanism to reset the search input. Clearing SHALL close the dropdown without triggering any graph interaction.

#### Scenario: Clear button resets search
- **WHEN** the user clicks the clear button in the search input
- **THEN** the input is cleared and the dropdown closes
