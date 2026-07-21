import cytoscape from 'cytoscape';
import { NormalizedGraph, NodeData, EdgeData } from './types';

function calculateEdgeWidth(invoiceCount: number): number {
  // Simple linear scaling for edge weight: min 1px, max 8px
  const minWidth = 1;
  const maxWidth = 8;
  
  // Assuming a max invoice count of around 100 for a single edge for scaling
  // In reality, we might want to scale dynamically based on the graph max,
  // but a simple logarithmic or capped linear scale works best.
  
  const width = minWidth + Math.log10(invoiceCount) * 2;
  return Math.max(minWidth, Math.min(maxWidth, width));
}

export function buildCytoscapeElements(graph: NormalizedGraph): cytoscape.ElementDefinition[] {
  const elements: cytoscape.ElementDefinition[] = [];

  // Add nodes
  graph.nodes.forEach((node: NodeData) => {
    elements.push({
      group: 'nodes',
      data: {
        id: node.id,
        companyName: node.companyName,
        nodeType: node.nodeType
      }
    });
  });

  // Add edges
  graph.edges.forEach((edge: EdgeData) => {
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
        periods: edge.periods,
        width: calculateEdgeWidth(edge.invoiceCount)
      }
    });
  });

  return elements;
}
