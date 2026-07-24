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
    padding: isCompact ? 40 : 60,
    nodeDimensionsIncludeLabels: true,
    uniformNodeDimensions: false,
    packComponents: true,
    nodeRepulsion: (node: any) => {
      const degree = node.data('degree') || 1;
      return isCompact ? 22000 + degree * 1000 : 28000 + degree * 1200;
    },
    idealEdgeLength: (edge: any) => {
      // Use relative proximityScore (pre-computed in builder.ts):
      // 1.0 = this edge is the highest-volume partner for both endpoints (draw CLOSEST)
      // 0.0 = this edge is the lowest-volume partner relative to others (draw FARTHEST)
      const proximityScore: number = edge.data('proximityScore') ?? 0.5;

      const maxDist = isCompact ? 200 : 280;
      const minDist = isCompact ? 50 : 70;

      // Higher proximityScore => shorter distance (closer together)
      const distance = maxDist - proximityScore * (maxDist - minDist);
      return Math.round(distance);
    },
    edgeElasticity: 0.35,
    nestingFactor: 0.1,
    gravity: 0.08,
    gravityRange: 4.5,
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
    nodeSep: isCompact ? 20 : 40,
    edgeSep: isCompact ? 15 : 25,
    rankSep: isCompact ? 70 : 130,
    animate: false,
    fit: true,
    padding: isCompact ? 30 : 40
  };
}

export const DAGRE_LAYOUT_OPTIONS = getDagreOptions(false);
export const FCOSE_LAYOUT_OPTIONS = getFcoseOptions(false);

export async function runLayout(
  cy: cytoscape.Core, 
  layoutName: 'fcose' | 'dagre' = 'fcose',
  isCompact: boolean = false
): Promise<void> {
  return new Promise((resolve) => {
    const options = layoutName === 'fcose' ? getFcoseOptions(isCompact) : getDagreOptions(isCompact);
    const layout = cy.layout(options as any);
    layout.one('layoutstop', () => {
      resolve();
    });
    layout.run();
  });
}




