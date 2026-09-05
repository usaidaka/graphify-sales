## ADDED Requirements

### Requirement: Separate SFI-centered transaction views
The explorer SHALL provide separate `Penjualan` and `Pembelian` views and SHALL keep SFI as the fixed center of both views.

#### Scenario: Sales view is selected
- **WHEN** the user selects `Penjualan`
- **THEN** the hierarchy starts at SFI and follows seller-to-buyer transactions outward

#### Scenario: Purchase view is selected
- **WHEN** the user selects `Pembelian`
- **THEN** the hierarchy starts at SFI and follows buyer-to-seller relationships outward while arrows retain their original seller-to-buyer direction toward SFI

### Requirement: Preserve direct SFI relationships
Every eligible company that transacts directly with SFI in the selected direction SHALL be placed at transaction level 1 and SHALL remain connected directly to SFI regardless of principal status or transaction value.

#### Scenario: Non-principal outranks a principal
- **WHEN** a non-principal direct counterparty has greater transaction value than LDN
- **THEN** the non-principal may be positioned closer to SFI while both companies retain independent direct edges with SFI

#### Scenario: Company also connects through a principal
- **WHEN** a company has both a direct SFI relationship and a relationship with a principal
- **THEN** the explorer displays a direct level-1 instance connected to SFI and a separate instance in the principal path without manufacturing an edge between the instances

### Requirement: Permit one company in multiple principal paths
The explorer SHALL maintain one canonical business identity while allowing at most one separate visual instance of that company in each GBA, LDN, MSP, and LJ branch slot through which it is directionally reachable.

#### Scenario: Company is reachable through all principals
- **WHEN** the same canonical company is directionally reachable through GBA, LDN, MSP, and LJ
- **THEN** the explorer displays four branch-specific instances carrying the same canonical company ID

#### Scenario: Company repeats within one branch
- **WHEN** multiple paths inside one principal branch reach the same canonical company
- **THEN** that branch contains one visual instance for the company and preserves eligible factual relationships to it

#### Scenario: Repeated instance is selected
- **WHEN** the user selects any visual instance of a repeated company
- **THEN** the canonical company detail is opened and all visible instances with that canonical company ID are highlighted

### Requirement: Keep duplicated instances out of business totals
Visual instance duplication SHALL NOT multiply company counts, relationship counts, invoice counts, DPP, PPN, or other canonical statistics.

#### Scenario: One company appears in four paths
- **WHEN** one canonical company is rendered as four visual instances
- **THEN** statistics and detail totals count its canonical transactions once

### Requirement: Preferred principal branch anchors
The explorer SHALL treat LDN, GBA, MSP, and LJ as preferred branch anchors when each has an eligible direct relationship with SFI in the selected view.

#### Scenario: All official principals are active
- **WHEN** all four principals transact directly with SFI under the active filters
- **THEN** all four occupy their preferred branch slots without receiving reserved value ranks

### Requirement: Replace unavailable principal slots
For each preferred principal without an eligible direct SFI relationship, the explorer SHALL fill its branch slot with the highest-value eligible non-principal direct SFI counterparty not already selected as a replacement.

#### Scenario: GBA is absent in a period
- **WHEN** GBA has no eligible direct SFI relationship and at least one non-principal direct counterparty exists
- **THEN** the highest-ranked eligible non-principal fills the GBA slot as a replacement hub

#### Scenario: Multiple principal slots are absent
- **WHEN** multiple principal slots are unavailable
- **THEN** distinct replacement hubs fill the slots in total-DPP, invoice-count, and stable-ID order

#### Scenario: No replacement is available
- **WHEN** a principal is absent and no unused direct counterparty is available
- **THEN** the slot remains empty and no synthetic company node is created

### Requirement: Build deterministic transaction hierarchy
The explorer SHALL assign deterministic transaction levels independently inside each branch, SHALL terminate for cyclic graphs, and SHALL preserve canonical factual relationships through branch-specific visual edge instances.

#### Scenario: Multi-hop sales path exists
- **WHEN** the active graph contains `SFI -> LDN -> A -> B`
- **THEN** SFI, LDN, A, and B are assigned levels 0, 1, 2, and 3 respectively

#### Scenario: Transaction cycle exists
- **WHEN** the selected-direction graph contains a cycle
- **THEN** each branch produces finite stable levels and at most one visual instance per canonical company in that branch

### Requirement: Hierarchy transaction layout mode
The explorer SHALL provide a `Hierarki Transaksi` mode in which radial distance is determined only by transaction level and not by transaction value.

#### Scenario: Different values share one hierarchy level
- **WHEN** two direct SFI counterparties have different transaction values
- **THEN** both are placed on the same level radius in `Hierarki Transaksi` mode

#### Scenario: Hierarchy mode is fitted
- **WHEN** hierarchy mode is applied or the viewport changes
- **THEN** the visible hierarchy is recalculated and fitted to the graph viewport

### Requirement: Value ranking layout mode
The explorer SHALL provide a `Ranking Nilai` mode that assigns dense distance ranks by total DPP among companies sharing the same primary transaction parent, with larger values closer to that parent and equal values sharing a rank.

#### Scenario: Direct counterparty outranks principal
- **WHEN** a direct non-principal has greater total DPP with SFI than a principal
- **THEN** the non-principal is positioned one or more distance steps closer to SFI and the principal moves outward as required by its dense rank

#### Scenario: Equal transaction values
- **WHEN** sibling companies have equal total DPP
- **THEN** they share the same distance step

#### Scenario: Descendant has a large local transaction
- **WHEN** a descendant has a large transaction with its principal
- **THEN** it is ranked relative to that principal and remains beyond its parent in the SFI hierarchy

### Requirement: Layout switching preserves graph content
Switching between `Hierarki Transaksi` and `Ranking Nilai` SHALL change positions and rank presentation only; it SHALL preserve the selected transaction view, visible companies, factual edges, filters, and detail interactions.

#### Scenario: User switches layout mode
- **WHEN** the user changes from hierarchy mode to value mode
- **THEN** the same graph elements remain available and are repositioned according to value ranks

### Requirement: Uniform value styling
The overview SHALL NOT encode transaction value through node size or edge thickness. It SHALL distinguish SFI, official principals, and replacement hubs using non-value role styling.

#### Scenario: Two relationships have different values
- **WHEN** two visible relationships have different total DPP
- **THEN** their overview line widths remain equal while their value ranks may produce different positions

### Requirement: Respect active transaction filters
View selection, principal availability, replacement ranking, hierarchy, and value ranking SHALL use only transactions eligible under the active dataset, period, invoice-universe, and scope controls while keeping SFI available as the required visual anchor.

#### Scenario: Period change removes a principal transaction
- **WHEN** a period filter removes the only eligible direct relationship between SFI and a principal
- **THEN** that principal no longer occupies its official slot and replacement selection is recalculated
