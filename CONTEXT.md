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

**Effective Distribution Depth**:
The farthest consistent downstream position proven by transaction relationships within a branch. A direct shortcut does not pull a company inward when another relationship proves a longer downstream chain.
_Avoid_: Shortest distance

**Equivalent Siblings**:
Companies supplied by the same upstream company with no transaction relationship proving that one is downstream of the other.
_Avoid_: Permanently equal level

**Cycle Group**:
Companies connected by a directed transaction cycle whose relative downstream order cannot be established consistently. Members of a Cycle Group occupy the same effective level.
_Avoid_: Infinite hierarchy
