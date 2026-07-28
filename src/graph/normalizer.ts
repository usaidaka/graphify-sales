import { ParsedWorkbook, RawTransactionRow, InternalCompanyMaster } from '../parsers/types';
import { NodeType, NodeData, EdgeData, NormalizedGraph } from './types';

export function normalizeCompanyName(name: string): string {
  if (!name) return '';
  return String(name).trim();
}

export function stripLegalEntity(name: string): string {
  if (!name) return '';
  return String(name)
    .trim()
    .replace(/^(pt|cv|ud|tbk|nv|firma)\.?\s+/i, '')
    .replace(/\s+(pt|cv|ud|tbk|nv|firma)\.?$/i, '')
    .trim();
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
    const info = { canonicalName: canonical, fullName: full };

    if (full) {
      map.set(full.toLowerCase(), info);
      const strippedFull = stripLegalEntity(full).toLowerCase();
      if (strippedFull && !map.has(strippedFull)) {
        map.set(strippedFull, info);
      }
    }
    if (abbr) {
      map.set(abbr.toLowerCase(), info);
      const strippedAbbr = stripLegalEntity(abbr).toLowerCase();
      if (strippedAbbr && !map.has(strippedAbbr)) {
        map.set(strippedAbbr, info);
      }
    }
  });

  return map;
}

export function isWapuEntity(name: string): string | boolean {
  if (!name) return false;
  const lower = name.toLowerCase().trim();
  if (lower === 'wapu') return true;

  const wapuKeywords = /\b(dinas|kementerian|kemendag|kemenkes|kemenkeu|kemendagri|kemendikbud|sudin|suku dinas|badan|satker|satuan kerja|pemerintah|pemprov|pemkab|pemkot|kantor pelayanan|kantor wilayah|kanwil|sekretariat|bappeda|bkd|diskes|disdik|dishub|disbun|disperindag|distamben|disnakertrans|polres|polda|kodam|korem|kodim)\b/i;
  return wapuKeywords.test(lower);
}

export function extractLegalEntity(name: string): { prefix: string; cleanName: string } {
  if (!name) return { prefix: '', cleanName: '' };
  const trimmed = name.trim();
  
  const matchPrefix = trimmed.match(/^(pt|cv|ud|tbk|nv|firma)\.?\s+/i);
  if (matchPrefix) {
    const prefix = matchPrefix[1].toUpperCase();
    const cleanName = trimmed.slice(matchPrefix[0].length).trim();
    return { prefix, cleanName };
  }

  const matchSuffix = trimmed.match(/\s+(pt|cv|ud|tbk|nv|firma)\.?$/i);
  if (matchSuffix) {
    const prefix = matchSuffix[1].toUpperCase();
    const cleanName = trimmed.slice(0, trimmed.length - matchSuffix[0].length).trim();
    return { prefix, cleanName };
  }

  return { prefix: '', cleanName: trimmed };
}

export function generateCanonicalAbbreviation(rawName: string): { abbr: string; fullWithLegal: string } {
  if (!rawName) return { abbr: '', fullWithLegal: '' };
  const norm = rawName.trim();
  
  const { prefix, cleanName } = extractLegalEntity(norm);
  const words = cleanName
    .split(/[\s\-_]+/)
    .filter(w => w.length > 0 && w.toLowerCase() !== 'dan' && w !== '&');

  const effectivePrefix = prefix || (words.length >= 3 ? 'PT' : 'CV');
  const fullWithLegal = prefix ? norm : `${effectivePrefix} ${cleanName}`;

  if (cleanName.length <= 6 || words.length === 1) {
    const singleWord = words[0] || cleanName;
    const isShortAcronym = singleWord.length <= 5 || singleWord === singleWord.toUpperCase();
    const cleanWord = isShortAcronym ? singleWord.toUpperCase() : singleWord;
    return {
      abbr: prefix ? `${prefix} ${cleanWord}` : cleanWord,
      fullWithLegal
    };
  }

  const initials = words.map(w => w[0].toUpperCase()).join('');
  const abbr = `${effectivePrefix} ${initials}`;

  return { abbr, fullWithLegal };
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

  const stripped = stripLegalEntity(norm).toLowerCase();
  if (stripped && aliasMap.has(stripped)) {
    const info = aliasMap.get(stripped)!;
    return {
      key: info.canonicalName.toLowerCase(),
      displayName: info.canonicalName,
      fullName: info.fullName
    };
  }

  if (isWapuEntity(norm)) {
    return {
      key: 'wapu',
      displayName: 'WAPU',
      fullName: 'WAPU (Wajib Pungut / Instansi Pemerintah)'
    };
  }

  const generated = generateCanonicalAbbreviation(norm);

  if (aliasMap.has(generated.abbr.toLowerCase())) {
    const info = aliasMap.get(generated.abbr.toLowerCase())!;
    return {
      key: info.canonicalName.toLowerCase(),
      displayName: info.canonicalName,
      fullName: info.fullName
    };
  }

  if (aliasMap.has(generated.fullWithLegal.toLowerCase())) {
    const info = aliasMap.get(generated.fullWithLegal.toLowerCase())!;
    return {
      key: info.canonicalName.toLowerCase(),
      displayName: info.canonicalName,
      fullName: info.fullName
    };
  }

  return {
    key: generated.abbr.toLowerCase(),
    displayName: generated.abbr,
    fullName: generated.fullWithLegal
  };
}

export function classifyNode(name: string, internalSet: Set<string>): NodeType {
  const norm = normalizeCompanyName(name).toLowerCase();
  const strippedNorm = stripLegalEntity(norm).toLowerCase();

  if (norm === 'wapu' || norm.startsWith('wapu ') || isWapuEntity(name)) {
    return 'wapu';
  }
  
  // Special External companies per client specification:
  // PT SFI (PT Software Farmer Indonesia) and PT BCA (CV/PT Berkah Cahaya Abadi)
  if (
    norm === 'pt software farmer indonesia' ||
    norm === 'pt sfi' ||
    norm === 'cv berkah cahaya abadi' ||
    norm === 'pt berkah cahaya abadi' ||
    norm === 'pt bca' ||
    norm === 'cv bca' ||
    strippedNorm === 'software farmer indonesia' ||
    strippedNorm === 'berkah cahaya abadi'
  ) {
    return 'special-external';
  }
  
  // Check against internal master set (case-insensitive & stripped)
  for (const internalName of internalSet) {
    const normInternal = normalizeCompanyName(internalName).toLowerCase();
    const strippedInternal = stripLegalEntity(normInternal).toLowerCase();
    if (normInternal === norm || (strippedInternal && strippedInternal === strippedNorm)) {
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

