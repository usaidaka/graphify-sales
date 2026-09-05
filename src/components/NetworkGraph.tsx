import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { useGraphData } from '../context/GraphDataContext';
import { useUI } from '../context/UIContext';
import { buildSfiCytoscapeElements } from '../graph/builder';
import {
  calculateSfiPositions,
  createSfiTransactionOverview,
  type SfiLayoutMode,
  type SfiTransactionOverview,
} from '../graph/sfiTransaction';
import { graphStyles } from '../graph/styles';
import './NetworkGraph.css';

function applySfiLayout(
  cy: cytoscape.Core,
  overview: SfiTransactionOverview,
  mode: SfiLayoutMode
): cytoscape.CollectionReturnValue {
  const positions = calculateSfiPositions(overview, mode, cy.width(), cy.height());

  cy.batch(() => {
    cy.nodes().removeClass(
      'sfi-overview-node sfi-center principal-hub replacement-hub highlighted dimmed'
    );
    cy.edges().removeClass(
      'sfi-edge value-ranked outgoing incoming highlighted dimmed'
    );

    cy.nodes().forEach((node) => {
      const visible = overview.visibleNodeIds.has(node.id());
      node.style('display', visible ? 'element' : 'none');
      if (!visible) return;
      node.addClass('sfi-overview-node');
      const position = positions.get(node.id());
      if (position) node.position(position);
      if (node.id() === overview.sfiInstanceId) node.addClass('sfi-center');
      if (overview.officialPrincipalIds.has(node.id())) node.addClass('principal-hub');
      if (overview.replacementHubIds.has(node.id())) node.addClass('replacement-hub');
    });

    cy.edges().forEach((edge) => {
      const visible = overview.visibleEdgeIds.has(edge.id());
      edge.style('display', visible ? 'element' : 'none');
      edge.removeData('rankLabel');
      if (!visible) return;
      edge.addClass(`sfi-edge ${overview.view === 'sales' ? 'outgoing' : 'incoming'}`);
    });

    if (mode === 'value') {
      overview.parentEdgeByNode.forEach((edgeId, nodeId) => {
        const edge = cy.getElementById(edgeId);
        if (edge.length === 0) return;
        edge.data('rankLabel', `#${overview.valueRankByNode.get(nodeId) ?? 1}`);
        edge.addClass('value-ranked');
      });
    }
  });

  return cy.elements().filter((element) =>
    element.isNode()
      ? overview.visibleNodeIds.has(element.id())
      : overview.visibleEdgeIds.has(element.id())
  );
}

interface OverviewSummary {
  companies: number;
  relationships: number;
  principals: number;
  replacements: number;
  hasSfi: boolean;
}

const EMPTY_SUMMARY: OverviewSummary = {
  companies: 0,
  relationships: 0,
  principals: 0,
  replacements: 0,
  hasSfi: false,
};

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

