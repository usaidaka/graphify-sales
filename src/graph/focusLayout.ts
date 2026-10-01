import type { Point, VisualSize } from './radialLayout';

export interface FocusSupplement extends VisualSize {
  id: string;
  direction: 'incoming' | 'outgoing';
  outside: boolean;
  terminalInside?: boolean;
}

export interface FocusCollisionNode extends VisualSize {
  id: string;
}

export const FOCUS_LEVEL_GAP = 116;
export const FOCUS_CENTER_CLEARANCE = 100;
const FOCUS_SIBLING_GAP = 32;
const FOCUS_EDGE_CLEARANCE = 12;
const FOCUS_COLLISION_GAP = 16;
const FOCUS_RESOLUTION_PASSES = 18;

function focusAngularSpan(sectorAngle: number): number {
  // A focused branch may borrow nearby space while the other branches are dimmed.
  return Math.max(0.7, Math.min(1.2, sectorAngle * 0.72));
}

export function upstreamFocusClearance(
  anchorSize: VisualSize,
  incoming: FocusSupplement[],
  sectorAngle: number
): { minimumAnchorRadius: number; gap: number } {
  if (incoming.length === 0) return { minimumAnchorRadius: 0, gap: FOCUS_LEVEL_GAP };
  const halfDepth = (size: VisualSize) => Math.hypot(size.width, size.height) / 2;
  const deepestIncoming = Math.max(...incoming.map(halfDepth));
  const widestIncoming = Math.max(...incoming.map((node) => node.width));
  const minimumIncomingRadius = Math.max(
    FOCUS_CENTER_CLEARANCE,
    40 + deepestIncoming + 24,
    incoming.length > 1
      ? (widestIncoming + FOCUS_SIBLING_GAP)
        / (2 * Math.sin(focusAngularSpan(sectorAngle) / (2 * (incoming.length - 1))))
      : 0
  );
  const gap = Math.max(FOCUS_LEVEL_GAP, halfDepth(anchorSize) + deepestIncoming + 24);
  return { minimumAnchorRadius: minimumIncomingRadius + gap, gap };
}

/** Place newly revealed neighbors around the existing anchor without rotating its branch. */
export function placeFocusSupplements(
  center: Point,
  anchor: Point,
  supplements: FocusSupplement[],
  boundaryRadius: number,
  deepestInsideRadius: number,
  sectorAngle: number,
  upstreamGap = FOCUS_LEVEL_GAP
): Map<string, Point> {
  const positions = new Map<string, Point>();
  const anchorRadius = Math.hypot(anchor.x - center.x, anchor.y - center.y);
  const anchorAngle = Math.atan2(anchor.y - center.y, anchor.x - center.x);
  const groups = [
    supplements.filter((node) => node.direction === 'incoming'),
    supplements.filter((node) => node.direction === 'outgoing' && !node.outside),
    supplements.filter((node) => node.direction === 'outgoing' && node.outside),
  ];

  groups.forEach((nodes) => {
    if (nodes.length === 0) return;
    const radiusFor = (node: FocusSupplement) => {
      if (node.direction === 'incoming') {
        return Math.max(FOCUS_CENTER_CLEARANCE, anchorRadius - upstreamGap);
      }
      if (node.outside) {
        return Math.max(anchorRadius + FOCUS_LEVEL_GAP, boundaryRadius + 48);
      }
      return node.terminalInside
        ? Math.max(anchorRadius + FOCUS_LEVEL_GAP, deepestInsideRadius + 48)
        : anchorRadius + FOCUS_LEVEL_GAP;
    };
    const smallestRadius = Math.min(...nodes.map(radiusFor));
    const widestNode = Math.max(...nodes.map((node) => node.width));
    const requiredSpan = (nodes.length - 1) * 2 * Math.asin(
      Math.min(1, (widestNode + FOCUS_SIBLING_GAP) / (2 * smallestRadius))
    );
    const span = Math.min(focusAngularSpan(sectorAngle), requiredSpan);
    nodes.forEach((node, index) => {
      const angle = anchorAngle + (nodes.length === 1
        ? 0
        : -span / 2 + span * index / (nodes.length - 1));
      const radius = radiusFor(node);
      positions.set(node.id, {
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      });
    });
  });
  return positions;
}

function nodeRadius(node: VisualSize): number {
  return Math.max(node.width, node.height) / 2;
}

function pointToSegmentDistance(
  point: Point,
  start: Point,
  end: Point
): { distance: number; progress: number } {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared === 0) {
    return { distance: Math.hypot(point.x - start.x, point.y - start.y), progress: 0 };
  }
  const progress = Math.max(0, Math.min(1, (
    (point.x - start.x) * deltaX + (point.y - start.y) * deltaY
  ) / lengthSquared));
  const closest = {
    x: start.x + progress * deltaX,
    y: start.y + progress * deltaY,
  };
  return {
    distance: Math.hypot(point.x - closest.x, point.y - closest.y),
    progress,
  };
}

/**
 * Move focused neighbors just enough to keep every star edge visible. A node
 * may borrow nearby room, but its displacement is bounded so the focused
 * branch keeps its original reading direction.
 */
