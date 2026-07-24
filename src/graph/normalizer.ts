import { ParsedWorkbook, RawTransactionRow, InternalCompanyMaster } from '../parsers/types';
import { NodeType, NodeData, EdgeData, NormalizedGraph } from './types';

export function normalizeCompanyName(name: string): string {
  if (!name) return '';
  return String(name).trim();
}

export type AliasInfo = {
  canonicalName: string;
  fullName: string;
};

export function buildAliasMap(companyMaster: InternalCompanyMaster[]): Map<string, AliasInfo> {
  const map = new Map<string, AliasInfo>();
  if (!companyMaster) return map;

  companyMaster.forEach(item => {
    const full = normalizeCompanyName(item.fullName);
    const abbr = normalizeCompanyName(item.abbreviation);
    const canonical = abbr || full;
    
    if (full) {
      map.set(full.toLowerCase(), { canonicalName: canonical, fullName: full });
    }
    if (abbr) {
      map.set(abbr.toLowerCase(), { canonicalName: canonical, fullName: full });
    }
  });

  return map;
}

export function resolveCompany(name: string, aliasMap: Map<string, AliasInfo>): { key: string; displayName: string; fullName?: string } {
  const norm = normalizeCompanyName(name);
  const lower = norm.toLowerCase();
  
  if (aliasMap.has(lower)) {
    const info = aliasMap.get(lower)!;
    return {
      key: info.canonicalName.toLowerCase(),
      displayName: info.canonicalName,
      fullName: info.fullName
    };
  }

  return {
    key: lower,
    displayName: norm,
    fullName: norm
  };
}