function renderSectorGuide(
  cy: cytoscape.Core,
  overview: SfiTransactionOverview,
  overlay: SVGSVGElement
) {
  overlay.replaceChildren();
  const activeSlots = overview.branchSlots.filter(
    (slot): slot is typeof slot & { hubInstanceId: string } => Boolean(slot.hubInstanceId)
  ).sort((a, b) => a.angle - b.angle);
  if (!overview.sfiInstanceId || activeSlots.length === 0) return;

  const centerNode = cy.getElementById(overview.sfiInstanceId);
  if (centerNode.length === 0) return;
  const center = centerNode.renderedPosition();
  const visibleNodes = cy.nodes().filter((node) => overview.visibleNodeIds.has(node.id()));
  let outerRadius = 0;
  visibleNodes.forEach((node) => {
    const position = node.renderedPosition();
    outerRadius = Math.max(
      outerRadius,
      Math.hypot(position.x - center.x, position.y - center.y)
    );
  });
  outerRadius += Math.max(28, 20 * cy.zoom());
  const innerRadius = Math.max(28, centerNode.renderedOuterWidth() / 2 + 7);

  overlay.setAttribute('viewBox', `0 0 ${cy.width()} ${cy.height()}`);

  const outerCircle = document.createElementNS(SVG_NAMESPACE, 'circle');
  outerCircle.setAttribute('class', 'sfi-sector-outer');
  outerCircle.setAttribute('cx', String(center.x));
  outerCircle.setAttribute('cy', String(center.y));
  outerCircle.setAttribute('r', String(outerRadius));
  overlay.append(outerCircle);

  const innerCircle = document.createElementNS(SVG_NAMESPACE, 'circle');
  innerCircle.setAttribute('class', 'sfi-sector-inner');
  innerCircle.setAttribute('cx', String(center.x));
  innerCircle.setAttribute('cy', String(center.y));
  innerCircle.setAttribute('r', String(innerRadius));
  overlay.append(innerCircle);

  const sectorSize = (2 * Math.PI) / activeSlots.length;
  activeSlots.forEach((slot, index) => {
    const boundaryAngle = -Math.PI + sectorSize * index;
    const divider = document.createElementNS(SVG_NAMESPACE, 'line');
    divider.setAttribute('class', 'sfi-sector-divider');
    divider.setAttribute('x1', String(center.x + innerRadius * Math.cos(boundaryAngle)));
    divider.setAttribute('y1', String(center.y + innerRadius * Math.sin(boundaryAngle)));
    divider.setAttribute('x2', String(center.x + outerRadius * Math.cos(boundaryAngle)));
    divider.setAttribute('y2', String(center.y + outerRadius * Math.sin(boundaryAngle)));
    overlay.append(divider);

    const labelRadius = Math.max(innerRadius + 24, outerRadius - 18);
    const label = document.createElementNS(SVG_NAMESPACE, 'text');
    label.setAttribute('class', 'sfi-sector-label');
    label.setAttribute('x', String(center.x + labelRadius * Math.cos(slot.angle)));
    label.setAttribute('y', String(center.y + labelRadius * Math.sin(slot.angle)));
    // label.textContent = `ALUR ${slot.principal}`;
    overlay.append(label);
  });
}

