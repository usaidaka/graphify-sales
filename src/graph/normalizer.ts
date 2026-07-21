import { ParsedWorkbook, RawTransactionRow } from '../parsers/types';
import { NodeType, NodeData, EdgeData, NormalizedGraph } from './types';

export function normalizeCompanyName(name: string): string {
  if (!name) return '';
  return String(name).trim();
}

export function classifyNode(name: string, internalSet: Set<string>): NodeType {
  const norm = normalizeCompanyName(name).toLowerCase();
  
  if (norm === 'pt software farmer indonesia') {
    return 'distributor';
  }
  
  if (norm === 'cv berkah cahaya abadi') {
    return 'special-external';
  }
  
  // Check against internal master (assuming internalSet holds lowercase normalized names or we check dynamically)
  for (const internalName of internalSet) {
    if (normalizeCompanyName(internalName).toLowerCase() === norm) {
      return 'internal';
    }
  }
  
  return 'external';
}

type DatasetRow = {
  row: RawTransactionRow;
  dataset: string;
};

export function buildNodeMap(rows: DatasetRow[], internalSet: Set<string>): Map<string, NodeData> {
  const nodeMap = new Map<string, NodeData>();

  // Add internal nodes first to ensure they get their display name from Data Perusahaan
  internalSet.forEach(internalName => {
    const norm = normalizeCompanyName(internalName);
    const key = norm.toLowerCase();
    if (key) {
      nodeMap.set(key, {
        id: key,
        companyName: norm, // Best available display name
        nodeType: 'internal'
      });
    }
  });

  // Process all transaction rows for sellers and buyers
  rows.forEach(({ row }) => {
    const processCompany = (name: string) => {
      const norm = normalizeCompanyName(name);
      const key = norm.toLowerCase();
      if (!key) return;

      if (!nodeMap.has(key)) {
        nodeMap.set(key, {
          id: key,
          companyName: norm,
          nodeType: classifyNode(norm, internalSet)
        });
      }
    };

    processCompany(row.sellerName);
    processCompany(row.buyerName);
  });

  return nodeMap;
}

export function mergeEdges(rows: DatasetRow[]): Map<string, EdgeData> {
  const edgeMap = new Map<string, EdgeData>();

  rows.forEach(({ row, dataset }) => {
    const sourceKey = normalizeCompanyName(row.sellerName).toLowerCase();
    const targetKey = normalizeCompanyName(row.buyerName).toLowerCase();
    
    if (!sourceKey || !targetKey) return;
    
    const edgeId = `${sourceKey}→${targetKey}`;

    if (!edgeMap.has(edgeId)) {
      edgeMap.set(edgeId, {
        id: edgeId,
        source: sourceKey,
        target: targetKey,
        invoiceCount: 0,
        totalDPP: 0,
        totalPPN: 0,
        datasets: [],
        approvalStatus: [],
        periods: []
      });
    }

    const edge = edgeMap.get(edgeId)!;
    edge.invoiceCount += 1;
    edge.totalDPP += row.dpp || 0;
    edge.totalPPN += row.ppn || 0;
    
    if (dataset && !edge.datasets.includes(dataset)) {
      edge.datasets.push(dataset);
    }
    
    const approval = (row.approvalStatus || '').trim();
    if (approval && !edge.approvalStatus.includes(approval)) {
      edge.approvalStatus.push(approval);
    }
    
    const period = (row.period || '').trim();
    if (period && !edge.periods.includes(period)) {
      edge.periods.push(period);
    }
  });

  return edgeMap;
}

export function normalize(parsed: ParsedWorkbook): NormalizedGraph {
  const internalSet = new Set(parsed.dataPerusahaan);
  
  const allRows: DatasetRow[] = [
    ...parsed.fm.map(row => ({ row, dataset: 'FM' })),
    ...parsed.fk.map(row => ({ row, dataset: 'FK' })),
    ...parsed.fmCrtx.map(row => ({ row, dataset: 'FM_CRTX' })),
    ...parsed.fkCrtx.map(row => ({ row, dataset: 'FK_CRTX' }))
  ];

  const nodeMap = buildNodeMap(allRows, internalSet);
  const edgeMap = mergeEdges(allRows);

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values())
  };
}
