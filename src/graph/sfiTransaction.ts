import type { EdgeData, NodeData, NormalizedGraph } from './types';

export type TransactionView = 'sales' | 'purchases';
export type SfiLayoutMode = 'hierarchy' | 'value';
export type PrincipalKey = 'GBA' | 'LDN' | 'MSP' | 'LJ';
export type VisualBranchKey = PrincipalKey | `COMPANY:${string}` | 'DIRECT';

const PRINCIPALS: ReadonlyArray<{ key: PrincipalKey; angle: number }> = [
  { key: 'GBA', angle: 3 * Math.PI / 4 },
  { key: 'LDN', angle: -3 * Math.PI / 4 },
  { key: 'MSP', angle: Math.PI / 4 },
  { key: 'LJ', angle: -Math.PI / 4 },
];
const VISUAL_BRANCH_ORDER: PrincipalKey[] = ['LDN', 'LJ', 'MSP', 'GBA'];

const LEGAL_PREFIXES = new Set(['pt', 'cv', 'pd', 'ud']);
const HIERARCHY_LEVEL_GAP = 150;
const VALUE_FIRST_STEP = 108;
const VALUE_RANK_GAP = 46;

export interface BranchSlot {
  principal: VisualBranchKey;
  principalNodeId: string | null;
  hubNodeId: string | null;
  hubInstanceId: string | null;
  isReplacement: boolean;
  angle: number;
}

export interface VisualNodeInstance {
  id: string;
  canonicalCompanyId: string;
  branch: VisualBranchKey;
  level: number;
}

export interface VisualEdgeInstance {
  id: string;
  canonicalEdgeId: string;
  source: string;
  target: string;
  branch: VisualBranchKey;
}

export interface SfiTransactionOverview {
  view: TransactionView;
  sfiId: string | null;
  sfiInstanceId: string | null;
  nodeInstances: VisualNodeInstance[];
  edgeInstances: VisualEdgeInstance[];
  visibleNodeIds: Set<string>;
  visibleEdgeIds: Set<string>;
  canonicalVisibleNodeIds: Set<string>;
  canonicalVisibleEdgeIds: Set<string>;
  levelByNode: Map<string, number>;
  parentByNode: Map<string, string>;
  parentEdgeByNode: Map<string, string>;
  branchRootByNode: Map<string, string>;
  branchSlots: BranchSlot[];
  officialPrincipalIds: Set<string>;
  replacementHubIds: Set<string>;
  valueByNode: Map<string, number>;
  valueRankByNode: Map<string, number>;
}

export interface SfiPosition {
  x: number;
  y: number;
}

interface CanonicalAnalysis {
  sfi: NodeData;
  adjacency: Map<string, EdgeData[]>;
  visibleNodeIds: Set<string>;
  visibleEdges: EdgeData[];
  levelByNode: Map<string, number>;
  parentByNode: Map<string, string>;
  parentEdgeByNode: Map<string, string>;
  valueByNode: Map<string, number>;
  branchRootByNode: Map<string, string>;
  branchSlots: Omit<BranchSlot, 'hubInstanceId'>[];
}

