import type { EdgeData, NormalizedGraph } from './types';

export interface FocusedRelationshipPartition {
  externalRelationships: EdgeData[];
  individualRelationships: EdgeData[];
  externalMemberIds: string[];
  incomingExternalRelationships: EdgeData[];
  outgoingExternalRelationships: EdgeData[];
  incomingExternalMemberIds: string[];
  outgoingExternalMemberIds: string[];
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

  const incomingExternalRelationships = externalRelationships.filter(
    (relationship) => relationship.target === focusedNodeId
  );
  const outgoingExternalRelationships = externalRelationships.filter(
    (relationship) => relationship.source === focusedNodeId
  );
  const counterpartIds = (groupedRelationships: EdgeData[]) => [...new Set(
    groupedRelationships.map((relationship) => (
      relationship.source === focusedNodeId
        ? relationship.target
        : relationship.source
    ))
  )];

  return {
    externalRelationships,
    individualRelationships,
    externalMemberIds: counterpartIds(externalRelationships),
    incomingExternalRelationships,
    outgoingExternalRelationships,
    incomingExternalMemberIds: counterpartIds(incomingExternalRelationships),
    outgoingExternalMemberIds: counterpartIds(outgoingExternalRelationships),
  };
}