export const NetworkGraph: React.FC = () => {
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectorOverlayRef = useRef<SVGSVGElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const overviewRef = useRef<SfiTransactionOverview | null>(null);
  const layoutModeRef = useRef<SfiLayoutMode>('hierarchy');
  const { graph, loading, error } = useGraphData();
  const { dispatch, state } = useUI();
  const [layoutRunning, setLayoutRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [overviewSummary, setOverviewSummary] = useState<OverviewSummary>(EMPTY_SUMMARY);

  useEffect(() => {
    if (loading || !graph || !containerRef.current) return;
    const overview = createSfiTransactionOverview(graph, state.transactionView);
    const elements = buildSfiCytoscapeElements(graph, overview);

    if (!cyRef.current) {
      const cy = cytoscape({
        container: containerRef.current,
        elements,
        style: graphStyles,
        minZoom: 0.08,
        maxZoom: 3,
        wheelSensitivity: 0.2,
      });
      cy.on('tap', 'node', (event) => {
        dispatch({
          type: 'SET_FOCUS_NODE',
          payload: event.target.data('canonicalCompanyId') ?? event.target.id(),
        });
      });
      cy.on('tap', 'edge', (event) => {
        dispatch({
          type: 'SELECT_EDGE',
          payload: event.target.data('canonicalEdgeId') ?? event.target.id(),
        });
      });
      cy.on('tap', (event) => {
        if (event.target !== cy) return;
        dispatch({ type: 'CLEAR_FOCUS' });
        dispatch({ type: 'CLEAR_EDGE_SELECTION' });
      });
      cy.on('pan zoom resize', () => {
        const currentOverview = overviewRef.current;
        const overlay = sectorOverlayRef.current;
        if (currentOverview && overlay) renderSectorGuide(cy, currentOverview, overlay);
      });
      cyRef.current = cy;
    } else {
      cyRef.current.batch(() => {
        cyRef.current!.elements().remove();
        cyRef.current!.add(elements);
      });
    }

    overviewRef.current = overview;
    layoutModeRef.current = state.sfiLayoutMode;
    setOverviewSummary({
      companies: Math.max(
        0,
        overview.canonicalVisibleNodeIds.size - (overview.sfiId ? 1 : 0)
      ),
      relationships: overview.canonicalVisibleEdgeIds.size,
      principals: overview.officialPrincipalIds.size,
      replacements: overview.replacementHubIds.size,
      hasSfi: overview.sfiId !== null,
    });

    setLayoutRunning(true);
    requestAnimationFrame(() => {
      const cy = cyRef.current;
      if (cy) {
        cy.resize();
        const visibleElements = applySfiLayout(cy, overview, state.sfiLayoutMode);
        if (visibleElements.length > 0) cy.fit(visibleElements, 58);
        if (sectorOverlayRef.current) {
          renderSectorGuide(cy, overview, sectorOverlayRef.current);
        }
      }
      setLayoutRunning(false);
    });
  }, [graph, loading, state.transactionView, state.sfiLayoutMode, dispatch]);

  useEffect(() => () => {
    cyRef.current?.destroy();
    cyRef.current = null;
  }, []);

  useEffect(() => {
    const graphContainer = graphContainerRef.current;
    if (!graphContainer || typeof ResizeObserver === 'undefined') return;
    let animationFrame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const cy = cyRef.current;
        const overview = overviewRef.current;
        if (!cy || !overview) return;
        cy.resize();
        const visibleElements = applySfiLayout(cy, overview, layoutModeRef.current);
        if (visibleElements.length > 0) cy.fit(visibleElements, 58);
        if (sectorOverlayRef.current) {
          renderSectorGuide(cy, overview, sectorOverlayRef.current);
        }
      });
    });
    observer.observe(graphContainer);
    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === graphContainerRef.current);
      requestAnimationFrame(() => {
        const cy = cyRef.current;
        const overview = overviewRef.current;
        if (!cy || !overview) return;
        cy.resize();
        const visibleElements = applySfiLayout(cy, overview, layoutModeRef.current);
        if (visibleElements.length > 0) cy.fit(visibleElements, 58);
        if (sectorOverlayRef.current) {
          renderSectorGuide(cy, overview, sectorOverlayRef.current);
        }
      });
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    const overview = overviewRef.current;
    if (!cy || !overview || layoutRunning) return;
    cy.batch(() => {
      cy.elements().removeClass('dimmed highlighted');
      if (
        !state.focusedNodeId
        || !overview.canonicalVisibleNodeIds.has(state.focusedNodeId)
      ) return;
      const targets = cy.nodes().filter(
        (node) => node.data('canonicalCompanyId') === state.focusedNodeId
      );
      if (targets.length === 0) return;

      const connectedEdges = targets.connectedEdges(':visible');
      const relatedNodes = connectedEdges.connectedNodes().add(targets);
      const focusedElements = relatedNodes.add(connectedEdges);

      cy.elements(':visible').addClass('dimmed');
      focusedElements.removeClass('dimmed');
      targets.addClass('highlighted');
      connectedEdges.addClass('highlighted');
    });
  }, [state.focusedNodeId, layoutRunning]);

  const setZoomAroundViewportCenter = (factor: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    const nextZoom = Math.min(3, Math.max(0.08, cy.zoom() * factor));
    cy.stop();
    cy.zoom({
      level: nextZoom,
      renderedPosition: {
        x: cy.width() / 2,
        y: cy.height() / 2,
      },
    });
    const overview = overviewRef.current;
    const overlay = sectorOverlayRef.current;
    if (overview && overlay) renderSectorGuide(cy, overview, overlay);
  };

  const handleFit = () => {
    const cy = cyRef.current;
    const overview = overviewRef.current;
    if (!cy || !overview) return;
    const visible = cy.elements().filter((element) =>
      element.isNode()
        ? overview.visibleNodeIds.has(element.id())
        : overview.visibleEdgeIds.has(element.id())
    );
    if (visible.length > 0) {
      cy.stop();
      cy.fit(visible, 58);
      const overlay = sectorOverlayRef.current;
      if (overlay) renderSectorGuide(cy, overview, overlay);
    }
  };

  const handleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await graphContainerRef.current?.requestFullscreen();
    } catch (fullscreenError) {
      console.error('Unable to toggle graph fullscreen:', fullscreenError);
    }
  };

  if (error) {
    return (
      <div className="network-graph-container error">
        <h2>Error Loading Graph</h2>
        <p>{error}</p>
      </div>
    );
  }

  const viewLabel = state.transactionView === 'sales' ? 'Penjualan' : 'Pembelian';
  const layoutLabel = state.sfiLayoutMode === 'hierarchy'
    ? 'Hierarki Transaksi'
    : 'Ranking Nilai';
  const isEmpty = !loading && (!overviewSummary.hasSfi || overviewSummary.relationships === 0);
  const controlsDisabled = loading || layoutRunning || !overviewSummary.hasSfi;

  return (
    <div
      ref={graphContainerRef}
      className={`network-graph-container ${isFullscreen ? 'is-fullscreen' : ''}`}
    >
      {(loading || layoutRunning) && (
        <div className="loading-overlay glass-panel">
          <div className="spinner" />
          <p>{loading ? 'Loading data...' : 'Computing SFI layout...'}</p>
        </div>
      )}

      <div className="sfi-view-controls glass-panel" aria-label="Pengaturan visual SFI">
        <div className="sfi-control-group" role="group" aria-label="Jenis transaksi">
          <span>Visual</span>
          <div className="sfi-segmented-control">
            <button
              type="button"
              className={state.transactionView === 'sales' ? 'active' : ''}
              aria-pressed={state.transactionView === 'sales'}
              onClick={() => dispatch({ type: 'SET_TRANSACTION_VIEW', payload: 'sales' })}
            >
              Penjualan
            </button>
            <button
              type="button"
              className={state.transactionView === 'purchases' ? 'active' : ''}
              aria-pressed={state.transactionView === 'purchases'}
              onClick={() => dispatch({ type: 'SET_TRANSACTION_VIEW', payload: 'purchases' })}
            >
              Pembelian
            </button>
          </div>
        </div>
        <div className="sfi-control-group" role="group" aria-label="Mode posisi">
          <span>Posisi</span>
          <div className="sfi-segmented-control">
            <button
              type="button"
              className={state.sfiLayoutMode === 'hierarchy' ? 'active' : ''}
              aria-pressed={state.sfiLayoutMode === 'hierarchy'}
              onClick={() => dispatch({ type: 'SET_SFI_LAYOUT_MODE', payload: 'hierarchy' })}
            >
              Hierarki Transaksi
            </button>
            <button
              type="button"
              className={state.sfiLayoutMode === 'value' ? 'active' : ''}
              aria-pressed={state.sfiLayoutMode === 'value'}
              onClick={() => dispatch({ type: 'SET_SFI_LAYOUT_MODE', payload: 'value' })}
            >
              Ranking Nilai
            </button>
          </div>
        </div>
      </div>

      {isEmpty && (
        <div className="graph-empty-state glass-panel">
          <strong>
            {overviewSummary.hasSfi ? `Tidak ada transaksi ${viewLabel}` : 'SFI tidak ditemukan'}
          </strong>
          <span>Coba pilih periode, dataset, universe, atau scope lain.</span>
        </div>
      )}

      <svg ref={sectorOverlayRef} className="sfi-sector-guide" aria-hidden="true" />
      <div ref={containerRef} className="cy-canvas" />

      {!isEmpty && !state.focusedNodeId && (
        <div className="sfi-overview-hint glass-panel">
          <strong>{viewLabel} SFI · {layoutLabel}</strong>
          <span>{overviewSummary.companies} perusahaan · {overviewSummary.relationships} relasi</span>
          <small>
            {overviewSummary.principals} principal aktif
            {overviewSummary.replacements > 0
              ? ` · ${overviewSummary.replacements} hub pengganti`
              : ''}
          </small>
        </div>
      )}

      <div className="graph-controls glass-panel" role="toolbar" aria-label="Kontrol tampilan graph">
        <button
          type="button"
          disabled={controlsDisabled}
          onClick={() => setZoomAroundViewportCenter(1.25)}
          title="Perbesar"
          aria-label="Perbesar graph"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button
          type="button"
          disabled={controlsDisabled}
          onClick={() => setZoomAroundViewportCenter(0.8)}
          title="Perkecil"
          aria-label="Perkecil graph"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /></svg>
        </button>
        <button
          type="button"
          disabled={controlsDisabled}
          onClick={handleFit}
          title="Tampilkan seluruh graph"
          aria-label="Sesuaikan seluruh graph ke layar"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5M12 8v8M8 12h8" />
          </svg>
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={handleFullscreen}
          title={isFullscreen ? 'Keluar dari layar penuh' : 'Layar penuh'}
          aria-label={isFullscreen ? 'Keluar dari layar penuh' : 'Buka layar penuh'}
          aria-pressed={isFullscreen}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {isFullscreen
              ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
              : <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />}
          </svg>
        </button>
      </div>
    </div>
  );
};
