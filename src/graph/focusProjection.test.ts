import { describe, expect, it } from 'vitest';
import type { EdgeData, NormalizedGraph } from './types';
import { partitionFocusedRelationships } from './focusProjection';

describe('partitionFocusedRelationships', () => {
  it('groups ordinary external counterparties and keeps other company roles individual', () => {
    const graph: NormalizedGraph = {
      nodes: [
        { id: 'svk', companyName: 'CV SVK', nodeType: 'internal' },
        { id: 'aps', companyName: 'PT APS', nodeType: 'external', isImport: false },
        { id: 'nf', companyName: 'PT NF', nodeType: 'external', isImport: false },
        { id: 'import', companyName: 'IMPORT A', nodeType: 'external', isImport: true },
        { id: 'bca', companyName: 'CV BCA', nodeType: 'special-external' },
      ],
      edges: [],
    };
    const relationships: EdgeData[] = [
      edge('aps-svk', 'aps', 'svk'),
      edge('nf-svk', 'nf', 'svk'),
      edge('import-svk', 'import', 'svk'),
      edge('svk-bca', 'svk', 'bca'),
    ];

    const result = partitionFocusedRelationships(graph, 'svk', relationships);

    expect(result.externalMemberIds).toEqual(['aps', 'nf']);
    expect(result.externalRelationships.map(({ id }) => id)).toEqual(['aps-svk', 'nf-svk']);
    expect(result.individualRelationships.map(({ id }) => id)).toEqual([
      'import-svk',
      'svk-bca',
    ]);
  });
});

function edge(id: string, source: string, target: string): EdgeData {
  return {
    id,
    source,
    target,
    invoiceCount: 1,
    totalDPP: 1,
    totalPPN: 0,
    datasets: ['FM'],
    approvalStatus: [],
    statuses: [],
    periods: [],
  };
}
