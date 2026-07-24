import cytoscape from 'cytoscape';
import { NormalizedGraph, NodeData, EdgeData } from './types';

function calculateEdgeWidth(totalDPP: number, invoiceCount: number): number {
  const minWidth = 1.5;
  const maxWidth = 7;

  if (totalDPP > 0) {
    const width = minWidth + Math.log10(totalDPP / 1_000_000 + 1) * 1.2;
    return Math.max(minWidth, Math.min(maxWidth, width));
  }
  
  const width = minWidth + Math.log10(invoiceCount + 1) * 1.5;
  return Math.max(minWidth, Math.min(maxWidth, width));
}

export function buildCytoscapeElements(graph: NormalizedGraph): cytoscape.ElementDefinition[] {
  const elements: cytoscape.ElementDefinition[] = [];

  // Count degree for each node
  const nodeDegreeMap = new Map<string, number>();
  graph.edges.forEach(edge => {
    nodeDegreeMap.set(edge.source, (nodeDegreeMap.get(edge.source) || 0) + 1);
    nodeDegreeMap.set(edge.target, (nodeDegreeMap.get(edge.target) || 0) + 1);
  });

  // For each node, collect all connected edge DPPs to compute relative ranking
  // nodeEdgeDPPs: nodeId -> [ { edgeId, dpp } ]
  const nodeEdgeDPPs = new Map<string, { edgeId: string; dpp: number }[]>();
  graph.edges.forEach(edge => {
    const vol = edge.totalDPP > 0 ? edge.totalDPP : (edge.invoiceCount * 10_000_000);
    if (!nodeEdgeDPPs.has(edge.source)) nodeEdgeDPPs.set(edge.source, []);
    if (!nodeEdgeDPPs.has(edge.target)) nodeEdgeDPPs.set(edge.target, []);
    nodeEdgeDPPs.get(edge.source)!.push({ edgeId: edge.id, dpp: vol });
    nodeEdgeDPPs.get(edge.target)!.push({ edgeId: edge.id, dpp: vol });
  });

  // For each node, compute a ratio [0..1] per edge: ratio = dpp / maxDpp_within_that_node
  // ratio=1.0 means this is the highest-volume partner for this node (closest)
  // ratio close to 0 means lowest-volume partner (farthest)
  const edgeProximityFromNode = new Map<string, number>(); // key: `${nodeId}::${edgeId}`

  nodeEdgeDPPs.forEach((edgeList, nodeId) => {
    const maxDpp = Math.max(...edgeList.map(e => e.dpp));
    edgeList.forEach(({ edgeId, dpp }) => {
      const ratio = maxDpp > 0 ? dpp / maxDpp : 1;
      edgeProximityFromNode.set(`${nodeId}::${edgeId}`, ratio);
    });
  });

  // Compute final proximityScore per edge = MAX of ratio from source and target perspective.
  // Using max (not average) ensures: if EITHER endpoint sees this as their top partner,
  // they will be drawn physically close. This way the #1 rank always maps to the nearest node.
  const edgeProximityScore = new Map<string, number>();
  graph.edges.forEach(edge => {
    const ratioFromSource = edgeProximityFromNode.get(`${edge.source}::${edge.id}`) ?? 1;
    const ratioFromTarget = edgeProximityFromNode.get(`${edge.target}::${edge.id}`) ?? 1;
    // max: if the focused node treats this as #1, draw it closest regardless of the other side
    edgeProximityScore.set(edge.id, Math.max(ratioFromSource, ratioFromTarget));
  });


  // Add nodes with dynamic size based on degree/hub status
  graph.nodes.forEach((node: NodeData) => {
    const degree = nodeDegreeMap.get(node.id) || 1;
    const baseSize = node.nodeType === 'internal' ? 32 : node.nodeType === 'special-external' ? 36 : 24;
    const dynamicSize = Math.max(baseSize, Math.min(60, baseSize + Math.log2(degree + 1) * 6));

    elements.push({
      group: 'nodes',
      data: {
        id: node.id,
        companyName: node.companyName,
        fullName: node.fullName || node.companyName,
        nodeType: node.nodeType,
        isImport: !!node.isImport,
        degree,
        size: Math.round(dynamicSize)
      }
    });
  });

  // Add edges with pre-computed proximityScore
  graph.edges.forEach((edge: EdgeData) => {
    const proximityScore = edgeProximityScore.get(edge.id) ?? 0.5;
    elements.push({
      group: 'edges',
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        invoiceCount: edge.invoiceCount,
        totalDPP: edge.totalDPP,
        totalPPN: edge.totalPPN,
        datasets: edge.datasets,
        approvalStatus: edge.approvalStatus,
        statuses: edge.statuses || [],
        periods: edge.periods,
        isCancelledOrReplaced: !!edge.isCancelledOrReplaced,
        width: calculateEdgeWidth(edge.totalDPP, edge.invoiceCount),
        // proximityScore: 1.0 = major partner (closest), 0.0 = minor partner (farthest)
        proximityScore
      }
    });
  });

  return elements;
}



