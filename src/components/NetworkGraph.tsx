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
  type SfiLayoutOptions,
  type SfiPosition,
  type SfiTransactionOverview,
} from '../graph/sfiTransaction';
import { graphStyles } from '../graph/styles';
import { partitionFocusedRelationships } from '../graph/focusProjection';
import {
  RADIAL_LAYOUT_CONFIG,
  layoutRadialLevels,
  radiusAt,
  visualSize,
  type RadialLayoutNode,
  type VisualSize,
} from '../graph/radialLayout';
import './NetworkGraph.css';

const SFI_OVERVIEW_NODE_DIAMETER = 38;
const SFI_CENTER_NODE_DIAMETER = 56;
const SFI_READABLE_ZOOM = 1;

function collectLayoutOptions(
  cy: cytoscape.Core,
  compactHierarchy = false
): SfiLayoutOptions {
  const nodeSizes = new Map<string, VisualSize>();
  const terminalInsideNodeIds = new Set<string>();
  cy.nodes().forEach((node) => {
    const isCenter = node.hasClass('sfi-center');
    const diameter = isCenter ? SFI_CENTER_NODE_DIAMETER : SFI_OVERVIEW_NODE_DIAMETER;
    nodeSizes.set(
      node.id(),
      visualSize(diameter, diameter, String(node.data('companyName') ?? ''))
    );
    if (node.data('nodeType') === 'special-external') {
      terminalInsideNodeIds.add(node.id());
    }
  });
  return { nodeSizes, terminalInsideNodeIds, compactHierarchy };
}

function nodeVisualSize(node: cytoscape.NodeSingular): VisualSize {
  const rawSize = Number(node.data('size') ?? 28);
  const bodySize = Number.isFinite(rawSize) ? rawSize : 28;
  return visualSize(bodySize, bodySize, String(node.data('companyName') ?? ''));
}

function internalBoundaryRadius(
  overview: SfiTransactionOverview,
  positions: ReadonlyMap<string, SfiPosition>
): number {
  const center = overview.sfiInstanceId
    ? positions.get(overview.sfiInstanceId)
    : undefined;
  if (!center) return SFI_INTERNAL_BOUNDARY_MIN_RADIUS;
  let deepestRadius = 0;
  overview.insideBoundaryNodeIds.forEach((nodeId) => {
    const position = positions.get(nodeId);
    if (position) deepestRadius = Math.max(deepestRadius, radiusAt(position, center));
  });
  return Math.max(
    SFI_INTERNAL_BOUNDARY_MIN_RADIUS,
    deepestRadius + SFI_INTERNAL_BOUNDARY_PADDING
  );
}

