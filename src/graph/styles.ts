import cytoscape from 'cytoscape';

export const graphStyles: any = [
  {
    selector: 'node',
    style: {
      'label': 'data(companyName)',
      'font-size': '12px',
      'font-family': 'Inter, sans-serif',
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 4,
      'color': '#f0f0f0',
      'text-outline-color': '#0f1115',
      'text-outline-width': 2,
      'min-zoomed-font-size': 8,
      'width': 24,
      'height': 24,
      'border-width': 2,
      'border-color': '#ffffff',
      'background-color': '#64748b' // default external
    }
  },
  {
    selector: 'node[nodeType = "internal"]',
    style: {
      'background-color': '#10b981',
      'border-color': '#059669',
      'shape': 'round-rectangle',
      'width': 30,
      'height': 30
    }
  },
  {
    selector: 'node[nodeType = "external"]',
    style: {
      'background-color': '#64748b',
      'shape': 'ellipse'
    }
  },
  {
    selector: 'node[nodeType = "distributor"]',
    style: {
      'background-color': '#f59e0b',
      'border-color': '#d97706',
      'shape': 'diamond',
      'width': 35,
      'height': 35
    }
  },
  {
    selector: 'node[nodeType = "special-external"]',
    style: {
      'background-color': '#8b5cf6',
      'border-color': '#7c3aed',
      'shape': 'star',
      'width': 35,
      'height': 35
    }
  },
  {
    selector: 'edge',
    style: {
      'width': 'data(width)',
      'line-color': '#475569',
      'target-arrow-color': '#475569',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'opacity': 0.6,
      'arrow-scale': 1.2
    }
  },
  {
    selector: '.dimmed',
    style: {
      'opacity': 0.15
    }
  },
  {
    selector: '.highlighted',
    style: {
      'opacity': 1,
      'border-width': 4,
      'border-color': '#3b82f6',
      'z-index': 10
    }
  },
  {
    selector: 'edge.highlighted',
    style: {
      'line-color': '#3b82f6',
      'target-arrow-color': '#3b82f6',
      'z-index': 9
    }
  }
];
