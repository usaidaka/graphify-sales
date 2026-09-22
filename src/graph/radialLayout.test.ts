import { describe, expect, it } from 'vitest';
import {
  hasVisualCollisions,
  layoutRadialLevels,
  uniformCircularNodeDiameter,
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
  it('uses one readable circle diameter based on the longest visible company name', () => {
    expect(uniformCircularNodeDiameter([
      'CV GBA',
      'CV SOLUSI ARYA PRIMA',
      'PT DD(BU)PDTKP',
    ])).toBe(108);
    expect(uniformCircularNodeDiameter(['PT LJ', 'CV GBA'])).toBe(72);
  });

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

  it('keeps sparse sibling gaps proportional instead of filling the sector', () => {
    const nodes = Array.from({ length: 3 }, (_, index) => node(
      `sibling-${index}`,
      1,
      20,
      20,
      index * 0.01,
    ));
    const result = layoutRadialLevels({
      center,
      nodes,
      branchAngles: new Map([['branch-a', 0]]),
      sectorAngle: Math.PI / 2,
      collisionPadding: 0,
      siblingGap: 8,
    });
    const angles = nodes.map(({ id }) => {
      const position = result.positions.get(id)!;
      return Math.atan2(position.y, position.x);
    });

    expect(Math.max(...angles) - Math.min(...angles)).toBeGreaterThan(0.3);
    expect(Math.max(...angles) - Math.min(...angles)).toBeLessThan(0.75);
    expect(hasVisualCollisions(nodes, result.positions, 0)).toBe(false);
  });

  it('keeps similar physical sibling spacing when the hierarchy radius grows', () => {
    const nodes = [node('left', 1, 72, 72), node('right', 1, 72, 72)];
    const layout = (minimumFirstRadius: number) => layoutRadialLevels({
      center,
      nodes,
      branchAngles: new Map([['branch-a', 0]]),
      sectorAngle: Math.PI / 2,
      minimumFirstRadius,
      collisionPadding: 12,
      siblingGap: 16,
    });
    const siblingDistance = (minimumFirstRadius: number) => {
      const positions = layout(minimumFirstRadius).positions;
      const left = positions.get('left')!;
      const right = positions.get('right')!;
      return Math.hypot(right.x - left.x, right.y - left.y);
    };

    expect(siblingDistance(500)).toBeCloseTo(siblingDistance(150), -1);
  });

  it('tightens an overview while preserving level order and label clearance', () => {
    const branches = ['a', 'b', 'c'];
    const nodes: RadialLayoutNode[] = branches.flatMap((branchId, branchIndex) => [
      { ...node(`${branchId}-hub`, 1, 70, 38), branchId },
      { ...node(`${branchId}-middle`, 2, 90, 38), branchId },
      ...Array.from({ length: 5 }, (_, index) => ({
        ...node(`${branchId}-leaf-${index}`, 3, 90, 38),
        branchId,
        preferredAngle: branchIndex * 2 * Math.PI / 3,
      })),
    ]);
    const branchAngles = new Map(branches.map((branch, index) => [
      branch,
      index * 2 * Math.PI / 3,
    ]));
    const regular = layoutRadialLevels({ center, nodes, branchAngles });
    const tighter = layoutRadialLevels({
      center,
      nodes,
      branchAngles,
      minimumFirstRadius: 120,
      collisionPadding: 12,
      siblingGap: 16,
      levelGap: 52,
    });

    expect(tighter.radiusByLevel.get(3)!).toBeLessThan(regular.radiusByLevel.get(3)!);
    expect(tighter.radiusByLevel.get(1)!).toBeLessThan(tighter.radiusByLevel.get(2)!);
    expect(tighter.radiusByLevel.get(2)!).toBeLessThan(tighter.radiusByLevel.get(3)!);
    expect(hasVisualCollisions(nodes, tighter.positions, 12)).toBe(false);
  });
});