export function classifyNode(name: string, internalSet: Set<string>): NodeType {
  const norm = normalizeCompanyName(name).toLowerCase();
  
  // Special External companies per client specification:
  // PT SFI (PT Software Farmer Indonesia) and PT BCA (CV/PT Berkah Cahaya Abadi)
  if (
    norm === 'pt software farmer indonesia' ||
    norm === 'pt sfi' ||
    norm === 'cv berkah cahaya abadi' ||
    norm === 'pt berkah cahaya abadi' ||
    norm === 'pt bca' ||
    norm === 'cv bca'
  ) {
    return 'special-external';
  }
  
  // Check against internal master set (case-insensitive)
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

export function buildNodeMap(
  rows: DatasetRow[], 
  internalSet: Set<string>, 
  aliasMap: Map<string, AliasInfo>
): Map<string, NodeData> {
  const nodeMap = new Map<string, NodeData>();

  // Add internal master nodes first to ensure canonical abbreviations are present
  internalSet.forEach(internalName => {
    const resolved = resolveCompany(internalName, aliasMap);
    if (resolved.key && !nodeMap.has(resolved.key)) {
      nodeMap.set(resolved.key, {
        id: resolved.key,
        companyName: resolved.displayName,
        fullName: resolved.fullName,
        nodeType: classifyNode(resolved.displayName, internalSet)
      });
    }
  });

  // Process transaction rows for sellers and buyers
  rows.forEach(({ row }) => {
    const processCompany = (name: string, isCompanyImport: boolean) => {
      const resolved = resolveCompany(name, aliasMap);
      if (!resolved.key) return;

      if (!nodeMap.has(resolved.key)) {
        nodeMap.set(resolved.key, {
          id: resolved.key,
          companyName: resolved.displayName,
          fullName: resolved.fullName,
          nodeType: classifyNode(resolved.displayName, internalSet),
          isImport: isCompanyImport
        });
      } else if (isCompanyImport) {
        nodeMap.get(resolved.key)!.isImport = true;
      }
    };

    processCompany(row.sellerName, row.isImport);
    processCompany(row.buyerName, row.isImport);
  });

  return nodeMap;
}

export function mergeEdges(rows: DatasetRow[], aliasMap: Map<string, AliasInfo>): Map<string, EdgeData> {
  const edgeMap = new Map<string, EdgeData>();

  rows.forEach(({ row, dataset }) => {
    const sourceResolved = resolveCompany(row.sellerName, aliasMap);
    const targetResolved = resolveCompany(row.buyerName, aliasMap);
    
    if (!sourceResolved.key || !targetResolved.key) return;
    
    const edgeId = `${sourceResolved.key}→${targetResolved.key}`;
    const statusNorm = (row.status || '').trim().toLowerCase();
    const isCancelledOrReplaced = statusNorm.includes('batal') || statusNorm.includes('diganti');

    if (!edgeMap.has(edgeId)) {
      edgeMap.set(edgeId, {
        id: edgeId,
        source: sourceResolved.key,
        target: targetResolved.key,
        invoiceCount: 0,
        totalDPP: 0,
        totalPPN: 0,
        datasets: [],
        approvalStatus: [],
        statuses: [],
        periods: [],
        isCancelledOrReplaced
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
    
    const statusVal = (row.status || '').trim();
    if (statusVal && !edge.statuses.includes(statusVal)) {
      edge.statuses.push(statusVal);
    }

    const period = (row.period || '').trim();
    if (period && !edge.periods.includes(period)) {
      edge.periods.push(period);
    }
  });

  return edgeMap;
}

export function normalize(
  parsed: ParsedWorkbook,
  universeMode: 'active' | 'cancelled-replaced' = 'active',
  scopeFilter: 'with-external' | 'internal-only' = 'with-external',
  yearFrom: number | 'all' = 'all',
  yearTo: number | 'all' = 'all',
  selectedMonth: number | 'all' = 'all',
  activeDatasets: Set<string> = new Set(['FM', 'FK', 'FM_CRTX', 'FK_CRTX'])
): NormalizedGraph {
  const internalSet = new Set(parsed.dataPerusahaan || []);
  const aliasMap = buildAliasMap(parsed.companyMaster || []);
  
  const rawRows: DatasetRow[] = [
    ...parsed.fm.map(row => ({ row, dataset: 'FM' })),
    ...parsed.fk.map(row => ({ row, dataset: 'FK' })),
    ...parsed.fmCrtx.map(row => ({ row, dataset: 'FM_CRTX' })),
    ...parsed.fkCrtx.map(row => ({ row, dataset: 'FK_CRTX' }))
  ];

  // Apply all transaction-level filters before merging so totals remain accurate.
  const filteredRows = rawRows.filter(({ row }) => {
    const statusNorm = (row.status || '').trim().toLowerCase();
    const isCancelledOrReplaced = statusNorm.includes('batal') || statusNorm.includes('diganti');
    const matchesUniverse = universeMode === 'active'
      ? !isCancelledOrReplaced
      : isCancelledOrReplaced;
    const matchesYearFrom = yearFrom === 'all' || (row.year !== null && row.year >= yearFrom);
    const matchesYearTo = yearTo === 'all' || (row.year !== null && row.year <= yearTo);
    const matchesMonth = selectedMonth === 'all' || row.month === selectedMonth;

    return matchesUniverse && matchesYearFrom && matchesYearTo && matchesMonth;
  }).filter(({ dataset }) => {
    return activeDatasets.has(dataset);
  });

  const nodeMap = buildNodeMap(filteredRows, internalSet, aliasMap);
  const edgeMap = mergeEdges(filteredRows, aliasMap);

  let nodes = Array.from(nodeMap.values());
  let edges = Array.from(edgeMap.values());

  // Filter by Scope
  if (scopeFilter === 'internal-only') {
    nodes = nodes.filter(n => n.nodeType === 'internal');
    const internalKeys = new Set(nodes.map(n => n.id));
    edges = edges.filter(e => internalKeys.has(e.source) && internalKeys.has(e.target));
  }

  // Never expose companies without a transaction after all active filters.
  const connectedNodeIds = new Set<string>();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });
  nodes = nodes.filter(node => connectedNodeIds.has(node.id));

  return { nodes, edges };
}

