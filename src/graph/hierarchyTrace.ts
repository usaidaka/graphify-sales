import type { SfiTransactionOverview } from './sfiTransaction';

export interface HierarchyTrace {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
}

type TraceOverview = Pick<
  SfiTransactionOverview,
  'sfiInstanceId' | 'visibleNodeIds' | 'parentByNode' | 'parentEdgeByNode'
>;

/**
 * Select the hierarchy route from SFI to the chosen occurrence and, from that
 * point onward, only descendant branches that actually terminate at a WAPU.
 * Cross-links are intentionally excluded so a trace remains readable.
 */
export function projectHierarchyTrace(
  overview: TraceOverview,
  selectedNodeId: string,
  isWapu: (nodeId: string) => boolean
): HierarchyTrace {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  if (!overview.visibleNodeIds.has(selectedNodeId)) return { nodeIds, edgeIds };

  const ancestorGuard = new Set<string>();
  let currentId: string | undefined = selectedNodeId;
  while (currentId && !ancestorGuard.has(currentId)) {
    ancestorGuard.add(currentId);
    nodeIds.add(currentId);
    if (currentId === overview.sfiInstanceId) break;
    const parentId = overview.parentByNode.get(currentId);
    const parentEdgeId = overview.parentEdgeByNode.get(currentId);
    if (!parentId) break;
    if (parentEdgeId) edgeIds.add(parentEdgeId);
    currentId = parentId;
  }

  const childrenByParent = new Map<string, string[]>();
  overview.parentByNode.forEach((parentId, nodeId) => {
    const children = childrenByParent.get(parentId) ?? [];
    children.push(nodeId);
    childrenByParent.set(parentId, children);
  });

  const descendantGuard = new Set<string>();
  const collectWapuRoutes = (nodeId: string): boolean => {
    if (descendantGuard.has(nodeId)) return false;
    descendantGuard.add(nodeId);
    if (isWapu(nodeId)) {
      nodeIds.add(nodeId);
      return true;
    }

    let reachesWapu = false;
    (childrenByParent.get(nodeId) ?? []).forEach((childId) => {
      if (!collectWapuRoutes(childId)) return;
      reachesWapu = true;
      nodeIds.add(childId);
      const edgeId = overview.parentEdgeByNode.get(childId);
      if (edgeId) edgeIds.add(edgeId);
    });
    if (reachesWapu) nodeIds.add(nodeId);
    return reachesWapu;
  };

  collectWapuRoutes(selectedNodeId);
  return { nodeIds, edgeIds };
}
