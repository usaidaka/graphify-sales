import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { useGraphData } from '../context/GraphDataContext';
import { useUI } from '../context/UIContext';
import { buildCytoscapeElements } from '../graph/builder';
import { graphStyles } from '../graph/styles';
import { runLayout, FCOSE_LAYOUT_OPTIONS } from '../graph/layout';
import './NetworkGraph.css';

export const NetworkGraph: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const { graph, loading, error } = useGraphData();
  const { dispatch, state } = useUI();
  const [layoutRunning, setLayoutRunning] = useState(false);

  useEffect(() => {
    if (loading || !graph || !containerRef.current) return;

    if (!cyRef.current) {
      const cy = cytoscape({
        container: containerRef.current,
        elements: buildCytoscapeElements(graph),
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
      
      setLayoutRunning(true);
      runLayout(cy).then(() => {
        setLayoutRunning(false);
      });
    }

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [graph, loading, dispatch]);

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
      cyRef.current.fit(undefined, 30);
    }
  };

  // Ensure layer manager visibility is updated efficiently
  useEffect(() => {
    if (cyRef.current && !layoutRunning) {
      const cy = cyRef.current;
      cy.batch(() => {
        cy.elements().removeClass('dimmed highlighted');
        
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

        // Hide nodes that have no visible edges, unless they are focused
        cy.nodes().forEach(node => {
          const connectedVisibleEdges = node.connectedEdges().filter(e => e.style('display') !== 'none');
          if (connectedVisibleEdges.length === 0) {
             node.style('display', 'none');
          } else {
             node.style('display', 'element');
          }
        });

        // Apply Focus Mode logic
        if (state.focusedNodeId) {
          const targetNode = cy.getElementById(state.focusedNodeId);
          if (targetNode.length > 0) {
            const neighborhood = targetNode.neighborhood().add(targetNode);
            const others = cy.elements().not(neighborhood);
            others.addClass('dimmed');
            targetNode.addClass('highlighted');
            targetNode.connectedEdges().addClass('highlighted');
          }
        }
      });
    }
  }, [state.activeLayers, state.focusedNodeId, layoutRunning]);
  
  // Animate focus mode
  useEffect(() => {
    if (cyRef.current && state.focusedNodeId && !layoutRunning) {
      const cy = cyRef.current;
      const targetNode = cy.getElementById(state.focusedNodeId);
      if (targetNode.length > 0) {
        const neighborhood = targetNode.neighborhood().add(targetNode);
        cy.animate({
          fit: {
            eles: neighborhood,
            padding: 50
          },
          duration: 400
        });
      }
    } else if (cyRef.current && !state.focusedNodeId && !layoutRunning) {
       // cyRef.current.fit(undefined, 30); // Disabled auto-fit on clear focus so user doesn't lose context
    }
  }, [state.focusedNodeId, layoutRunning]);


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
