import type { FocusSortMetric } from '../context/UIContext';

export const DEFAULT_FOCUS_SORT_METRIC: FocusSortMetric = 'total-omzet';

export interface FocusEdgeMetric {
  source: string;
  target: string;
  totalDPP?: number;
  invoiceCount?: number;
}

export interface RankedNeighbor {
  neighborId: string;
  value: number;
  radius: number;
}

export interface FocusPosition extends RankedNeighbor {
  x: number;
  y: number;
}

export function isFocusSortVisible(focusedNodeId: string | null): boolean {
  return focusedNodeId !== null;
}

export function metricValue(
  edge: Pick<FocusEdgeMetric, 'totalDPP' | 'invoiceCount'>,
  metric: FocusSortMetric
): number {
  const value = metric === 'invoice-count' ? edge.invoiceCount : edge.totalDPP;
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function aggregateNeighborMetrics(
  focusedNodeId: string,
  edges: FocusEdgeMetric[],
  metric: FocusSortMetric
): Map<string, number> {
  const totals = new Map<string, number>();

  edges.forEach((edge) => {
    const neighborId = edge.source === focusedNodeId ? edge.target : edge.source;
    totals.set(neighborId, (totals.get(neighborId) ?? 0) + metricValue(edge, metric));
  });

  return totals;
}

export function rankNeighborRadii(
  totals: Map<string, number>,
  minRadius = 92,
  gapPerRank = 14,
  maxRadius = 190
): RankedNeighbor[] {
  const sorted = Array.from(totals, ([neighborId, value]) => ({ neighborId, value }))
    .sort((a, b) => b.value - a.value || a.neighborId.localeCompare(b.neighborId));

  let previousValue: number | undefined;
  let radius = minRadius;

  return sorted.map((neighbor) => {
    if (previousValue !== undefined && neighbor.value < previousValue) {
      radius = Math.min(maxRadius, radius + gapPerRank);
    }
    previousValue = neighbor.value;
    return { ...neighbor, radius };
  });
}

/**
 * Place ranked neighbors on a compact golden-angle spiral. Rank controls
 * distance, while angular distribution avoids nodes stacking along one ray.
 */
export function positionFocusNeighbors(
  neighbors: RankedNeighbor[],
  center: { x: number; y: number }
): FocusPosition[] {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  return neighbors.map((neighbor, index) => {
    const angle = index * goldenAngle - Math.PI / 2;
    return {
      ...neighbor,
      x: center.x + neighbor.radius * Math.cos(angle),
      y: center.y + neighbor.radius * Math.sin(angle),
    };
  });
}
