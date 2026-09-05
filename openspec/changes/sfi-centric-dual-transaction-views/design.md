## Context

The normalized graph stores truthful directed transactions as `seller (source) -> buyer (target)`. The current overview chooses internal hubs and reduces their relationships into a left-to-right flow. A prior radial experiment and the current Focus Mode provide useful positioning primitives, but neither fixes SFI as the business center, separates sales from purchases, or distinguishes official principals from temporary layout hubs.

The required visual has two independent meanings: graph edges and hierarchy represent actual transactions, while optional distance ranks transaction value. Distance must never manufacture a parent-child relationship. LDN, GBA, MSP, and LJ are preferred principal branch anchors, but their status must not reserve a closer value rank.

## Goals / Non-Goals

**Goals:**

- Keep SFI fixed at the center of separate sales and purchase views.
- Show all directionally reachable transactions from or toward SFI without converting direct counterparties into children of a principal.
- Allow the same canonical company to appear independently in every principal path through which it is directionally reachable.
- Prefer four official principals as branch anchors and deterministically fill unavailable slots from direct counterparties.
- Make hierarchy extraction finite and deterministic for cyclic transaction data.
- Provide hierarchy-only and value-ranked radial layouts over the same selected graph.
- Keep transaction value independent from node size and edge thickness.

**Non-Goals:**

- Infer legal ownership, contractual principal status, or missing transactions.
- Reclassify a replacement hub as an official principal.
- Aggregate sales and purchases into one canvas.
- Encode transaction value simultaneously through size or line width.
- Guarantee crossing-free routing for arbitrary directed graphs.

## Decisions

### Resolve business anchors by normalized aliases

SFI and the four principals are identified against normalized node ID, display name, and full name aliases. Matching tolerates common legal prefixes and the established abbreviations `SFI`, `LDN`, `GBA`, `MSP`, and `LJ`. The layout role is independent from `nodeType`, resolving the existing historical disagreement over SFI classification.

### Build direction-specific reachable graphs

Sales traversal follows `source -> target` starting at SFI. Purchase traversal follows the reverse adjacency from SFI while preserving the original seller-to-buyer arrow direction. Breadth-first traversal assigns every reachable node its minimum transaction level, so every direct SFI counterparty remains level 1. A visited-level map prevents cycles from expanding indefinitely.

Every edge whose endpoints are in the reachable graph and which advances in the selected direction remains eligible for display. The canonical graph remains the source of truth; hierarchy expansion creates visual instances without copying normalized business records.

### Expand hierarchy independently per principal path

Each active principal or replacement hub starts an independent, cycle-safe branch traversal. A canonical company receives at most one visual instance per branch slot, identified by a composite visual ID such as `branch:<slot>:<canonicalCompanyId>`. Therefore the same company may appear in the GBA, LDN, MSP, and LJ paths simultaneously when it is reachable through all four paths.

Direct SFI relationships use a separate `direct:<canonicalCompanyId>` instance connected directly to SFI. If that company is also reachable through one or more principal paths, the direct instance and branch instances coexist; the graph does not manufacture an edge between those copies. Edge instances likewise carry a unique visual ID plus their canonical relationship ID.

Alternative: keep one node and draw cross-branch edges to it. Rejected because shared nodes pull four flows together, recreate the current hairball, and cannot resemble the reference radial matrix.

### Select four preferred branch anchors with deterministic replacements

Each official principal occupies its preferred slot only when it has a direct SFI relationship in the selected direction after all active filters. Empty slots are filled by the highest-value non-principal direct counterparties, ordered by total DPP, invoice count, and stable ID. A replacement receives a `replacement hub` layout role, not principal classification.

All remaining direct counterparties are still visible at level 1. Branch slots organize angular space; they do not alter edge endpoints or reserve transaction ranks.

### Keep hierarchy and value as separate layout modes

`Hierarki Transaksi` places SFI at level 0 and uses one shared radius per breadth-first level within each branch. Nodes are ordered inside their branch lane by stable ID, then the result is fit to the viewport. Transaction value does not affect position.

`Ranking Nilai` keeps the same branch instances but assigns dense value ranks among siblings of the same visual parent in each branch. Higher total DPP is closer to that parent; equal values share a distance step. A child is always positioned beyond its parent relative to SFI, preserving readable hierarchy. This rank-step model avoids extreme monetary outliers creating unbounded geometry.

Alternative: map raw DPP continuously to pixels. Rejected because outliers would make the graph impractically large and contradict the requested step behavior.

### Keep value styling uniform

SFI, official principals, and replacement hubs use role-specific outlines/badges or shapes, but ordinary node diameter and edge width remain fixed in the overview. Rank labels and detail panels communicate values without duplicating the distance signal.

### Preserve canonical identity across visual instances

Every visual node stores `canonicalCompanyId`, and every visual edge stores `canonicalEdgeId`. Company search, detail panels, and statistics operate on canonical IDs. Selecting one visual copy opens the canonical company detail and highlights all visible copies of that company, while the clicked copy remains the path context. Duplicate instances never multiply invoice, DPP, PPN, company, or relationship totals.

## Risks / Trade-offs

- **A fully reachable hierarchy may be large** -> Use compact level spacing, collision-aware angular distribution, viewport fitting, and existing focus/detail interactions.
- **Cycles and multi-parent nodes make a strict tree impossible** -> Use minimum BFS level plus one deterministic primary layout parent while retaining factual edges.
- **Repeated labels may be mistaken for duplicate business data** -> Keep a branch-specific visual ID, canonical data ID, branch-role styling, and canonical-only statistics.
- **Four branch traversals increase rendered element count** -> Deduplicate within each branch, cap expansion through cycle-safe visitation, and keep branch instances isolated for readable routing.
- **A replacement hub may be mistaken for a business principal** -> Apply a distinct replacement role and explicit summary text; never mutate `nodeType`.
- **Scope `internal-only` can remove SFI because SFI is special external** -> Build the SFI view from filtered transaction dimensions while ensuring the anchor and its eligible relationships survive the visualization scope.
- **Hierarchy and value modes can appear to show different data** -> Reuse the exact same visible node and edge sets; only positions and rank labels change.

## Migration Plan

Replace the current overview transformation in `NetworkGraph` with the SFI-centered model and add view/layout controls. Focus and detail panels remain compatible with the normalized graph. Rollback restores the transaction-flow overview invocation and removes the new UI state; no data migration is required.

## Open Questions

None. Replacement hubs are treated as visual branch anchors and may organize their actual reachable descendants without being reclassified as official principals. Visual duplication is permitted across branch slots but never within the same branch.
