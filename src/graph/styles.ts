import cytoscape from 'cytoscape';

export const graphStyles: any = [
  {
    selector: 'node',
    style: {
      'label': 'data(companyName)',
      'font-size': '11px',
      'font-family': 'Inter, sans-serif',
      'text-valign': 'center',
      'text-halign': 'center',
      'color': '#ffffff',
      'text-outline-color': '#0f1115',
      'text-outline-width': 2.5,
      'text-max-width': '120px',
      'text-wrap': 'ellipsis',
      'min-zoomed-font-size': 8,
      'width': 'data(size)',
      'height': 'data(size)',
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
      'shape': 'ellipse'
    }
  },
  {
    selector: 'node[nodeType = "external"]',
    style: {
      'background-color': '#475569',
      'border-color': '#334155',
      'shape': 'ellipse'
    }
  },
  {
    selector: 'node[?isImport]',
    style: {
      'border-color': '#38bdf8',
      'border-width': 3.5
    }
  },
  {
    selector: 'node[nodeType = "distributor"]',
    style: {
      'background-color': '#f59e0b',
      'border-color': '#d97706',
      'shape': 'diamond'
    }
  },
  {
    selector: 'node[nodeType = "special-external"]',
    style: {
      'background-color': '#8b5cf6',
      'border-color': '#7c3aed',
      'shape': 'ellipse'
    }
  },
  {
    selector: 'node[nodeType = "wapu"]',
    style: {
      'background-color': '#ec4899',
      'border-color': '#be185d',
      'border-width': 3,
      'shape': 'ellipse'
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
      'opacity': 0.55,
      'arrow-scale': 1.1
    }
  },
  {
    selector: 'edge.outgoing',
    style: {
      'line-color': '#10b981', // Emerald Green for sales out
      'target-arrow-color': '#10b981'
    }
  },
  {
    selector: 'edge.incoming',
    style: {
      'line-color': '#f97316', // Coral Orange for purchases in
      'target-arrow-color': '#f97316'
    }
  },
  {
    selector: '.dimmed',
    style: {
      'opacity': 0.1
    }
  },
  {
    selector: '.highlighted',
    style: {
      'opacity': 1,
      'border-width': 4.5,
      'border-color': '#3b82f6',
      'z-index': 10
    }
  },
  {
    selector: 'edge.highlighted.outgoing',
    style: {
      'label': 'data(rankLabel)',
      'font-size': '11px',
      'font-weight': 'bold',
      'color': '#ffffff',
      'text-background-color': '#065f46',
      'text-background-opacity': 0.9,
      'text-background-padding': '4px',
      'text-background-shape': 'roundrectangle',
      'line-color': '#059669',
      'target-arrow-color': '#059669',
      'opacity': 1,
      'width': 4,
      'z-index': 9
    }
  },
  {
    selector: 'edge.highlighted.incoming',
    style: {
      'label': 'data(rankLabel)',
      'font-size': '11px',
      'font-weight': 'bold',
      'color': '#ffffff',
      'text-background-color': '#9a3412',
      'text-background-opacity': 0.9,
      'text-background-padding': '4px',
      'text-background-shape': 'roundrectangle',
      'line-color': '#ea580c',
      'target-arrow-color': '#ea580c',
      'opacity': 1,
      'width': 4,
      'z-index': 9
    }
  }
];



