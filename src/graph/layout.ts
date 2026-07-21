import cytoscape from 'cytoscape';
// @ts-ignore
import fcose from 'cytoscape-fcose';

// Register the fcose plugin
cytoscape.use(fcose);

export const FCOSE_LAYOUT_OPTIONS = {
  name: 'fcose',
  quality: 'default',
  randomize: true,
  animate: false,
  fit: true,
  padding: 30,
  nodeDimensionsIncludeLabels: true,
  uniformNodeDimensions: false,
  packComponents: true,
  nodeRepulsion: 4500,
  idealEdgeLength: 100,
  edgeElasticity: 0.45,
  nestingFactor: 0.1,
  gravity: 0.25,
  numIter: 2500,
  initialEnergyOnIncremental: 0.3
};

export async function runLayout(cy: cytoscape.Core): Promise<void> {
  return new Promise((resolve) => {
    const layout = cy.layout(FCOSE_LAYOUT_OPTIONS as any);
    layout.one('layoutstop', () => {
      resolve();
    });
    layout.run();
  });
}
