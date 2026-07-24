import { describe, expect, it } from 'vitest';
import {
  aggregateNeighborMetrics,
  DEFAULT_FOCUS_SORT_METRIC,
  isFocusSortVisible,
  metricValue,
  rankNeighborRadii,
} from './focusRanking';

const edges = [
  { source: 'focus', target: 'a', totalDPP: 500, invoiceCount: 2 },
  { source: 'a', target: 'focus', totalDPP: 250, invoiceCount: 3 },
  { source: 'focus', target: 'b', totalDPP: 400, invoiceCount: 8 },
  { source: 'focus', target: 'c', totalDPP: 400, invoiceCount: 8 },
];

describe('Focus Mode metric state', () => {
  it('defaults to total omzet and reads the selected metric', () => {
    expect(DEFAULT_FOCUS_SORT_METRIC).toBe('total-omzet');
    expect(metricValue(edges[0], 'total-omzet')).toBe(500);
    expect(metricValue(edges[0], 'invoice-count')).toBe(2);
  });

  it('shows the sorting control only for an active focus', () => {
    expect(isFocusSortVisible(null)).toBe(false);
    expect(isFocusSortVisible('company-a')).toBe(true);
  });
});

describe('Focus Mode neighbor ranking', () => {
  it('aggregates all active relationships per neighbor using the selected metric', () => {
    expect(aggregateNeighborMetrics('focus', edges, 'total-omzet')).toEqual(
      new Map([
        ['a', 750],
        ['b', 400],
        ['c', 400],
      ])
    );

    expect(aggregateNeighborMetrics('focus', edges, 'invoice-count')).toEqual(
      new Map([
        ['a', 5],
        ['b', 8],
        ['c', 8],
      ])
    );
  });

  it('sorts descending and assigns equal values to the same radius', () => {
    const totals = aggregateNeighborMetrics('focus', edges, 'invoice-count');

    expect(rankNeighborRadii(totals)).toEqual([
      { neighborId: 'b', value: 8, radius: 130 },
      { neighborId: 'c', value: 8, radius: 130 },
      { neighborId: 'a', value: 5, radius: 190 },
    ]);
  });
});
