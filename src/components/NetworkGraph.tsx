import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { useGraphData } from '../context/GraphDataContext';
import { useUI } from '../context/UIContext';
import { buildCytoscapeElements, buildSfiCytoscapeElements } from '../graph/builder';
import {
  calculateSfiPositions,
  createSfiTransactionOverview,
  SFI_INTERNAL_BOUNDARY_MIN_RADIUS,
  SFI_INTERNAL_BOUNDARY_PADDING,
  type SfiLayoutMode,
  type SfiTransactionOverview,
} from '../graph/sfiTransaction';
import { graphStyles } from '../graph/styles';
import { partitionFocusedRelationships } from '../graph/focusProjection';
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
  const boundaryNodes = cy.nodes().filter((node) =>
    overview.visibleNodeIds.has(node.id()) && overview.insideBoundaryNodeIds.has(node.id())
  );
  let deepestInternalRadius = 0;
  boundaryNodes.forEach((node) => {
    const position = node.renderedPosition();
    deepestInternalRadius = Math.max(
      deepestInternalRadius,
      Math.hypot(position.x - center.x, position.y - center.y)
    );
  });
  const outerRadius = Math.max(
    SFI_INTERNAL_BOUNDARY_MIN_RADIUS * cy.zoom(),
    deepestInternalRadius + SFI_INTERNAL_BOUNDARY_PADDING * cy.zoom()
  );
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
  const focusedOccurrenceRef = useRef<string | null>(null);
  const { graph, relationshipGraph, loading, error } = useGraphData();
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
        if (event.target.data('isExternalGroup')) {
          dispatch({
            type: 'SHOW_EXTERNAL_GROUP',
            payload: {
              ownerId: event.target.data('externalGroupOwnerId'),
              memberIds: event.target.data('externalMemberIds') ?? [],
            },
          });
          return;
        }
        focusedOccurrenceRef.current = event.target.id();
        dispatch({
          type: 'SET_FOCUS_NODE',
          payload: event.target.data('canonicalCompanyId') ?? event.target.id(),
        });
      });
      cy.on('tap', 'edge', (event) => {
        if (event.target.data('isExternalGroup')) {
          dispatch({
            type: 'SHOW_EXTERNAL_GROUP',
            payload: {
              ownerId: event.target.data('externalGroupOwnerId'),
              memberIds: event.target.data('externalMemberIds') ?? [],
            },
          });
          return;
        }
        dispatch({
          type: 'SELECT_EDGE',
          payload: event.target.data('canonicalEdgeId') ?? event.target.id(),
        });
      });
      cy.on('tap', (event) => {
        if (event.target !== cy) return;
        focusedOccurrenceRef.current = null;
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
    if (!cy || !overview || !relationshipGraph || layoutRunning) return;

    cy.elements('.focus-supplemental').remove();
    applySfiLayout(cy, overview, layoutModeRef.current);

    cy.batch(() => {
      if (
        !state.focusedNodeId
        || !overview.canonicalVisibleNodeIds.has(state.focusedNodeId)
      ) return;
      const targets = cy.nodes().filter(
        (node) => node.data('canonicalCompanyId') === state.focusedNodeId
      );
      if (targets.length === 0) return;

      const preferredTarget = focusedOccurrenceRef.current
        ? cy.getElementById(focusedOccurrenceRef.current)
        : cy.collection();
      const anchor = (preferredTarget.length > 0
        && preferredTarget.data('canonicalCompanyId') === state.focusedNodeId
          ? preferredTarget.first()
          : targets.first()) as cytoscape.NodeSingular;
      const targetIds = new Set(targets.map((node) => node.id()));
      const relationships = relationshipGraph.edges.filter(
        (edge) => edge.source === state.focusedNodeId || edge.target === state.focusedNodeId
      );
      const rankedIncoming = [...relationships]
        .filter((edge) => edge.target === state.focusedNodeId)
        .sort((a, b) => b.totalDPP - a.totalDPP || b.invoiceCount - a.invoiceCount);
      const rankedOutgoing = [...relationships]
        .filter((edge) => edge.source === state.focusedNodeId)
        .sort((a, b) => b.totalDPP - a.totalDPP || b.invoiceCount - a.invoiceCount);
      const rankByEdgeId = new Map<string, number>();
      rankedIncoming.forEach((edge, index) => rankByEdgeId.set(edge.id, index + 1));
      rankedOutgoing.forEach((edge, index) => rankByEdgeId.set(edge.id, index + 1));

      const canonicalElements = buildCytoscapeElements(relationshipGraph);
      const canonicalNodes = new Map(
        canonicalElements
          .filter((element) => element.group === 'nodes')
          .map((element) => [String(element.data?.id), element])
      );
      const canonicalEdges = new Map(
        canonicalElements
          .filter((element) => element.group === 'edges')
          .map((element) => [String(element.data?.id), element])
      );
      const supplementalRelationships = relationships.filter((relationship) =>
        cy.edges(':visible').filter((edge) =>
          edge.data('canonicalEdgeId') === relationship.id
          && (targetIds.has(edge.source().id()) || targetIds.has(edge.target().id()))
        ).length === 0
      );
      const {
        externalRelationships,
        individualRelationships,
        externalMemberIds,
      } = partitionFocusedRelationships(
        relationshipGraph,
        state.focusedNodeId,
        relationships
      );
      const externalRelationshipIds = new Set(
        externalRelationships.map((relationship) => relationship.id)
      );
      const individualRelationshipIds = new Set(
        individualRelationships.map((relationship) => relationship.id)
      );
      const individualSupplementalRelationships = supplementalRelationships.filter(
        (relationship) => individualRelationshipIds.has(relationship.id)
      );
      const counterpartIds = [...new Set(individualSupplementalRelationships.map((edge) =>
        edge.source === state.focusedNodeId ? edge.target : edge.source
      ))];
      const incomingIds = counterpartIds.filter((counterpartId) =>
        relationships.some((edge) =>
          edge.source === counterpartId && edge.target === state.focusedNodeId
        )
      );
      const outgoingIds = counterpartIds.filter((counterpartId) => !incomingIds.includes(counterpartId));
      const anchorPosition = anchor.position();
      const sfiPosition = overview.sfiInstanceId
        ? cy.getElementById(overview.sfiInstanceId).position()
        : { x: anchorPosition.x - 1, y: anchorPosition.y };
      const inwardAngle = Math.atan2(
        sfiPosition.y - anchorPosition.y,
        sfiPosition.x - anchorPosition.x
      );
      const supplementalNodeByCanonical = new Map<string, string>();

      const addSupplementalNodes = (
        canonicalIds: string[],
        baseAngle: number
      ) => {
        const spread = Math.min(Math.PI * 0.8, Math.max(0.5, canonicalIds.length * 0.34));
        canonicalIds.forEach((canonicalId, index) => {
          const canonical = canonicalNodes.get(canonicalId);
          if (!canonical?.data) return;
          const visualId = `focus:${state.focusedNodeId}:${canonicalId}`;
          const offset = canonicalIds.length === 1
            ? 0
            : -spread / 2 + (spread * index) / (canonicalIds.length - 1);
          const radius = 116 + Math.floor(index / 7) * 52;
          const angle = baseAngle + offset;
          cy.add({
            group: 'nodes',
            data: {
              ...canonical.data,
              id: visualId,
              canonicalCompanyId: canonicalId,
            },
            position: {
              x: anchorPosition.x + radius * Math.cos(angle),
              y: anchorPosition.y + radius * Math.sin(angle),
            },
            classes: 'focus-supplemental highlighted',
          });
          supplementalNodeByCanonical.set(canonicalId, visualId);
        });
      };

      addSupplementalNodes(incomingIds, inwardAngle);
      addSupplementalNodes(outgoingIds, inwardAngle + Math.PI);

      const externalMemberIdSet = new Set(externalMemberIds);
      const externalGroupId = `focus:${state.focusedNodeId}:external-group`;
      if (externalMemberIds.length > 0) {
        cy.edges(':visible').filter((edge) =>
          externalRelationshipIds.has(String(edge.data('canonicalEdgeId')))
          && (targetIds.has(edge.source().id()) || targetIds.has(edge.target().id()))
        ).style('display', 'none');
        cy.nodes(':visible').filter((node) =>
          externalMemberIdSet.has(String(node.data('canonicalCompanyId')))
        ).style('display', 'none');

        const hasIncoming = externalRelationships.some(
          (relationship) => relationship.target === state.focusedNodeId
        );
        const hasOutgoing = externalRelationships.some(
          (relationship) => relationship.source === state.focusedNodeId
        );
        const groupAngle = hasIncoming && hasOutgoing
          ? inwardAngle + Math.PI / 2
          : hasIncoming ? inwardAngle : inwardAngle + Math.PI;
        cy.add({
          group: 'nodes',
          data: {
            id: externalGroupId,
            canonicalCompanyId: externalGroupId,
            companyName: `${externalMemberIds.length} Eksternal`,
            fullName: `${externalMemberIds.length} perusahaan eksternal`,
            nodeType: 'external',
            isExternalGroup: true,
            externalGroupOwnerId: state.focusedNodeId,
            externalMemberIds,
            size: 40,
          },
          position: {
            x: anchorPosition.x + 138 * Math.cos(groupAngle),
            y: anchorPosition.y + 138 * Math.sin(groupAngle),
          },
          classes: 'focus-supplemental external-group highlighted',
        });
      }

      let focusedEdges = cy.collection();
      relationships.forEach((relationship) => {
        const direction = relationship.source === state.focusedNodeId ? 'outgoing' : 'incoming';
        if (externalRelationshipIds.has(relationship.id)) return;
        const existing = cy.edges(':visible').filter((edge) =>
          edge.data('canonicalEdgeId') === relationship.id
          && (targetIds.has(edge.source().id()) || targetIds.has(edge.target().id()))
        );
        if (existing.length > 0) {
          existing.removeClass('outgoing incoming').addClass(`${direction} highlighted`);
          existing.data('rankLabel', `#${rankByEdgeId.get(relationship.id) ?? 1}`);
          focusedEdges = focusedEdges.merge(existing);
          return;
        }

        const counterpartId = relationship.source === state.focusedNodeId
          ? relationship.target
          : relationship.source;
        const counterpartVisualId = supplementalNodeByCanonical.get(counterpartId);
        const canonical = canonicalEdges.get(relationship.id);
        if (!counterpartVisualId || !canonical?.data) return;
        const edge = cy.add({
          group: 'edges',
          data: {
            ...canonical.data,
            id: `focus:${state.focusedNodeId}:edge:${relationship.id}`,
            source: relationship.source === state.focusedNodeId ? anchor.id() : counterpartVisualId,
            target: relationship.target === state.focusedNodeId ? anchor.id() : counterpartVisualId,
            canonicalEdgeId: relationship.id,
            rankLabel: `#${rankByEdgeId.get(relationship.id) ?? 1}`,
          },
          classes: `sfi-edge focus-supplemental ${direction} highlighted`,
        });
        focusedEdges = focusedEdges.merge(edge);
      });

      const addExternalGroupEdge = (
        direction: 'incoming' | 'outgoing',
        groupedRelationships: typeof externalRelationships
      ) => {
        if (groupedRelationships.length === 0 || externalMemberIds.length === 0) return;
        const source = direction === 'incoming' ? externalGroupId : anchor.id();
        const target = direction === 'incoming' ? anchor.id() : externalGroupId;
        const edge = cy.add({
          group: 'edges',
          data: {
            id: `${externalGroupId}:${direction}`,
            source,
            target,
            invoiceCount: groupedRelationships.reduce(
              (total, relationship) => total + relationship.invoiceCount,
              0
            ),
            totalDPP: groupedRelationships.reduce(
              (total, relationship) => total + relationship.totalDPP,
              0
            ),
            width: 2.5,
            isExternalGroup: true,
            externalGroupOwnerId: state.focusedNodeId,
            externalMemberIds,
          },
          classes: `sfi-edge focus-supplemental external-group-edge ${direction} highlighted`,
        });
        focusedEdges = focusedEdges.merge(edge);
      };

      addExternalGroupEdge(
        'incoming',
        externalRelationships.filter((relationship) => relationship.target === state.focusedNodeId)
      );
      addExternalGroupEdge(
        'outgoing',
        externalRelationships.filter((relationship) => relationship.source === state.focusedNodeId)
      );

      const connectedEdges = targets.connectedEdges(':visible').merge(focusedEdges);
      const relatedNodes = connectedEdges.connectedNodes().add(targets);
      const focusedElements = relatedNodes.add(connectedEdges);

      cy.elements(':visible').addClass('dimmed');
      focusedElements.removeClass('dimmed');
      targets.addClass('highlighted');
      connectedEdges.addClass('highlighted');
    });
  }, [state.focusedNodeId, relationshipGraph, layoutRunning]);

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