function applySfiLayout(
  cy: cytoscape.Core,
  overview: SfiTransactionOverview,
  mode: SfiLayoutMode,
  setPositions = true,
  compactHierarchy = false
): cytoscape.CollectionReturnValue {
  const positions = calculateSfiPositions(
    overview,
    mode,
    cy.width(),
    cy.height(),
    collectLayoutOptions(cy, compactHierarchy)
  );

  cy.batch(() => {
    cy.nodes().removeClass(
      'sfi-overview-node sfi-center principal-hub replacement-hub highlighted focused-anchor dimmed'
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
      if (setPositions && position) node.position(position);
      if (node.id() === overview.sfiInstanceId) node.addClass('sfi-center');
      if (overview.officialPrincipalIds.has(node.id())) node.addClass('principal-hub');
      if (overview.replacementHubIds.has(node.id())) node.addClass('replacement-hub');
    });

    cy.edges().forEach((edge) => {
      const visible = overview.visibleEdgeIds.has(edge.id());
      edge.style('display', visible ? 'element' : 'none');
      edge.removeData('rankLabel');
      edge.removeData('badgeOffset');
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

function fitReadableOverview(
  cy: cytoscape.Core,
  elements: cytoscape.CollectionReturnValue
) {
  if (elements.length === 0) return;
  cy.fit(elements, 58);
  if (cy.zoom() < SFI_READABLE_ZOOM) {
    cy.zoom({
      level: SFI_READABLE_ZOOM,
      renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
    });
    const centerNode = cy.nodes('.sfi-center').first();
    if (centerNode.length > 0) cy.center(centerNode);
  }
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
const FOCUS_TRANSITION_DURATION = 560;

interface FocusSectorExpansion {
  branchRootId: string;
  baseRadius: number;
  expandedRadius: number;
  progress: number;
}

function arcPath(
  center: SfiPosition,
  radius: number,
  startAngle: number,
  endAngle: number,
  largeArc: boolean
): string {
  const start = {
    x: center.x + radius * Math.cos(startAngle),
    y: center.y + radius * Math.sin(startAngle),
  };
  const end = {
    x: center.x + radius * Math.cos(endAngle),
    y: center.y + radius * Math.sin(endAngle),
  };
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc ? 1 : 0} 1 ${end.x} ${end.y}`;
}

function expansionStartProgress(
  previous: FocusSectorExpansion | null,
  next: FocusSectorExpansion | null
): number {
  return previous && next && previous.branchRootId === next.branchRootId
    ? previous.progress
    : 0;
}

function renderSectorGuide(
  cy: cytoscape.Core,
  overview: SfiTransactionOverview,
  overlay: SVGSVGElement,
  expansion?: FocusSectorExpansion | null
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
  const measuredOuterRadius = Math.max(
    SFI_INTERNAL_BOUNDARY_MIN_RADIUS * cy.zoom(),
    deepestInternalRadius + SFI_INTERNAL_BOUNDARY_PADDING * cy.zoom()
  );
  const baseOuterRadius = expansion
    ? expansion.baseRadius * cy.zoom()
    : measuredOuterRadius;
  const activeOuterRadius = expansion
    ? (expansion.baseRadius
      + (expansion.expandedRadius - expansion.baseRadius) * expansion.progress) * cy.zoom()
    : baseOuterRadius;
  const innerRadius = Math.max(28, centerNode.renderedOuterWidth() / 2 + 7);

  overlay.setAttribute('viewBox', `0 0 ${cy.width()} ${cy.height()}`);

  const sectorSize = (2 * Math.PI) / activeSlots.length;
  const expandedSlot = expansion
    ? activeSlots.find((slot) => slot.hubInstanceId === expansion.branchRootId)
    : undefined;
  overlay.dataset.centerX = String(center.x);
  overlay.dataset.centerY = String(center.y);
  overlay.dataset.innerRadius = String(innerRadius);
  overlay.dataset.baseRadius = String(baseOuterRadius);
  overlay.dataset.activeRadius = String(activeOuterRadius);
  overlay.dataset.expandedSlotId = expandedSlot?.hubInstanceId ?? '';
  if (!expandedSlot || activeOuterRadius <= baseOuterRadius + 0.5) {
    const outerCircle = document.createElementNS(SVG_NAMESPACE, 'circle');
    outerCircle.setAttribute('class', 'sfi-sector-outer');
    outerCircle.setAttribute('cx', String(center.x));
    outerCircle.setAttribute('cy', String(center.y));
    outerCircle.setAttribute('r', String(baseOuterRadius));
    overlay.append(outerCircle);
  } else {
    const startAngle = expandedSlot.angle - sectorSize / 2;
    const endAngle = expandedSlot.angle + sectorSize / 2;
    const inactiveArc = document.createElementNS(SVG_NAMESPACE, 'path');
    inactiveArc.setAttribute('class', 'sfi-sector-outer');
    inactiveArc.setAttribute(
      'd',
      arcPath(center, baseOuterRadius, endAngle, startAngle, sectorSize < Math.PI)
    );
    overlay.append(inactiveArc);

    const activeArc = document.createElementNS(SVG_NAMESPACE, 'path');
    activeArc.setAttribute('class', 'sfi-sector-outer sfi-sector-expanded');
    activeArc.setAttribute(
      'd',
      arcPath(center, activeOuterRadius, startAngle, endAngle, sectorSize > Math.PI)
    );
    overlay.append(activeArc);

  }

  const innerCircle = document.createElementNS(SVG_NAMESPACE, 'circle');
  innerCircle.setAttribute('class', 'sfi-sector-inner');
  innerCircle.setAttribute('cx', String(center.x));
  innerCircle.setAttribute('cy', String(center.y));
  innerCircle.setAttribute('r', String(innerRadius));
  overlay.append(innerCircle);

  activeSlots.forEach((_slot, index) => {
    const boundaryAngle = -Math.PI + sectorSize * index;
    const divider = document.createElementNS(SVG_NAMESPACE, 'line');
    divider.setAttribute('class', 'sfi-sector-divider');
    divider.setAttribute('x1', String(center.x + innerRadius * Math.cos(boundaryAngle)));
    divider.setAttribute('y1', String(center.y + innerRadius * Math.sin(boundaryAngle)));
    divider.setAttribute('x2', String(center.x + baseOuterRadius * Math.cos(boundaryAngle)));
    divider.setAttribute('y2', String(center.y + baseOuterRadius * Math.sin(boundaryAngle)));
    overlay.append(divider);
  });

  const hoveredSlot = activeSlots.find(
    (slot) => slot.hubInstanceId === overlay.dataset.hoveredSlotId
  );
  if (hoveredSlot) {
    const startAngle = hoveredSlot.angle - sectorSize / 2;
    const endAngle = hoveredSlot.angle + sectorSize / 2;
    const outerRadius = hoveredSlot.hubInstanceId === expandedSlot?.hubInstanceId
      ? activeOuterRadius
      : baseOuterRadius;
    const arc = document.createElementNS(SVG_NAMESPACE, 'path');
    arc.setAttribute('class', 'sfi-sector-hover-outline');
    arc.setAttribute('d', arcPath(center, outerRadius, startAngle, endAngle, sectorSize > Math.PI));
    overlay.append(arc);

    [startAngle, endAngle].forEach((angle) => {
      const divider = document.createElementNS(SVG_NAMESPACE, 'line');
      divider.setAttribute('class', 'sfi-sector-hover-outline');
      divider.setAttribute('x1', String(center.x + innerRadius * Math.cos(angle)));
      divider.setAttribute('y1', String(center.y + innerRadius * Math.sin(angle)));
      divider.setAttribute('x2', String(center.x + outerRadius * Math.cos(angle)));
      divider.setAttribute('y2', String(center.y + outerRadius * Math.sin(angle)));
      overlay.append(divider);
    });
  }
}

export const NetworkGraph: React.FC = () => {
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectorOverlayRef = useRef<SVGSVGElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const overviewRef = useRef<SfiTransactionOverview | null>(null);
  const layoutModeRef = useRef<SfiLayoutMode>('hierarchy');
  const compactHierarchyRef = useRef(false);
  const focusedOccurrenceRef = useRef<string | null>(null);
  const focusAnimationFrameRef = useRef(0);
  const focusAnimationTimeoutRef = useRef(0);
  const focusTransitionRef = useRef(0);
  const focusExpansionRef = useRef<FocusSectorExpansion | null>(null);
  const { graph, relationshipGraph, loading, error } = useGraphData();
  const { dispatch, state } = useUI();
  const [layoutRunning, setLayoutRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [overviewSummary, setOverviewSummary] = useState<OverviewSummary>(EMPTY_SUMMARY);
  compactHierarchyRef.current = state.yearFrom === 'all' && state.yearTo === 'all';

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
              direction: event.target.data('externalGroupDirection') ?? 'incoming',
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
              direction: event.target.data('externalGroupDirection') ?? 'incoming',
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
        if (currentOverview && overlay) {
          renderSectorGuide(cy, currentOverview, overlay, focusExpansionRef.current);
        }
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
        focusExpansionRef.current = null;
        cy.resize();
        const visibleElements = applySfiLayout(
          cy,
          overview,
          state.sfiLayoutMode,
          true,
          compactHierarchyRef.current
        );
        fitReadableOverview(cy, visibleElements);
        if (sectorOverlayRef.current) {
          renderSectorGuide(cy, overview, sectorOverlayRef.current);
        }
      }
      setLayoutRunning(false);
    });
  }, [graph, loading, state.transactionView, state.sfiLayoutMode, dispatch]);

  useEffect(() => {
    const canvas = containerRef.current;
    if (!canvas) return;

    const setHoveredSlot = (slotId: string) => {
      const cy = cyRef.current;
      const overview = overviewRef.current;
      const overlay = sectorOverlayRef.current;
      if (!cy || !overview || !overlay || overlay.dataset.hoveredSlotId === slotId) return;
      overlay.dataset.hoveredSlotId = slotId;
      renderSectorGuide(cy, overview, overlay, focusExpansionRef.current);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const overview = overviewRef.current;
      const overlay = sectorOverlayRef.current;
      if (!overview || !overlay) return;
      const rect = canvas.getBoundingClientRect();
      const dx = event.clientX - rect.left - Number(overlay.dataset.centerX);
      const dy = event.clientY - rect.top - Number(overlay.dataset.centerY);
      const distance = Math.hypot(dx, dy);
      const slots = overview.branchSlots.filter((slot) => slot.hubInstanceId);
      if (slots.length === 0) {
        setHoveredSlot('');
        return;
      }
      const sectorSize = (2 * Math.PI) / slots.length;
      const angle = Math.atan2(dy, dx);
      const hoveredSlot = slots.find((slot) => {
        const angleDifference = Math.atan2(
          Math.sin(angle - slot.angle),
          Math.cos(angle - slot.angle)
        );
        const outerRadius = slot.hubInstanceId === overlay.dataset.expandedSlotId
          ? Number(overlay.dataset.activeRadius)
          : Number(overlay.dataset.baseRadius);
        return Math.abs(angleDifference) <= sectorSize / 2
          && distance >= Number(overlay.dataset.innerRadius)
          && distance <= outerRadius;
      });
      setHoveredSlot(hoveredSlot?.hubInstanceId ?? '');
    };

    const handlePointerLeave = () => setHoveredSlot('');
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  useEffect(() => () => {
    cancelAnimationFrame(focusAnimationFrameRef.current);
    window.clearTimeout(focusAnimationTimeoutRef.current);
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
        const visibleElements = focusExpansionRef.current
          ? cy.elements(':visible')
          : applySfiLayout(
              cy,
              overview,
              layoutModeRef.current,
              true,
              compactHierarchyRef.current
            );
        fitReadableOverview(cy, visibleElements);
        if (sectorOverlayRef.current) {
          renderSectorGuide(cy, overview, sectorOverlayRef.current, focusExpansionRef.current);
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
        const visibleElements = focusExpansionRef.current
          ? cy.elements(':visible')
          : applySfiLayout(
              cy,
              overview,
              layoutModeRef.current,
              true,
              compactHierarchyRef.current
            );
        fitReadableOverview(cy, visibleElements);
        if (sectorOverlayRef.current) {
          renderSectorGuide(cy, overview, sectorOverlayRef.current, focusExpansionRef.current);
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

    const transitionId = ++focusTransitionRef.current;
    cancelAnimationFrame(focusAnimationFrameRef.current);
    window.clearTimeout(focusAnimationTimeoutRef.current);
    cy.stop(true, false);
    cy.elements().stop(true, false);
    const basePositions = calculateSfiPositions(
      overview,
      layoutModeRef.current,
      cy.width(),
      cy.height(),
      collectLayoutOptions(cy, compactHierarchyRef.current)
    );
    const previousExpansion = focusExpansionRef.current;
    cy.elements('.focus-supplemental').remove();
    const baseVisibleElements = applySfiLayout(
      cy,
      overview,
      layoutModeRef.current,
      false,
      compactHierarchyRef.current
    );

    const targetViewportFor = (
      elements: cytoscape.CollectionReturnValue,
      positions: ReadonlyMap<string, SfiPosition>,
      boundaryRadius?: number
    ) => {
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      elements.nodes().forEach((node) => {
        const position = positions.get(node.id()) ?? node.position();
        const size = nodeVisualSize(node);
        minX = Math.min(minX, position.x - size.width / 2);
        minY = Math.min(minY, position.y - size.height / 2);
        maxX = Math.max(maxX, position.x + size.width / 2);
        maxY = Math.max(maxY, position.y + size.height / 2);
      });
      const center = overview.sfiInstanceId
        ? positions.get(overview.sfiInstanceId)
        : undefined;
      if (center && boundaryRadius) {
        minX = Math.min(minX, center.x - boundaryRadius);
        minY = Math.min(minY, center.y - boundaryRadius);
        maxX = Math.max(maxX, center.x + boundaryRadius);
        maxY = Math.max(maxY, center.y + boundaryRadius);
      }
      if (!Number.isFinite(minX)) return { zoom: cy.zoom(), pan: { ...cy.pan() } };
      const padding = 64;
      const zoom = Math.min(
        cy.maxZoom(),
        Math.max(
          cy.minZoom(),
          Math.min(
            Math.max(1, cy.width() - padding * 2) / Math.max(1, maxX - minX),
            Math.max(1, cy.height() - padding * 2) / Math.max(1, maxY - minY)
          )
        )
      );
      return {
        zoom,
        pan: {
          x: cy.width() / 2 - ((minX + maxX) / 2) * zoom,
          y: cy.height() / 2 - ((minY + maxY) / 2) * zoom,
        },
      };
    };
    const animateScene = (
      targetPositions: ReadonlyMap<string, SfiPosition>,
      visibleElements: cytoscape.CollectionReturnValue,
      expansion: FocusSectorExpansion | null,
      fromProgress: number,
      toProgress: number,
      clearExpansion = false
    ) => {
      const supplementalElements = cy.elements('.focus-supplemental');
      supplementalElements.style('opacity', 0);
      supplementalElements.nodes().forEach((node) => {
        const target = targetPositions.get(node.id());
        if (target) node.position({ x: target.x, y: target.y });
      });
      const startPositions = new Map<string, SfiPosition>();
      targetPositions.forEach((_position, nodeId) => {
        const node = cy.getElementById(nodeId);
        if (node.length > 0) startPositions.set(nodeId, { ...node.position() });
      });
      const startViewport = { zoom: cy.zoom(), pan: { ...cy.pan() } };
      const targetViewport = targetViewportFor(
        visibleElements,
        targetPositions,
        expansion?.expandedRadius
      );
      const startedAt = performance.now();
      let finalized = false;
      const ease = (progress: number) => progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      const finish = () => {
        if (finalized || transitionId !== focusTransitionRef.current) return;
        finalized = true;
        window.clearTimeout(focusAnimationTimeoutRef.current);
        targetPositions.forEach((target, nodeId) => {
          const node = cy.getElementById(nodeId);
          if (node.length > 0) node.position({ x: target.x, y: target.y });
        });
        supplementalElements.removeStyle('opacity');
        cy.viewport(targetViewport);
        if (expansion) {
          expansion.progress = toProgress;
          focusExpansionRef.current = expansion;
        }
        if (clearExpansion) focusExpansionRef.current = null;
        if (sectorOverlayRef.current) {
          renderSectorGuide(
            cy,
            overview,
            sectorOverlayRef.current,
            clearExpansion ? null : expansion
          );
        }
      };
      const frame = (now: number) => {
        if (transitionId !== focusTransitionRef.current) return;
        const elapsed = Math.min(1, (now - startedAt) / FOCUS_TRANSITION_DURATION);
        const progress = ease(elapsed);
        targetPositions.forEach((target, nodeId) => {
          const node = cy.getElementById(nodeId);
          const start = startPositions.get(nodeId);
          if (node.length === 0 || !start) return;
          node.position({
            x: start.x + (target.x - start.x) * progress,
            y: start.y + (target.y - start.y) * progress,
          });
        });
        cy.viewport({
          zoom: startViewport.zoom + (targetViewport.zoom - startViewport.zoom) * progress,
          pan: {
            x: startViewport.pan.x + (targetViewport.pan.x - startViewport.pan.x) * progress,
            y: startViewport.pan.y + (targetViewport.pan.y - startViewport.pan.y) * progress,
          },
        });
        const supplementalOpacity = Math.max(0, Math.min(1, (elapsed - 0.68) / 0.32));
        supplementalElements.style('opacity', supplementalOpacity);
        if (expansion) {
          expansion.progress = fromProgress + (toProgress - fromProgress) * progress;
          focusExpansionRef.current = expansion;
        }
        if (sectorOverlayRef.current) {
          renderSectorGuide(cy, overview, sectorOverlayRef.current, expansion);
        }
        if (elapsed < 1) {
          focusAnimationFrameRef.current = requestAnimationFrame(frame);
        } else finish();
      };
      focusAnimationFrameRef.current = requestAnimationFrame(frame);
      focusAnimationTimeoutRef.current = window.setTimeout(
        finish,
        FOCUS_TRANSITION_DURATION + 120
      );
    };

    if (
      !state.focusedNodeId
      || !overview.canonicalVisibleNodeIds.has(state.focusedNodeId)
    ) {
      animateScene(
        basePositions,
        baseVisibleElements,
        previousExpansion,
        previousExpansion?.progress ?? 0,
        0,
        Boolean(previousExpansion)
      );
      return;
    }
    const focusedNodeId = state.focusedNodeId;

    const focusedPositions = new Map(basePositions);
    let focusedVisibleElements = baseVisibleElements;
    let nextExpansion: FocusSectorExpansion | null = null;

    cy.batch(() => {
      const targets = cy.nodes().filter(
        (node) => node.data('canonicalCompanyId') === focusedNodeId
      );
      if (targets.length === 0) return;

      const preferredTarget = focusedOccurrenceRef.current
        ? cy.getElementById(focusedOccurrenceRef.current)
        : cy.collection();
      const anchor = (preferredTarget.length > 0
        && preferredTarget.data('canonicalCompanyId') === focusedNodeId
          ? preferredTarget.first()
          : targets.first()) as cytoscape.NodeSingular;
      const targetIds = new Set([anchor.id()]);
      const relationships = relationshipGraph.edges.filter(
        (edge) => edge.source === focusedNodeId || edge.target === focusedNodeId
      );
      const rankedIncoming = [...relationships]
        .filter((edge) => edge.target === focusedNodeId)
        .sort((a, b) => b.totalDPP - a.totalDPP || b.invoiceCount - a.invoiceCount);
      const rankedOutgoing = [...relationships]
        .filter((edge) => edge.source === focusedNodeId)
        .sort((a, b) => b.totalDPP - a.totalDPP || b.invoiceCount - a.invoiceCount);
      const rankByEdgeId = new Map<string, number>();
      rankedIncoming.forEach((edge, index) => rankByEdgeId.set(edge.id, index + 1));
      rankedOutgoing.forEach((edge, index) => rankByEdgeId.set(edge.id, index + 1));
      const badgeOffsetFor = (edgeId: string, direction: 'incoming' | 'outgoing') => {
        const rank = rankByEdgeId.get(edgeId) ?? 1;
        return RADIAL_LAYOUT_CONFIG.badgeOffset
          * (rank % 2 === 0 ? -1 : 1)
          * (direction === 'incoming' ? -1 : 1);
      };

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
        incomingExternalRelationships,
        outgoingExternalRelationships,
        incomingExternalMemberIds,
        outgoingExternalMemberIds,
      } = partitionFocusedRelationships(
        relationshipGraph,
        focusedNodeId,
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
      const incomingIds = [...new Set(
        individualSupplementalRelationships
          .filter((edge) => edge.target === focusedNodeId)
          .map((edge) => edge.source)
      )];
      const outgoingIds = [...new Set(
        individualSupplementalRelationships
          .filter((edge) => edge.source === focusedNodeId)
          .map((edge) => edge.target)
      )];
      const branchRootId = overview.branchRootByNode.get(anchor.id()) ?? anchor.id();
      const baseSfiPosition = overview.sfiInstanceId
        ? basePositions.get(overview.sfiInstanceId)
        : undefined;
      const baseAnchorPosition = basePositions.get(anchor.id());
      if (!baseSfiPosition || !baseAnchorPosition) return;
      const branchAngle = Math.atan2(
        baseAnchorPosition.y - baseSfiPosition.y,
        baseAnchorPosition.x - baseSfiPosition.x
      );
      const activeSlotCount = Math.max(
        1,
        overview.branchSlots.filter((slot) => slot.hubInstanceId).length
      );
      const sectorAngle = (2 * Math.PI / activeSlotCount) * 0.72;
      const anchorBaseLevel = overview.levelByNode.get(anchor.id()) ?? 1;
      const opensUpstreamLevel = incomingIds.length > 0
        || incomingExternalMemberIds.length > 0;
      const supplementalNodeByDirection = new Map<string, string>();
      const supplementalSpecs: RadialLayoutNode[] = [];
      const temporarilyInsideIds = new Set<string>();

      const addSupplementalNodes = (
        canonicalIds: string[],
        direction: 'incoming' | 'outgoing',
        level: number
      ) => {
        canonicalIds.forEach((canonicalId, index) => {
          const canonical = canonicalNodes.get(canonicalId);
          if (!canonical?.data) return;
          const visualId = `focus:${focusedNodeId}:${direction}:${canonicalId}`;
          cy.add({
            group: 'nodes',
            data: {
              ...canonical.data,
              id: visualId,
              canonicalCompanyId: canonicalId,
              focusDirection: direction,
            },
            position: { ...anchor.position() },
            classes: 'focus-supplemental highlighted',
          });
          supplementalNodeByDirection.set(`${direction}:${canonicalId}`, visualId);
          const rawSize = Number(canonical.data.size ?? 32);
          const size = Number.isFinite(rawSize) ? rawSize : 32;
          supplementalSpecs.push({
            id: visualId,
            branchId: branchRootId,
            level,
            preferredAngle: branchAngle + (index - (canonicalIds.length - 1) / 2) * 0.01,
            ...visualSize(size, size, String(canonical.data.companyName ?? '')),
          });
          const nodeType = String(canonical.data.nodeType ?? 'external');
          const isInsideCompany = nodeType === 'internal' || nodeType === 'special-external';
          const isIncomingSupplier = direction === 'incoming' && nodeType !== 'wapu';
          if (isInsideCompany || isIncomingSupplier) {
            temporarilyInsideIds.add(visualId);
          }
        });
      };

      const shiftedAnchorLevel = anchorBaseLevel + (opensUpstreamLevel ? 1 : 0);
      addSupplementalNodes(incomingIds, 'incoming', anchorBaseLevel);
      addSupplementalNodes(outgoingIds, 'outgoing', shiftedAnchorLevel + 1);

      const externalMemberIdSet = new Set(externalMemberIds);
      const externalGroupIds = {
        incoming: `focus:${focusedNodeId}:external-group:incoming`,
        outgoing: `focus:${focusedNodeId}:external-group:outgoing`,
      };
      if (externalMemberIds.length > 0) {
        cy.edges(':visible').filter((edge) =>
          externalRelationshipIds.has(String(edge.data('canonicalEdgeId')))
          && (targetIds.has(edge.source().id()) || targetIds.has(edge.target().id()))
        ).style('display', 'none');
        cy.nodes(':visible').filter((node) =>
          externalMemberIdSet.has(String(node.data('canonicalCompanyId')))
          && node.id() !== anchor.id()
          && (overview.branchRootByNode.get(node.id()) ?? node.id()) === branchRootId
        ).style('display', 'none');
        anchor.style('display', 'element');
      }

      const addExternalGroup = (
        direction: 'incoming' | 'outgoing',
        memberIds: string[],
        level: number
      ) => {
        if (memberIds.length === 0) return;
        const externalGroupId = externalGroupIds[direction];
        cy.add({
          group: 'nodes',
          data: {
            id: externalGroupId,
            canonicalCompanyId: externalGroupId,
            companyName: String(memberIds.length),
            fullName: direction === 'incoming'
              ? `${memberIds.length} pemasok eksternal`
              : `${memberIds.length} pelanggan eksternal`,
            nodeType: 'external',
            isExternalGroup: true,
            externalGroupDirection: direction,
            externalGroupOwnerId: focusedNodeId,
            externalMemberIds: memberIds,
            size: 48,
          },
          position: { ...anchor.position() },
          classes: 'focus-supplemental external-group highlighted',
        });
        supplementalSpecs.push({
          id: externalGroupId,
          branchId: branchRootId,
          level,
          preferredAngle: branchAngle + (direction === 'incoming' ? -0.02 : 0.02),
          width: 56,
          height: 56,
        });
        if (direction === 'incoming') temporarilyInsideIds.add(externalGroupId);
      };
      addExternalGroup('incoming', incomingExternalMemberIds, anchorBaseLevel);
      addExternalGroup('outgoing', outgoingExternalMemberIds, shiftedAnchorLevel + 1);

      const belongsToFocusedSubtree = (nodeId: string) => {
        let currentId: string | undefined = nodeId;
        const visited = new Set<string>();
        while (currentId && !visited.has(currentId)) {
          if (currentId === anchor.id()) return true;
          visited.add(currentId);
          currentId = overview.parentByNode.get(currentId);
        }
        return false;
      };
      const activeBranchNodes = cy.nodes().filter((node) => (
        overview.visibleNodeIds.has(node.id())
        && (overview.branchRootByNode.get(node.id()) ?? node.id()) === branchRootId
        && (
          node.id() === anchor.id()
          || !externalMemberIdSet.has(String(node.data('canonicalCompanyId')))
        )
      ));
      const activeSpecs: RadialLayoutNode[] = [];
      activeBranchNodes.forEach((node) => {
        const basePosition = basePositions.get(node.id());
        if (!basePosition) return;
        const baseLevel = overview.levelByNode.get(node.id()) ?? 1;
        activeSpecs.push({
          id: node.id(),
          branchId: branchRootId,
          level: baseLevel + (opensUpstreamLevel && belongsToFocusedSubtree(node.id()) ? 1 : 0),
          preferredAngle: Math.atan2(
            basePosition.y - baseSfiPosition.y,
            basePosition.x - baseSfiPosition.x
          ),
          ...nodeVisualSize(node),
        });
      });
      const allFocusSpecs = [...activeSpecs, ...supplementalSpecs];
      const deepestInternalLevel = Math.max(
        anchorBaseLevel,
        ...activeSpecs
          .filter((spec) => overview.insideBoundaryNodeIds.has(spec.id))
          .map((spec) => spec.level)
      );
      activeSpecs.forEach((spec) => {
        const node = cy.getElementById(spec.id);
        if (node.data('nodeType') === 'special-external') {
          spec.level = Math.max(spec.level, deepestInternalLevel);
        }
      });
      const focusedLayout = layoutRadialLevels({
        center: baseSfiPosition,
        nodes: allFocusSpecs,
        branchAngles: new Map([[branchRootId, branchAngle]]),
        sectorAngle,
      });
      focusedLayout.positions.forEach((position, nodeId) => {
        focusedPositions.set(nodeId, position);
      });

      const focusedInsideIds = new Set([
        ...activeSpecs
          .filter((spec) => overview.insideBoundaryNodeIds.has(spec.id))
          .map((spec) => spec.id),
        ...temporarilyInsideIds,
      ]);
      const deepestFocusedInsideRadius = Math.max(
        0,
        ...[...focusedInsideIds].map((nodeId) => {
          const position = focusedPositions.get(nodeId);
          return position ? radiusAt(position, baseSfiPosition) : 0;
        })
      );
      const baseBoundaryRadius = internalBoundaryRadius(overview, basePositions);
      const focusedBoundaryRadius = Math.max(
        baseBoundaryRadius,
        deepestFocusedInsideRadius + SFI_INTERNAL_BOUNDARY_PADDING
      );
      const outsideSpecs = allFocusSpecs.filter((spec) => !focusedInsideIds.has(spec.id));
      const currentOutsideRadii = outsideSpecs.map((spec) => {
        const position = focusedPositions.get(spec.id)!;
        return radiusAt(position, baseSfiPosition);
      });
      const outsideFloor = focusedBoundaryRadius + 64;
      const outsideShift = currentOutsideRadii.length > 0
        ? Math.max(0, outsideFloor - Math.min(...currentOutsideRadii))
        : 0;
      if (outsideShift > 0) {
        outsideSpecs.forEach((spec) => {
          const position = focusedPositions.get(spec.id);
          if (!position) return;
          const angle = Math.atan2(
            position.y - baseSfiPosition.y,
            position.x - baseSfiPosition.x
          );
          const radius = radiusAt(position, baseSfiPosition) + outsideShift;
          focusedPositions.set(spec.id, {
            x: baseSfiPosition.x + radius * Math.cos(angle),
            y: baseSfiPosition.y + radius * Math.sin(angle),
          });
        });
      }
      nextExpansion = {
        branchRootId,
        baseRadius: baseBoundaryRadius,
        expandedRadius: focusedBoundaryRadius,
        progress: 0,
      };

      let focusedEdges = cy.collection();
      relationships.forEach((relationship) => {
        const direction = relationship.source === focusedNodeId ? 'outgoing' : 'incoming';
        if (externalRelationshipIds.has(relationship.id)) return;
        const existing = cy.edges(':visible').filter((edge) =>
          edge.data('canonicalEdgeId') === relationship.id
          && (targetIds.has(edge.source().id()) || targetIds.has(edge.target().id()))
        );
        if (existing.length > 0) {
          existing.removeClass('outgoing incoming').addClass(`${direction} highlighted`);
          existing.data('rankLabel', `#${rankByEdgeId.get(relationship.id) ?? 1}`);
          existing.data('badgeOffset', badgeOffsetFor(relationship.id, direction));
          focusedEdges = focusedEdges.merge(existing);
          return;
        }

        const counterpartId = relationship.source === focusedNodeId
          ? relationship.target
          : relationship.source;
        const counterpartVisualId = supplementalNodeByDirection.get(
          `${direction}:${counterpartId}`
        );
        const canonical = canonicalEdges.get(relationship.id);
        if (!counterpartVisualId || !canonical?.data) return;
        const edge = cy.add({
          group: 'edges',
          data: {
            ...canonical.data,
            id: `focus:${focusedNodeId}:edge:${relationship.id}`,
            source: relationship.source === focusedNodeId ? anchor.id() : counterpartVisualId,
            target: relationship.target === focusedNodeId ? anchor.id() : counterpartVisualId,
            canonicalEdgeId: relationship.id,
            rankLabel: `#${rankByEdgeId.get(relationship.id) ?? 1}`,
            badgeOffset: badgeOffsetFor(relationship.id, direction),
          },
          classes: `sfi-edge focus-supplemental ${direction} highlighted`,
        });
        focusedEdges = focusedEdges.merge(edge);
      });

      const addExternalGroupEdge = (
        direction: 'incoming' | 'outgoing',
        groupedRelationships: typeof externalRelationships
      ) => {
        const memberIds = direction === 'incoming'
          ? incomingExternalMemberIds
          : outgoingExternalMemberIds;
        if (groupedRelationships.length === 0 || memberIds.length === 0) return;
        const externalGroupId = externalGroupIds[direction];
        const source = direction === 'incoming' ? externalGroupId : anchor.id();
        const target = direction === 'incoming' ? anchor.id() : externalGroupId;
        const groupRank = Math.min(...groupedRelationships.map(
          (relationship) => rankByEdgeId.get(relationship.id) ?? 1
        ));
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
            externalGroupDirection: direction,
            externalGroupOwnerId: focusedNodeId,
            externalMemberIds: memberIds,
            rankLabel: `#${groupRank}`,
            badgeOffset: direction === 'incoming'
              ? -RADIAL_LAYOUT_CONFIG.badgeOffset
              : RADIAL_LAYOUT_CONFIG.badgeOffset,
          },
          classes: `sfi-edge focus-supplemental external-group-edge ${direction} highlighted`,
        });
        focusedEdges = focusedEdges.merge(edge);
      };

      addExternalGroupEdge(
        'incoming',
        incomingExternalRelationships
      );
      addExternalGroupEdge(
        'outgoing',
        outgoingExternalRelationships
      );

      const focusedTarget = cy.collection().merge(anchor);
      const connectedEdges = focusedTarget.connectedEdges(':visible').merge(focusedEdges);
      const relatedNodes = connectedEdges.connectedNodes().add(focusedTarget);
      const focusedElements = relatedNodes.add(connectedEdges);
      focusedVisibleElements = cy.elements(':visible');

      cy.elements(':visible').addClass('dimmed');
      focusedElements.removeClass('dimmed');
      focusedTarget.addClass('highlighted focused-anchor');
      connectedEdges.addClass('highlighted');
    });

    if (nextExpansion) focusExpansionRef.current = nextExpansion;
    animateScene(
      focusedPositions,
      focusedVisibleElements,
      nextExpansion,
      expansionStartProgress(previousExpansion, nextExpansion),
      1
    );
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
    if (overview && overlay) {
      renderSectorGuide(cy, overview, overlay, focusExpansionRef.current);
    }
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
      if (overlay) renderSectorGuide(cy, overview, overlay, focusExpansionRef.current);
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
