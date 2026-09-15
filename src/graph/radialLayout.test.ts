import { describe, expect, it } from 'vitest';
import {
  hasVisualCollisions,
  layoutRadialLevels,
  type RadialLayoutNode,
} from './radialLayout';

const center = { x: 0, y: 0 };

function node(
  id: string,
  level: number,
  width = 44,
  height = 44,
  preferredAngle = 0,
): RadialLayoutNode {
  return { id, branchId: 'branch-a', level, width, height, preferredAngle };
}

describe('layoutRadialLevels', () => {
  it('keeps an incoming aggregate, selected company, and outgoing aggregate on separate levels', () => {
    const nodes = [
      node('3-incoming', 1, 52, 52),
      node('selected', 2, 58, 44),
      node('4-outgoing', 3, 52, 52),
    ];
    const result = layoutRadialLevels({
      center,
      nodes,
      branchAngles: new Map([['branch-a', 0]]),
    });
    const radius = (id: string) => {
      const position = result.positions.get(id)!;
      return Math.hypot(position.x, position.y);
    };

    expect(radius('3-incoming')).toBeLessThan(radius('selected'));
    expect(radius('selected')).toBeLessThan(radius('4-outgoing'));
    expect(hasVisualCollisions(nodes, result.positions)).toBe(false);
  });

  it.each([1, 3, 5, 12])('separates %i mixed-size nodes on one level', (count) => {
    const nodes = Array.from({ length: count }, (_, index) => node(
      `child-${index}`,
      2,
      index % 3 === 0 ? 92 : 44,
      index % 3 === 0 ? 52 : 44,
      -0.25 + index * 0.04,
    ));
    const result = layoutRadialLevels({
      center,
      nodes,
      branchAngles: new Map([['branch-a', Math.PI / 4]]),
      sectorAngle: Math.PI / 2,
    });

    expect(hasVisualCollisions(nodes, result.positions)).toBe(false);
  });

  it('grows later radii for large labels without changing hierarchy levels', () => {
    const nodes = [
      node('level-1', 1, 132, 46),
      node('level-3', 3, 132, 46),
    ];
    const result = layoutRadialLevels({
      center,
      nodes,
      branchAngles: new Map([['branch-a', -Math.PI / 3]]),
    });

    expect(result.radiusByLevel.get(3)!).toBeGreaterThan(result.radiusByLevel.get(1)!);
    expect(hasVisualCollisions(nodes, result.positions)).toBe(false);
  });
});
