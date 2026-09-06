# Sales Connection Explorer

Sales Connection Explorer describes transaction-derived distribution paths centered on SFI. The same company may have separate occurrences when it participates in more than one path.

## Language

**Transaction Source**:
SFI as the fixed origin of a sales or purchases view and Level 0 of its visual hierarchy.
_Avoid_: Ordinary company, principal

**Direct Principal**:
A company with a transaction relationship directly connected to the Transaction Source in the active view. It remains the root of its own branch even when it also occurs downstream in another branch.
_Avoid_: Fixed principal slot

**Branch Occurrence**:
The representation of a company within one Direct Principal's distribution path. One company identity may have multiple Branch Occurrences without becoming multiple companies.
_Avoid_: Duplicate company

**Internal Boundary**:
The circular boundary containing SFI's internal and special-external company network. External, distributor, and WAPU occurrences sit outside this boundary while retaining their transaction paths.
_Avoid_: Entire graph boundary

**Effective Distribution Depth**:
The farthest consistent downstream position established by transaction relationships and sibling-cohort ordering within a branch. A direct shortcut does not pull a company inward when the cohort establishes a downstream tier.
_Avoid_: Shortest distance

**Equivalent Siblings**:
Companies assigned to the same tier under a shared upstream company. When one sibling supplies another, sibling suppliers form the upstream tier and all non-supplier siblings align on the downstream tier.
_Avoid_: Permanently equal level

**Cycle Group**:
Companies connected by a directed transaction cycle whose relative downstream order cannot be established consistently. Members of a Cycle Group occupy the same effective level.
_Avoid_: Infinite hierarchy
