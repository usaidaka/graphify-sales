import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { useGraphData } from '../context/GraphDataContext';
import { useUI } from '../context/UIContext';
import { buildCytoscapeElements } from '../graph/builder';
import { graphStyles } from '../graph/styles';
import { runLayout } from '../graph/layout';
import {
  aggregateNeighborMetrics,
  isFocusSortVisible,
  rankNeighborRadii,
} from '../graph/focusRanking';
import './NetworkGraph.css';

export const NetworkGraph: React.FC = () => {
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  // Stores original global positions before Focus Mode rearranges neighborhood
  const savedPositionsRef = useRef<Map<string, { x: number; y: number }> | null>(null);
  const { graph, loading, error } = useGraphData();
  const { dispatch, state } = useUI();
  const [layoutRunning, setLayoutRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreen = document.fullscreenElement === graphContainerRef.current;
      setIsFullscreen(fullscreen);

      requestAnimationFrame(() => {
        if (!cyRef.current) return;
        cyRef.current.resize();
        cyRef.current.fit(cyRef.current.elements(':visible'), 48);
      });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const setZoomAroundViewportCenter = (factor: number) => {
    const cy = cyRef.current;
    if (!cy) return;

    const nextZoom = Math.min(3, Math.max(0.1, cy.zoom() * factor));
    cy.stop();
    cy.zoom({
      level: nextZoom,
      renderedPosition: {
        x: cy.width() / 2,
        y: cy.height() / 2,
      },
    });
  };

  const handleZoomIn = () => {
    setZoomAroundViewportCenter(1.25);
  };

  const handleZoomOut = () => {
    setZoomAroundViewportCenter(0.8);
  };

  const handleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (graphContainerRef.current) {
        await graphContainerRef.current.requestFullscreen();
      }
    } catch (fullscreenError) {
      console.error('Unable to toggle graph fullscreen:', fullscreenError);
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

        // Aggregate the selected metric per neighbor from the focused node's perspective.
        const metricEdges: Array<{
          source: string;
          target: string;
          totalDPP: number;
          invoiceCount: number;
        }> = [];
        activeEdges.forEach(edge => {
          metricEdges.push({
            source: edge.data('source'),
            target: edge.data('target'),
            totalDPP: edge.data('totalDPP') ?? 0,
            invoiceCount: edge.data('invoiceCount') ?? 0,
          });
        });

        const totals = aggregateNeighborMetrics(focusedNodeId, metricEdges, state.focusSortMetric);
        const neighborData = rankNeighborRadii(totals);
        if (neighborData.length === 0) return;

        const count = neighborData.length;
        const focusedPos = { x: tNode.position('x'), y: tNode.position('y') };
        const angleStep = (2 * Math.PI) / count;

        neighborData.forEach(({ neighborId, radius }, idx) => {
          const nodeEl = cyRef.current!.getElementById(neighborId);
          if (nodeEl.length === 0) return;
          nodeEl.stop();
          const angle = idx * angleStep - Math.PI / 2; // start from top (12 o'clock)
          nodeEl.animate({
            position: {
              x: focusedPos.x + radius * Math.cos(angle),
              y: focusedPos.y + radius * Math.sin(angle),
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
  }, [state.focusedNodeId, state.activeLayers, state.focusSortMetric, layoutRunning]);




  if (error) {
    return (
      <div className="network-graph-container error">
        <h2>Error Loading Graph</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={graphContainerRef}
      className={`network-graph-container ${isFullscreen ? 'is-fullscreen' : ''}`}
    >
      {(loading || layoutRunning) && (
        <div className="loading-overlay glass-panel">
          <div className="spinner"></div>
          <p>{loading ? 'Loading data...' : 'Computing layout...'}</p>
        </div>
      )}
      {!loading && !layoutRunning && graph?.nodes.length === 0 && (
        <div className="graph-empty-state glass-panel">
          <strong>Tidak ada transaksi</strong>
          <span>Coba pilih tahun, bulan, atau filter lain.</span>
        </div>
      )}
      <div ref={containerRef} className="cy-canvas" />
      {isFocusSortVisible(state.focusedNodeId) && (
        <label className="focus-sort-control glass-panel">
          <span>Urutkan berdasarkan</span>
          <select
            aria-label="Urutkan partner fokus berdasarkan"
            value={state.focusSortMetric}
            onChange={(event) => dispatch({
              type: 'SET_FOCUS_SORT_METRIC',
              payload: event.target.value as typeof state.focusSortMetric,
            })}
          >
            <option value="total-omzet">Total Omzet</option>
            <option value="invoice-count">Jumlah Faktur</option>
          </select>
        </label>
      )}
      <div className="graph-controls glass-panel">
        <button type="button" onClick={handleZoomIn} title="Zoom In" aria-label="Zoom In">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button type="button" onClick={handleZoomOut} title="Zoom Out" aria-label="Zoom Out">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleFullscreen}
          title={isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen'}
          aria-label={isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen'}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {isFullscreen ? (
              <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
            ) : (
              <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
            )}
          </svg>
        </button>
      </div>
    </div>
  );
};


