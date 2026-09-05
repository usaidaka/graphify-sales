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
      // Orthogonal routing makes the dense overview easier to trace and avoids
      // the visual impression of arbitrary curved/crooked connections.
      'curve-style': 'taxi',
      'taxi-direction': 'rightward',
      'taxi-turn': '50%',
      'taxi-turn-min-distance': 12,
      'opacity': 0.7,
      'arrow-scale': 0.9
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
      'curve-style': 'straight',
      'opacity': 1,
      'width': 2,
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
      'curve-style': 'straight',
      'opacity': 1,
      'width': 2,
      'z-index': 9
    }
  },
  {
    selector: 'node.sfi-overview-node',
    style: {
      'width': 28,
      'height': 28,
      'border-width': 2
    }
  },
  {
    selector: 'node.sfi-center',
    style: {
      'width': 44,
      'height': 44,
      'shape': 'diamond',
      'background-color': '#2563eb',
      'border-color': '#93c5fd',
      'border-width': 4,
      'font-size': '12px',
      'font-weight': 'bold',
      'z-index': 20
    }
  },
  {
    selector: 'node.principal-hub',
    style: {
      'border-color': '#22d3ee',
      'border-width': 4,
      'border-style': 'double'
    }
  },
  {
    selector: 'node.replacement-hub',
    style: {
      'border-color': '#facc15',
      'border-width': 4,
      'border-style': 'dashed'
    }
  },
  {
    selector: 'edge.sfi-edge',
    style: {
      'width': 1.5,
      'curve-style': 'straight',
      'opacity': 0.72
    }
  },
  {
    selector: 'edge.sfi-edge.value-ranked',
    style: {
      'label': 'data(rankLabel)',
      'font-size': '9px',
      'font-weight': 'bold',
      'color': '#e2e8f0',
      'text-background-color': '#0f172a',
      'text-background-opacity': 0.88,
      'text-background-padding': '3px',
      'text-background-shape': 'roundrectangle',
      'text-rotation': 'autorotate'
    }
  },
  {
    selector: 'edge.sfi-edge.highlighted',
    style: {
      'width': 2,
      'opacity': 1,
      'z-index': 10
    }
  },
  // Keep focus dimming last so role-specific SFI styles cannot restore the
  // opacity of unrelated lines or their arrow heads.
  {
    selector: 'node.dimmed',
    style: {
      'opacity': 0.1
    }
  },
  {
    selector: 'edge.dimmed',
    style: {
      'opacity': 0.06
    }
  }
];



