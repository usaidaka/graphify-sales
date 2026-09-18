import type { Point, VisualSize } from './radialLayout';

export interface FocusSupplement extends VisualSize {
  id: string;
  direction: 'incoming' | 'outgoing';
  outside: boolean;
  terminalInside?: boolean;
}

export const FOCUS_LEVEL_GAP = 116;
export const FOCUS_CENTER_CLEARANCE = 100;
const FOCUS_SIBLING_GAP = 32;

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
