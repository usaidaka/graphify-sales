import cytoscape from 'cytoscape';
// @ts-ignore
import fcose from 'cytoscape-fcose';
// @ts-ignore
import dagre from 'cytoscape-dagre';

// Register plugins
cytoscape.use(fcose);
cytoscape.use(dagre);

export function getFcoseOptions(isCompact: boolean = false) {
  return {
    name: 'fcose',
    quality: 'proof',
    randomize: true,
    animate: false,
    fit: true,
    padding: isCompact ? 28 : 48,
    nodeDimensionsIncludeLabels: true,
    uniformNodeDimensions: false,
    packComponents: true,
    nodeRepulsion: (node: any) => {
      const degree = node.data('degree') || 1;
      // Large hub nodes need substantially more space than leaf nodes.
      return isCompact ? 26000 + degree * 1100 : 30000 + degree * 1200;
    },
    idealEdgeLength: (edge: any) => {
      // Use relative proximityScore (pre-computed in builder.ts):
      // 1.0 = this edge is the highest-volume partner for both endpoints (draw CLOSEST)
      // 0.0 = this edge is the lowest-volume partner relative to others (draw FARTHEST)
      const proximityScore: number = edge.data('proximityScore') ?? 0.5;

      const maxDist = isCompact ? 140 : 210;
      const minDist = isCompact ? 62 : 64;

      // Higher proximityScore => shorter distance (closer together)
      const distance = maxDist - proximityScore * (maxDist - minDist);
      return Math.round(distance);
    },
    edgeElasticity: 0.35,
    nestingFactor: 0.1,
    gravity: isCompact ? 0.12 : 0.1,
    gravityRange: isCompact ? 3.5 : 4.5,
    numIter: 3500,
    initialEnergyOnIncremental: 0.2
  };
}




export function getDagreOptions(isCompact: boolean = false) {
  return {
    name: 'dagre',
    rankDir: 'LR',
    align: 'DL',
    ranker: 'network-simplex',
    // Keep enough room for the rendered node and its label. "Compact" means
    // shorter ranks, not allowing internal-company nodes to overlap.
    nodeSep: isCompact ? 48 : 64,
    edgeSep: isCompact ? 24 : 32,
    rankSep: isCompact ? 88 : 112,
    nodeDimensionsIncludeLabels: true,
    animate: false,
    fit: true,
    padding: isCompact ? 30 : 40
  };
}

export const DAGRE_LAYOUT_OPTIONS = getDagreOptions(false);
export const FCOSE_LAYOUT_OPTIONS = getFcoseOptions(false);

export async function runLayout(
  cy: cytoscape.Core, 
  layoutName: 'fcose' | 'dagre' | 'grid' = 'fcose',
  isCompact: boolean = false
): Promise<void> {
  return new Promise((resolve) => {
    const visibleNodeCount = Math.max(1, cy.nodes(':visible').length);
    const aspectRatio = Math.max(0.5, cy.width() / Math.max(1, cy.height()));
    const gridColumns = Math.max(1, Math.ceil(Math.sqrt(visibleNodeCount * aspectRatio)));
    const options = layoutName === 'fcose'
      ? getFcoseOptions(isCompact)
      : layoutName === 'dagre'
        ? getDagreOptions(isCompact)
        : {
            name: 'grid',
            fit: true,
            padding: 36,
            avoidOverlap: true,
            avoidOverlapPadding: 20,
            condense: false,
            cols: gridColumns,
            animate: false,
          };
    const layout = cy.layout(options as any);
    layout.one('layoutstop', () => {
      resolve();
    });
    layout.run();
  });
}




