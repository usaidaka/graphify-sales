import { describe, expect, it } from 'vitest';
import { buildCytoscapeElements } from './builder';
import type { NormalizedGraph } from './types';

const graph: NormalizedGraph = {
  nodes: [
    {
      id: 'pt sfi',
      companyName: 'PT SFI',
      nodeType: 'special-external',
      directors: ['Edi Sulistio'],
      kppLabels: ['KPP 412'],
    },
    { id: 'cv asa', companyName: 'CV ASA', nodeType: 'internal' },
  ],
  edges: [{
    id: 'pt sfi-to-cv asa',
    source: 'pt sfi',
    target: 'cv asa',
    invoiceCount: 12,
    totalDPP: 1_500_000_000,
    totalPPN: 165_000_000,
    datasets: ['FK'],
    approvalStatus: ['Approved'],
    statuses: ['Normal'],
    periods: ['1 / 2024'],
  }],
};

function label(mode: Parameters<typeof buildCytoscapeElements>[1]): string {
  const node = buildCytoscapeElements(graph, mode).find(
    (element) => element.group === 'nodes' && element.data?.id === 'pt sfi'
  );
  return String(node?.data?.displayLabel);
}

describe('node annotations', () => {
  it('renders each requested Keterangan from the filtered graph data', () => {
    expect(label('director')).toBe('PT SFI\nEdi Sulistio');
    expect(label('dpp')).toBe('PT SFI\n1,5M');
    expect(label('invoice-count')).toBe('PT SFI\n12 F');
    expect(label('kpp')).toBe('PT SFI\nKPP 412');
  });
});
