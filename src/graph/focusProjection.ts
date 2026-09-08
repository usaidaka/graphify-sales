import type { EdgeData, NormalizedGraph } from './types';

export interface FocusedRelationshipPartition {
  externalRelationships: EdgeData[];
  individualRelationships: EdgeData[];
  externalMemberIds: string[];
}

/**
 * Ordinary external counterparties collapse into one temporary visual group.
 * Import and every explicit business role stay individually identifiable.
 */
export function partitionFocusedRelationships(
  graph: NormalizedGraph,
  focusedNodeId: string,
  relationships: EdgeData[]
): FocusedRelationshipPartition {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const externalRelationships: EdgeData[] = [];
  const individualRelationships: EdgeData[] = [];

  relationships.forEach((relationship) => {
    const counterpartId = relationship.source === focusedNodeId
      ? relationship.target
      : relationship.source;
    const counterpart = nodeById.get(counterpartId);
    if (counterpart?.nodeType === 'external' && !counterpart.isImport) {
      externalRelationships.push(relationship);
    } else {
      individualRelationships.push(relationship);
    }
  });

  return {
    externalRelationships,
    individualRelationships,
    externalMemberIds: [...new Set(externalRelationships.map((relationship) =>
      relationship.source === focusedNodeId
        ? relationship.target
        : relationship.source
    ))],
  };
}
