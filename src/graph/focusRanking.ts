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
  minRadius = 130,
  gapPerRank = 60
): RankedNeighbor[] {
  const sorted = Array.from(totals, ([neighborId, value]) => ({ neighborId, value }))
    .sort((a, b) => b.value - a.value || a.neighborId.localeCompare(b.neighborId));

  let previousValue: number | undefined;
  let radius = minRadius;

  return sorted.map((neighbor) => {
    if (previousValue !== undefined && neighbor.value < previousValue) {
      radius += gapPerRank;
    }
    previousValue = neighbor.value;
    return { ...neighbor, radius };
  });
}