function normalizedWords(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function identityForms(node: NodeData): Set<string> {
  const forms = new Set<string>();
  [node.id, node.companyName, node.fullName ?? ''].forEach((value) => {
    const words = normalizedWords(value);
    if (words.length === 0) return;
    forms.add(words.join(' '));
    if (LEGAL_PREFIXES.has(words[0])) forms.add(words.slice(1).join(' '));
  });
  return forms;
}

function matchesAlias(node: NodeData, aliases: string[]): boolean {
  const forms = identityForms(node);
  return aliases.some((alias) => forms.has(normalizedWords(alias).join(' ')));
}

export function isSfiNode(node: NodeData): boolean {
  return matchesAlias(node, [
    'SFI',
    'PT SFI',
    'Software Farmer Indonesia',
    'PT Software Farmer Indonesia',
  ]);
}

function resolvePrincipalNode(
  nodes: NodeData[],
  key: PrincipalKey
): NodeData | undefined {
  return nodes.find((node) => matchesAlias(node, [key, `PT ${key}`, `CV ${key}`]));
}

function edgeValue(edge: EdgeData): number {
  return edge.totalDPP > 0 ? edge.totalDPP : edge.invoiceCount;
}

function traversalEndpoints(
  edge: EdgeData,
  view: TransactionView
): { parent: string; child: string } {
  return view === 'sales'
    ? { parent: edge.source, child: edge.target }
    : { parent: edge.target, child: edge.source };
}

function compareEdges(a: EdgeData, b: EdgeData): number {
  return edgeValue(b) - edgeValue(a)
    || b.invoiceCount - a.invoiceCount
    || a.id.localeCompare(b.id);
}

function assignDenseRanks(
  nodes: string[],
  valueByNode: Map<string, number>
): Map<string, number> {
  const ranked = [...nodes].sort((a, b) =>
    (valueByNode.get(b) ?? 0) - (valueByNode.get(a) ?? 0)
    || a.localeCompare(b)
  );
  const result = new Map<string, number>();
  let rank = 0;
  let previous: number | undefined;
  ranked.forEach((nodeId) => {
    const value = valueByNode.get(nodeId) ?? 0;
    if (previous === undefined || value < previous) rank += 1;
    result.set(nodeId, rank);
    previous = value;
  });
  return result;
}

function buildCanonicalAnalysis(
  graph: NormalizedGraph,
  view: TransactionView,
  sfi: NodeData
): CanonicalAnalysis {
  const adjacency = new Map<string, EdgeData[]>();
  graph.edges.forEach((edge) => {
    const { parent } = traversalEndpoints(edge, view);
    const list = adjacency.get(parent) ?? [];
    list.push(edge);
    adjacency.set(parent, list);
  });
  adjacency.forEach((edges) => edges.sort(compareEdges));

  const levelByNode = new Map<string, number>([[sfi.id, 0]]);
  const queue = [sfi.id];
  for (let index = 0; index < queue.length; index += 1) {
    const parentId = queue[index];
    const nextLevel = (levelByNode.get(parentId) ?? 0) + 1;
    for (const edge of adjacency.get(parentId) ?? []) {
      const { child } = traversalEndpoints(edge, view);
      if (!levelByNode.has(child)) {
        levelByNode.set(child, nextLevel);
        queue.push(child);
      }
    }
  }

  const visibleNodeIds = new Set(levelByNode.keys());
  const visibleEdges = graph.edges.filter((edge) =>
    visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
  );
  const parentByNode = new Map<string, string>();
  const parentEdgeByNode = new Map<string, string>();
  const valueByNode = new Map<string, number>();

  [...visibleNodeIds]
    .filter((nodeId) => nodeId !== sfi.id)
    .sort((a, b) =>
      (levelByNode.get(a) ?? 0) - (levelByNode.get(b) ?? 0)
      || a.localeCompare(b)
    )
    .forEach((nodeId) => {
      const level = levelByNode.get(nodeId)!;
      const selected = visibleEdges
        .filter((edge) => {
          const { parent, child } = traversalEndpoints(edge, view);
          return child === nodeId && levelByNode.get(parent) === level - 1;
        })
        .sort(compareEdges)[0];
      if (!selected) return;
      const { parent } = traversalEndpoints(selected, view);
      parentByNode.set(nodeId, parent);
      parentEdgeByNode.set(nodeId, selected.id);
      valueByNode.set(nodeId, edgeValue(selected));
    });

  const directIds = [...visibleNodeIds]
    .filter((nodeId) => levelByNode.get(nodeId) === 1)
    .sort((a, b) => a.localeCompare(b));
  const principalNodeByKey = new Map<PrincipalKey, string>();
  PRINCIPALS.forEach(({ key }) => {
    const node = resolvePrincipalNode(graph.nodes, key);
    if (node) principalNodeByKey.set(key, node.id);
  });
  const theoreticalKeyByNodeId = new Map<string, PrincipalKey>(
    [...principalNodeByKey.entries()].map(([key, nodeId]) => [nodeId, key])
  );
  const orderedDirectIds = [...directIds].sort((a, b) => {
    const keyA = theoreticalKeyByNodeId.get(a);
    const keyB = theoreticalKeyByNodeId.get(b);
    const orderA = keyA ? VISUAL_BRANCH_ORDER.indexOf(keyA) : Number.MAX_SAFE_INTEGER;
    const orderB = keyB ? VISUAL_BRANCH_ORDER.indexOf(keyB) : Number.MAX_SAFE_INTEGER;
    return orderA - orderB
      || (valueByNode.get(b) ?? 0) - (valueByNode.get(a) ?? 0)
      || a.localeCompare(b);
  });
  const branchSlots = orderedDirectIds.map((nodeId) => ({
    principal: theoreticalKeyByNodeId.get(nodeId) ?? `COMPANY:${nodeId}` as VisualBranchKey,
    principalNodeId: nodeId,
    hubNodeId: nodeId,
    isReplacement: false,
    angle: 0,
  }));
  branchSlots.forEach((slot, activeBranchIndex) => {
    const activeBranchCount = branchSlots.length;
    const sectorSize = (2 * Math.PI) / activeBranchCount;
    slot.angle = -Math.PI + sectorSize * (activeBranchIndex + 0.5);
  });

  const branchRootByNode = new Map<string, string>();
  directIds.forEach((nodeId) => branchRootByNode.set(nodeId, nodeId));
  [...visibleNodeIds]
    .filter((nodeId) => (levelByNode.get(nodeId) ?? 0) > 1)
    .sort((a, b) => (levelByNode.get(a)! - levelByNode.get(b)!) || a.localeCompare(b))
    .forEach((nodeId) => {
      const parent = parentByNode.get(nodeId);
      if (parent) branchRootByNode.set(nodeId, branchRootByNode.get(parent) ?? parent);
    });

  return {
    sfi,
    adjacency,
    visibleNodeIds,
    visibleEdges,
    levelByNode,
    parentByNode,
    parentEdgeByNode,
    valueByNode,
    branchRootByNode,
    branchSlots,
  };
}

function visualNodeId(branch: VisualBranchKey, canonicalId: string): string {
  return `${branch === 'DIRECT' ? 'direct' : `branch:${branch}`}:${canonicalId}`;
}

function visualEdgeId(branch: VisualBranchKey, canonicalId: string): string {
  return `${branch === 'DIRECT' ? 'direct' : `branch:${branch}`}:edge:${canonicalId}`;
}

function emptyOverview(view: TransactionView, sfi?: NodeData): SfiTransactionOverview {
  const sfiInstanceId = sfi ? `center:${sfi.id}` : null;
  const nodeInstances = sfi && sfiInstanceId
    ? [{ id: sfiInstanceId, canonicalCompanyId: sfi.id, branch: 'DIRECT' as const, level: 0 }]
    : [];
  return {
    view,
    sfiId: sfi?.id ?? null,
    sfiInstanceId,
    nodeInstances,
    edgeInstances: [],
    visibleNodeIds: new Set(nodeInstances.map(({ id }) => id)),
    visibleEdgeIds: new Set(),
    canonicalVisibleNodeIds: new Set(sfi ? [sfi.id] : []),
    canonicalVisibleEdgeIds: new Set(),
    levelByNode: new Map(sfiInstanceId ? [[sfiInstanceId, 0]] : []),
    parentByNode: new Map(),
    parentEdgeByNode: new Map(),
    branchRootByNode: new Map(),
    branchSlots: [],
    officialPrincipalIds: new Set(),
    replacementHubIds: new Set(),
    valueByNode: new Map(),
    valueRankByNode: new Map(),
  };
}

export function createSfiTransactionOverview(
  graph: NormalizedGraph,
  view: TransactionView
): SfiTransactionOverview {
  const sfi = graph.nodes.find(isSfiNode);
  if (!sfi) return emptyOverview(view);
  const analysis = buildCanonicalAnalysis(graph, view, sfi);
  const overview = emptyOverview(view, sfi);
  const sfiInstanceId = overview.sfiInstanceId!;
  const nodeInstances = new Map(overview.nodeInstances.map((node) => [node.id, node]));
  const edgeInstances = new Map<string, VisualEdgeInstance>();
  const levelByNode = new Map(overview.levelByNode);
  const parentByNode = new Map<string, string>();
  const parentEdgeByNode = new Map<string, string>();
  const branchRootByNode = new Map<string, string>();
  const valueByNode = new Map<string, number>();
  const officialPrincipalIds = new Set<string>();
  const replacementHubIds = new Set<string>();
  const canonicalEdgeById = new Map(graph.edges.map((edge) => [edge.id, edge]));
  const slotByHub = new Map<string, VisualBranchKey>();
  analysis.branchSlots.forEach((slot) => {
    if (slot.hubNodeId) slotByHub.set(slot.hubNodeId, slot.principal);
  });

  const addNode = (
    id: string,
    canonicalCompanyId: string,
    branch: VisualBranchKey,
    level: number,
    rootId: string
  ) => {
    if (!nodeInstances.has(id)) {
      nodeInstances.set(id, { id, canonicalCompanyId, branch, level });
      levelByNode.set(id, level);
      branchRootByNode.set(id, rootId);
    }
  };

  const addEdge = (
    branch: VisualBranchKey,
    edge: EdgeData,
    source: string,
    target: string
  ): string => {
    const id = visualEdgeId(branch, edge.id);
    if (!edgeInstances.has(id)) {
      edgeInstances.set(id, {
        id,
        canonicalEdgeId: edge.id,
        source,
        target,
        branch,
      });
    }
    return id;
  };

  const mapEdgeEndpoints = (
    edge: EdgeData,
    instanceByCanonical: Map<string, string>
  ): { source: string; target: string } | null => {
    const { parent, child } = traversalEndpoints(edge, view);
    const source = parent === sfi.id
      ? sfiInstanceId
      : instanceByCanonical.get(parent);
    const target = child === sfi.id
      ? sfiInstanceId
      : instanceByCanonical.get(child);
    return source && target ? { source, target } : null;
  };

  const branchSlots = analysis.branchSlots.map((slot) => {
    if (!slot.hubNodeId) return { ...slot, hubInstanceId: null };
    const hubInstanceId = visualNodeId(slot.principal, slot.hubNodeId);
    officialPrincipalIds.add(hubInstanceId);
    return { ...slot, hubInstanceId };
  });

  // Preserve one canonical rendering tree for direct roots that are not used
  // as a branch hub. This keeps every reachable company visible at least once
  // without collapsing independent principal paths together.
  const directInstanceByCanonical = new Map<string, string>([[sfi.id, sfiInstanceId]]);
  [...analysis.visibleNodeIds]
    .filter((canonicalId) => canonicalId !== sfi.id)
    .sort((a, b) =>
      (analysis.levelByNode.get(a) ?? 0) - (analysis.levelByNode.get(b) ?? 0)
      || a.localeCompare(b)
    )
    .forEach((canonicalId) => {
      const root = analysis.branchRootByNode.get(canonicalId) ?? canonicalId;
      if (slotByHub.has(root)) return;
      const id = visualNodeId('DIRECT', canonicalId);
      const rootInstanceId = visualNodeId('DIRECT', root);
      directInstanceByCanonical.set(canonicalId, id);
      addNode(
        id,
        canonicalId,
        'DIRECT',
        analysis.levelByNode.get(canonicalId) ?? 1,
        rootInstanceId
      );
    });

  analysis.visibleEdges.forEach((edge) => {
    const endpoints = mapEdgeEndpoints(edge, directInstanceByCanonical);
    if (endpoints) addEdge('DIRECT', edge, endpoints.source, endpoints.target);
  });
  directInstanceByCanonical.forEach((instanceId, canonicalId) => {
    if (canonicalId === sfi.id) return;
    const parentCanonical = analysis.parentByNode.get(canonicalId);
    const canonicalEdgeId = analysis.parentEdgeByNode.get(canonicalId);
    const parentInstance = parentCanonical
      ? directInstanceByCanonical.get(parentCanonical)
      : undefined;
    const canonicalEdge = canonicalEdgeId ? canonicalEdgeById.get(canonicalEdgeId) : undefined;
    if (!parentInstance || !canonicalEdge) return;
    const edgeId = visualEdgeId('DIRECT', canonicalEdge.id);
    parentByNode.set(instanceId, parentInstance);
    parentEdgeByNode.set(instanceId, edgeId);
    valueByNode.set(instanceId, edgeValue(canonicalEdge));
  });

  // Expand every branch independently. The visited map is branch-local, which
  // permits the same canonical company in multiple slots but only once per slot.
  branchSlots.forEach((slot) => {
    if (!slot.hubNodeId || !slot.hubInstanceId) return;
    const branch = slot.principal;
    const localLevel = new Map<string, number>([[slot.hubNodeId, 1]]);
    const queue = [slot.hubNodeId];
    for (let index = 0; index < queue.length; index += 1) {
      const parentCanonical = queue[index];
      const nextLevel = localLevel.get(parentCanonical)! + 1;
      for (const edge of analysis.adjacency.get(parentCanonical) ?? []) {
        const { child } = traversalEndpoints(edge, view);
        if (child === sfi.id || localLevel.has(child)) continue;
        localLevel.set(child, nextLevel);
        queue.push(child);
      }
    }

    const instanceByCanonical = new Map<string, string>([[sfi.id, sfiInstanceId]]);
    [...localLevel.entries()]
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
      .forEach(([canonicalId, level]) => {
        const id = visualNodeId(branch, canonicalId);
        instanceByCanonical.set(canonicalId, id);
        addNode(id, canonicalId, branch, level, slot.hubInstanceId!);
      });

    const hubCanonicalEdgeId = analysis.parentEdgeByNode.get(slot.hubNodeId);
    const hubCanonicalEdge = hubCanonicalEdgeId
      ? canonicalEdgeById.get(hubCanonicalEdgeId)
      : undefined;
    if (hubCanonicalEdge) {
      const endpoints = mapEdgeEndpoints(hubCanonicalEdge, instanceByCanonical);
      if (endpoints) {
        const edgeId = addEdge(branch, hubCanonicalEdge, endpoints.source, endpoints.target);
        parentByNode.set(slot.hubInstanceId, sfiInstanceId);
        parentEdgeByNode.set(slot.hubInstanceId, edgeId);
        valueByNode.set(slot.hubInstanceId, edgeValue(hubCanonicalEdge));
      }
    }

    const branchEdges = analysis.visibleEdges.filter((edge) => {
      if (edge.source === sfi.id || edge.target === sfi.id) return false;
      return localLevel.has(edge.source) && localLevel.has(edge.target);
    });
    branchEdges.forEach((edge) => {
      const endpoints = mapEdgeEndpoints(edge, instanceByCanonical);
      if (endpoints) addEdge(branch, edge, endpoints.source, endpoints.target);
    });

    [...localLevel.entries()]
      .filter(([canonicalId]) => canonicalId !== slot.hubNodeId)
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
      .forEach(([canonicalId, level]) => {
        const selected = branchEdges
          .filter((edge) => {
            const { parent, child } = traversalEndpoints(edge, view);
            return child === canonicalId && localLevel.get(parent) === level - 1;
          })
          .sort(compareEdges)[0];
        if (!selected) return;
        const { parent } = traversalEndpoints(selected, view);
        const instanceId = instanceByCanonical.get(canonicalId)!;
        const parentInstanceId = instanceByCanonical.get(parent)!;
        parentByNode.set(instanceId, parentInstanceId);
        parentEdgeByNode.set(instanceId, visualEdgeId(branch, selected.id));
        valueByNode.set(instanceId, edgeValue(selected));
      });
  });

  const valueRankByNode = new Map<string, number>();
  const childrenByParent = new Map<string, string[]>();
  parentByNode.forEach((parentId, nodeId) => {
    const children = childrenByParent.get(parentId) ?? [];
    children.push(nodeId);
    childrenByParent.set(parentId, children);
  });
  childrenByParent.forEach((children) => {
    assignDenseRanks(children, valueByNode).forEach((rank, nodeId) =>
      valueRankByNode.set(nodeId, rank)
    );
  });

  const finalNodes = [...nodeInstances.values()];
  const finalEdges = [...edgeInstances.values()];
  return {
    view,
    sfiId: sfi.id,
    sfiInstanceId,
    nodeInstances: finalNodes,
    edgeInstances: finalEdges,
    visibleNodeIds: new Set(finalNodes.map(({ id }) => id)),
    visibleEdgeIds: new Set(finalEdges.map(({ id }) => id)),
    canonicalVisibleNodeIds: analysis.visibleNodeIds,
    canonicalVisibleEdgeIds: new Set(analysis.visibleEdges.map(({ id }) => id)),
    levelByNode,
    parentByNode,
    parentEdgeByNode,
    branchRootByNode,
    branchSlots,
    officialPrincipalIds,
    replacementHubIds,
    valueByNode,
    valueRankByNode,
  };
}

function angularDistance(a: number, b: number): number {
  const difference = Math.abs(a - b) % (2 * Math.PI);
  return Math.min(difference, 2 * Math.PI - difference);
}

function assignRootAngles(overview: SfiTransactionOverview): Map<string, number> {
  const angles = new Map<string, number>();
  overview.branchSlots.forEach((slot) => {
    if (slot.hubInstanceId) angles.set(slot.hubInstanceId, slot.angle);
  });
  const unassignedRoots = [...overview.branchRootByNode.entries()]
    .filter(([nodeId, rootId]) => nodeId === rootId && !angles.has(rootId))
    .map(([nodeId]) => nodeId)
    .sort((a, b) =>
      (overview.valueRankByNode.get(a) ?? Number.MAX_SAFE_INTEGER)
      - (overview.valueRankByNode.get(b) ?? Number.MAX_SAFE_INTEGER)
      || a.localeCompare(b)
    );
  const candidateCount = Math.max(16, (unassignedRoots.length + angles.size) * 3);
  const candidates = Array.from(
    { length: candidateCount },
    (_, index) => -Math.PI + (index * 2 * Math.PI) / candidateCount
  );
  unassignedRoots.forEach((nodeId) => {
    const used = [...angles.values()];
    candidates.sort((a, b) => {
      const aGap = used.length === 0 ? Math.PI : Math.min(...used.map((x) => angularDistance(a, x)));
      const bGap = used.length === 0 ? Math.PI : Math.min(...used.map((x) => angularDistance(b, x)));
      return bGap - aGap || a - b;
    });
    angles.set(nodeId, candidates.shift() ?? 0);
  });
  return angles;
}

function angleByNode(
  overview: SfiTransactionOverview,
  rootAngles: Map<string, number>
): Map<string, number> {
  const result = new Map<string, number>();
  const activeBranchCount = Math.max(
    1,
    overview.branchSlots.filter(({ hubInstanceId }) => hubInstanceId).length
  );
  const branchRoots = new Set(
    overview.branchSlots.flatMap(({ hubInstanceId }) => hubInstanceId ? [hubInstanceId] : [])
  );
  if (overview.sfiInstanceId) result.set(overview.sfiInstanceId, 0);
  const groups = new Map<string, string[]>();
  overview.visibleNodeIds.forEach((nodeId) => {
    if (nodeId === overview.sfiInstanceId) return;
    const root = overview.branchRootByNode.get(nodeId) ?? nodeId;
    const key = `${root}:${overview.levelByNode.get(nodeId) ?? 0}`;
    const nodes = groups.get(key) ?? [];
    nodes.push(nodeId);
    groups.set(key, nodes);
  });
  const orderedGroups = [...groups.values()].sort((a, b) =>
    (overview.levelByNode.get(a[0]) ?? 0) - (overview.levelByNode.get(b[0]) ?? 0)
    || a[0].localeCompare(b[0])
  );
  orderedGroups.forEach((nodes) => {
    nodes.sort((a, b) =>
      (result.get(overview.parentByNode.get(a) ?? '') ?? 0)
        - (result.get(overview.parentByNode.get(b) ?? '') ?? 0)
      || (overview.valueRankByNode.get(a) ?? 0) - (overview.valueRankByNode.get(b) ?? 0)
      || a.localeCompare(b)
    );
    const root = overview.branchRootByNode.get(nodes[0]) ?? nodes[0];
    const base = rootAngles.get(root) ?? 0;
    const sectorLimit = branchRoots.has(root)
      ? ((2 * Math.PI) / activeBranchCount) * 0.72
      : 0.9;
    const spread = Math.min(sectorLimit, 0.9, Math.max(0.12, nodes.length * 0.1));
    nodes.forEach((nodeId, index) => {
      const offset = nodes.length === 1
        ? 0
        : -spread / 2 + (spread * index) / (nodes.length - 1);
      result.set(nodeId, base + offset);
    });
  });
  return result;
}

export function calculateSfiPositions(
  overview: SfiTransactionOverview,
  mode: SfiLayoutMode,
  width: number,
  height: number
): Map<string, SfiPosition> {
  const center = { x: Math.max(width, 720) / 2, y: Math.max(height, 520) / 2 };
  const positions = new Map<string, SfiPosition>();
  if (!overview.sfiInstanceId) return positions;
  positions.set(overview.sfiInstanceId, center);
  const rootAngles = assignRootAngles(overview);
  const angles = angleByNode(overview, rootAngles);
  const ordered = [...overview.visibleNodeIds]
    .filter((nodeId) => nodeId !== overview.sfiInstanceId)
    .sort((a, b) =>
      (overview.levelByNode.get(a) ?? 0) - (overview.levelByNode.get(b) ?? 0)
      || a.localeCompare(b)
    );

  if (mode === 'hierarchy') {
    ordered.forEach((nodeId) => {
      const level = overview.levelByNode.get(nodeId) ?? 1;
      const levelCount = ordered.filter((id) => overview.levelByNode.get(id) === level).length;
      const collisionRadius = (levelCount * 62) / (2 * Math.PI);
      const radius = Math.max(level * HIERARCHY_LEVEL_GAP, collisionRadius);
      const angle = angles.get(nodeId) ?? 0;
      positions.set(nodeId, {
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      });
    });
    return positions;
  }

  ordered.forEach((nodeId) => {
    const parentId = overview.parentByNode.get(nodeId) ?? overview.sfiInstanceId!;
    const parentPosition = positions.get(parentId) ?? center;
    const rank = overview.valueRankByNode.get(nodeId) ?? 1;
    const distance = VALUE_FIRST_STEP + (rank - 1) * VALUE_RANK_GAP;
    const angle = angles.get(nodeId) ?? rootAngles.get(nodeId) ?? 0;
    positions.set(nodeId, {
      x: parentPosition.x + distance * Math.cos(angle),
      y: parentPosition.y + distance * Math.sin(angle),
    });
  });
  return positions;
}