export function resolveFocusOcclusions(
  anchor: Point,
  nodes: FocusCollisionNode[],
  initialPositions: ReadonlyMap<string, Point>
): Map<string, Point> {
  const positions = new Map(initialPositions);
  const originals = new Map<string, Point>();
  nodes.forEach((node) => {
    const position = positions.get(node.id);
    if (position) originals.set(node.id, { ...position });
  });

  const conflictScore = (node: FocusCollisionNode, candidate: Point): number => {
    const original = originals.get(node.id) ?? candidate;
    let score = Math.hypot(candidate.x - original.x, candidate.y - original.y) ** 2;

    nodes.forEach((other) => {
      if (other.id === node.id) return;
      const otherPosition = positions.get(other.id);
      if (!otherPosition) return;

      const overlap = nodeRadius(node) + nodeRadius(other) + FOCUS_COLLISION_GAP
        - Math.hypot(candidate.x - otherPosition.x, candidate.y - otherPosition.y);
      if (overlap > 0) score += 100_000 + overlap * overlap * 1_000;

      const edgeDistance = pointToSegmentDistance(candidate, anchor, otherPosition);
      const edgePenetration = nodeRadius(node) + FOCUS_EDGE_CLEARANCE
        - edgeDistance.distance;
      if (
        edgePenetration > 0
        && edgeDistance.progress > 0.08
        && edgeDistance.progress < 0.94
      ) {
        score += 100_000 + edgePenetration * edgePenetration * 1_000;
      }
    });
    return score;
  };

  for (let pass = 0; pass < FOCUS_RESOLUTION_PASSES; pass += 1) {
    let conflictedNode: FocusCollisionNode | null = null;
    let conflictDirection: Point | null = null;
    let worstPenetration = 0;

    nodes.forEach((node) => {
      const position = positions.get(node.id);
      if (!position) return;
      nodes.forEach((other) => {
        if (other.id === node.id) return;
        const otherPosition = positions.get(other.id);
        if (!otherPosition) return;

        const edge = pointToSegmentDistance(position, anchor, otherPosition);
        const edgePenetration = nodeRadius(node) + FOCUS_EDGE_CLEARANCE - edge.distance;
        if (
          edgePenetration > worstPenetration
          && edge.progress > 0.08
          && edge.progress < 0.94
        ) {
          const edgeDelta = {
            x: otherPosition.x - anchor.x,
            y: otherPosition.y - anchor.y,
          };
          const length = Math.max(1, Math.hypot(edgeDelta.x, edgeDelta.y));
          conflictedNode = node;
          conflictDirection = { x: -edgeDelta.y / length, y: edgeDelta.x / length };
          worstPenetration = edgePenetration;
        }

        const overlap = nodeRadius(node) + nodeRadius(other) + FOCUS_COLLISION_GAP
          - Math.hypot(position.x - otherPosition.x, position.y - otherPosition.y);
        if (overlap > worstPenetration) {
          const deltaX = position.x - otherPosition.x;
          const deltaY = position.y - otherPosition.y;
          const length = Math.max(1, Math.hypot(deltaX, deltaY));
          conflictedNode = node;
          conflictDirection = length > 1
            ? { x: deltaX / length, y: deltaY / length }
            : { x: 0, y: 1 };
          worstPenetration = overlap;
        }
      });
    });

    if (!conflictedNode || !conflictDirection || worstPenetration <= 0) break;
    const node = conflictedNode as FocusCollisionNode;
    const position = positions.get(node.id);
    const original = originals.get(node.id);
    if (!position || !original) break;

    const move = worstPenetration + FOCUS_EDGE_CLEARANCE;
    const maximumShift = Math.max(node.width, node.height) * 1.5 + 28;
    const candidates: Point[] = [];
    [1, -1].forEach((side) => {
      [1, 1.35, 1.8].forEach((scale) => {
        candidates.push({
          x: position.x + conflictDirection!.x * move * scale * side,
          y: position.y + conflictDirection!.y * move * scale * side,
        });
      });
    });
    for (let index = 0; index < 12; index += 1) {
      const angle = 2 * Math.PI * index / 12;
      candidates.push({
        x: original.x + maximumShift * 0.55 * Math.cos(angle),
        y: original.y + maximumShift * 0.55 * Math.sin(angle),
      });
    }

    const boundedCandidates = candidates.map((candidate) => {
      const deltaX = candidate.x - original.x;
      const deltaY = candidate.y - original.y;
      const distance = Math.hypot(deltaX, deltaY);
      if (distance <= maximumShift) return candidate;
      return {
        x: original.x + deltaX / distance * maximumShift,
        y: original.y + deltaY / distance * maximumShift,
      };
    });
    const currentScore = conflictScore(node, position);
    const best = boundedCandidates.reduce((bestCandidate, candidate) => (
      conflictScore(node, candidate) < conflictScore(node, bestCandidate)
        ? candidate
        : bestCandidate
    ), position);
    if (conflictScore(node, best) >= currentScore - 0.01) break;
    positions.set(node.id, best);
  }

  return positions;
}
