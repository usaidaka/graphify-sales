import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { useGraphData } from '../context/GraphDataContext';
import { useUI } from '../context/UIContext';
import { buildCytoscapeElements } from '../graph/builder';
import { graphStyles } from '../graph/styles';
import { runLayout } from '../graph/layout';
import './NetworkGraph.css';

export const NetworkGraph: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  // Stores original global positions before Focus Mode rearranges neighborhood
  const savedPositionsRef = useRef<Map<string, { x: number; y: number }> | null>(null);
  const { graph, loading, error } = useGraphData();
  const { dispatch, state } = useUI();
  const [layoutRunning, setLayoutRunning] = useState(false);

  // Initialize or re-populate graph when data changes
  useEffect(() => {
    if (loading || !graph || !containerRef.current) return;

    const elements = buildCytoscapeElements(graph);

    if (!cyRef.current) {
      const cy = cytoscape({
        container: containerRef.current,
        elements,
        style: graphStyles,
        minZoom: 0.1,
        maxZoom: 3,
        wheelSensitivity: 0.2
      });

      // Register event handlers
      cy.on('tap', 'node', (e) => {
        const node = e.target;
        dispatch({ type: 'SET_FOCUS_NODE', payload: node.id() });
      });

      cy.on('tap', 'edge', (e) => {
        const edge = e.target;
        dispatch({ type: 'SELECT_EDGE', payload: edge.id() });
      });

      cy.on('tap', (e) => {
        if (e.target === cy) {
          dispatch({ type: 'CLEAR_FOCUS' });
          dispatch({ type: 'CLEAR_EDGE_SELECTION' });
        }
      });

      cyRef.current = cy;
    } else {
      const cy = cyRef.current;
      cy.batch(() => {
        cy.elements().remove();
        cy.add(elements);
      });
    }

    // Run fcose organic layout with compact spacing if internal-only
    const isCompact = state.scopeFilter === 'internal-only';
    setLayoutRunning(true);
    runLayout(cyRef.current, 'fcose', isCompact).then(() => {
      setLayoutRunning(false);
    });

  }, [graph, loading, state.scopeFilter, dispatch]);


  // Clean up cytoscape instance on unmount
  useEffect(() => {
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, []);

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.5);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.666);
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      const isCompact = state.scopeFilter === 'internal-only';
      cyRef.current.fit(undefined, isCompact ? 30 : 40);
    }
  };

  // Ensure layer manager visibility & focus mode styling (incoming / outgoing arrow colors)
  useEffect(() => {
    if (cyRef.current && !layoutRunning) {
      const cy = cyRef.current;
      cy.batch(() => {
        cy.elements().removeClass('dimmed highlighted outgoing incoming');
        
        // Hide edges whose datasets don't overlap with active layers
        cy.edges().forEach((edge) => {
          const datasets: string[] = edge.data('datasets') || [];
          const hasActiveLayer = datasets.some(ds => state.activeLayers.has(ds as any));
          if (hasActiveLayer) {
            edge.style('display', 'element');
          } else {
            edge.style('display', 'none');
          }
        });

        // Hide nodes that have no visible edges, unless focused
        cy.nodes().forEach(node => {
          const connectedVisibleEdges = node.connectedEdges().filter(e => e.style('display') !== 'none');
          if (connectedVisibleEdges.length === 0 && node.id() !== state.focusedNodeId) {
             node.style('display', 'none');
          } else {
             node.style('display', 'element');
          }
        });

        // Apply Focus Mode logic & Incoming/Outgoing Arrow Color Distinction
        if (state.focusedNodeId) {
          const targetNode = cy.getElementById(state.focusedNodeId);
          if (targetNode.length > 0) {
            const neighborhood = targetNode.neighborhood().add(targetNode);
            const others = cy.elements().not(neighborhood);
            others.addClass('dimmed');
            targetNode.addClass('highlighted');

            // Sort ONLY VISIBLE connected edges by total DPP volume descending to compute rank labels (#1, #2, #3...)
            const activeEdges = targetNode.connectedEdges().filter(e => {
              const datasets: string[] = e.data('datasets') || [];
              return datasets.some(ds => state.activeLayers.has(ds as any));
            });

            const outgoingEdges = activeEdges.filter(e => e.data('source') === state.focusedNodeId);
            const incomingEdges = activeEdges.filter(e => e.data('target') === state.focusedNodeId);

            // cytoscape collection.sort() returns a NEW sorted collection, it is NOT in-place!
            const sortedOutgoing = outgoingEdges.sort((a, b) => (b.data('totalDPP') || 0) - (a.data('totalDPP') || 0));
            const sortedIncoming = incomingEdges.sort((a, b) => (b.data('totalDPP') || 0) - (a.data('totalDPP') || 0));

            sortedOutgoing.forEach((edge, idx) => {
              edge.data('rankLabel', `#${idx + 1}`);
              edge.addClass('outgoing highlighted');
            });

            sortedIncoming.forEach((edge, idx) => {
              edge.data('rankLabel', `#${idx + 1}`);
              edge.addClass('incoming highlighted');
            });
          }
        } else {

          // In global view, classify edge colors by active dataset & edge metadata
          const isFMActive = state.activeLayers.has('FM') || state.activeLayers.has('FM_CRTX');
          const isFKActive = state.activeLayers.has('FK') || state.activeLayers.has('FK_CRTX');

          cy.edges().forEach(edge => {
            const datasets: string[] = edge.data('datasets') || [];
            const hasFK = datasets.some(d => d.startsWith('FK'));
            const hasFM = datasets.some(d => d.startsWith('FM'));

            // If user activated ONLY FM layers (Faktur Masukan = Pembelian)
            if (isFMActive && !isFKActive) {
              edge.addClass('incoming'); // Pembelian -> Oranye Coral
            }
            // If user activated ONLY FK layers (Faktur Keluaran = Penjualan)
            else if (isFKActive && !isFMActive) {
              edge.addClass('outgoing'); // Penjualan -> Hijau Emerald
            }
            // If both FM and FK are active layers:
            else if (hasFM && !hasFK) {
              edge.addClass('incoming'); // Exclusively Pembelian -> Oranye Coral
            } else if (hasFK && !hasFM) {
              edge.addClass('outgoing'); // Exclusively Penjualan -> Hijau Emerald
            } else {
              // Merged edges present in both datasets: default to incoming (Pembelian) for FM-origin
              edge.addClass('incoming');
            }
          });
        }


      });
    }
  }, [state.activeLayers, state.focusedNodeId, layoutRunning]);
  
  // Focus Mode: Re-arrange neighborhood nodes at distances SUBJECTIVE to clicked node,
  // then restore global positions when focus is cleared (ESC / background click).
  // Uses requestAnimationFrame to ensure cy.batch() styles are committed before reading.
  useEffect(() => {
    if (!cyRef.current || layoutRunning) return;
    const cy = cyRef.current;

    if (state.focusedNodeId) {
      const targetNode = cy.getElementById(state.focusedNodeId);
      if (targetNode.length === 0) return;

      // If switching between focused nodes: instantly restore global positions first
      if (savedPositionsRef.current) {
        cy.nodes().forEach(node => {
          const saved = savedPositionsRef.current!.get(node.id());
          if (saved) node.position(saved);
        });
      }

      // Save current global positions (to restore when ESC is pressed)
      const positions = new Map<string, { x: number; y: number }>();
      cy.nodes().forEach(node => {
        positions.set(node.id(), { x: node.position('x'), y: node.position('y') });
      });
      savedPositionsRef.current = positions;

      // Use requestAnimationFrame to ensure cy.batch() from styling effect has committed
      requestAnimationFrame(() => {
        if (!cyRef.current) return;
        const focusedNodeId = state.focusedNodeId!;
        const tNode = cyRef.current.getElementById(focusedNodeId);
        if (tNode.length === 0) return;

        // Filter active edges by dataset (data-based, not stale style check)
        const activeEdges = tNode.connectedEdges().filter(e => {
          const datasets: string[] = e.data('datasets') || [];
          return datasets.some(ds => state.activeLayers.has(ds as any));
        });

        // Build neighbor → accumulated DPP map (purely from focused node's perspective)
        const neighborMap = new Map<string, { nodeEl: any; dpp: number }>();
        activeEdges.forEach(edge => {
          const neighborId = edge.data('source') === focusedNodeId
            ? edge.data('target')
            : edge.data('source');
          const neighborEl = cyRef.current!.getElementById(neighborId);
          if (neighborEl.length === 0) return;

          const dpp = (edge.data('totalDPP') as number) || ((edge.data('invoiceCount') as number || 1) * 10_000_000);
          const entry = neighborMap.get(neighborId);
          if (entry) {
            entry.dpp += dpp;
          } else {
            neighborMap.set(neighborId, { nodeEl: neighborEl, dpp });
          }
        });

        const neighborData = Array.from(neighborMap.values()).sort((a, b) => b.dpp - a.dpp);
        if (neighborData.length === 0) return;

        const sumDPP = neighborData.reduce((sum, item) => sum + item.dpp, 0);
        const maxDPP = neighborData[0].dpp; // #1 company DPP
        const count = neighborData.length;
        const focusedPos = { x: tNode.position('x'), y: tNode.position('y') };
        const angleStep = (2 * Math.PI) / count;

        const minRadius = 130;
        const gapPerRank = 60; // Represents the "2cm" consistent gap you requested
        
        let prevRadius = minRadius;
        let prevDpp = maxDPP;

        neighborData.forEach(({ nodeEl, dpp }, idx) => {
          let finalRadius;

          if (idx === 0) {
            // #1 selalu di jarak terdalam
            finalRadius = minRadius;
          } else {
            if (dpp < prevDpp) {
              // Jika volume lebih kecil (turun rank), tambah jarak fix (2cm)
              finalRadius = prevRadius + gapPerRank;
            } else {
              // Jika seri (volume sama persis), pertahankan jarak yang sama
              finalRadius = prevRadius;
            }
          }

          prevRadius = finalRadius;
          prevDpp = dpp;

          const angle = idx * angleStep - Math.PI / 2; // start from top (12 o'clock)
          nodeEl.animate({
            position: {
              x: focusedPos.x + finalRadius * Math.cos(angle),
              y: focusedPos.y + finalRadius * Math.sin(angle),
            },
            duration: 480
          });
        });


        // Zoom-fit after animation completes
        setTimeout(() => {
          if (!cyRef.current) return;
          const updatedTarget = cyRef.current.getElementById(focusedNodeId);
          const neighborhood = updatedTarget.neighborhood('node').add(updatedTarget);
          cyRef.current.animate({ fit: { eles: neighborhood, padding: 60 }, duration: 350 });
        }, 540);
      });

    } else {
      // Focus cleared: animate all nodes back to saved global positions
      if (savedPositionsRef.current) {
        const positions = savedPositionsRef.current;
        cy.nodes().forEach(node => {
          const savedPos = positions.get(node.id());
          if (savedPos) node.animate({ position: savedPos, duration: 450 });
        });
        savedPositionsRef.current = null;

        // After restoring, zoom-fit all visible elements
        setTimeout(() => {
          if (!cyRef.current) return;
          const visibleEls = cyRef.current.elements().filter(e => {
            const datasets: string[] = e.data('datasets') || [];
            return datasets.some(ds => state.activeLayers.has(ds as any));
          });
          if (visibleEls.length > 0) {
            cyRef.current.animate({ fit: { eles: visibleEls, padding: 40 }, duration: 350 });
          }
        }, 500);
      }
    }
  }, [state.focusedNodeId, state.activeLayers, layoutRunning]);




  if (error) {
    return (
      <div className="network-graph-container error">
        <h2>Error Loading Graph</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="network-graph-container">
      {(loading || layoutRunning) && (
        <div className="loading-overlay glass-panel">
          <div className="spinner"></div>
          <p>{loading ? 'Loading data...' : 'Computing layout...'}</p>
        </div>
      )}
      <div ref={containerRef} className="cy-canvas" />
      <div className="graph-controls glass-panel">
        <button onClick={handleZoomIn} title="Zoom In">+</button>
        <button onClick={handleZoomOut} title="Zoom Out">-</button>
        <button onClick={handleFit} title="Fit to Screen">⛶</button>
      </div>
    </div>
  );
};


