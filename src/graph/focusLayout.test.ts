import { describe, expect, it } from 'vitest';
import { placeFocusSupplements, upstreamFocusClearance } from './focusLayout';

const center = { x: 0, y: 0 };
const anchor = { x: 240, y: 0 };
const radius = (position: { x: number; y: number }) => Math.hypot(position.x, position.y);

describe('placeFocusSupplements', () => {
  it('gives two suppliers readable space before a first-tier node without a large shift', () => {
    const incoming = [
      { id: 'supplier', direction: 'incoming' as const, outside: false, width: 70, height: 38 },
      { id: 'supplier-group', direction: 'incoming' as const, outside: false, width: 56, height: 56 },
    ];
    const clearance = upstreamFocusClearance(
      { width: 70, height: 38 },
      incoming,
      Math.PI / 2
    );
    const firstTierRadius = 136;
    const shiftedAnchor = { x: Math.max(firstTierRadius, clearance.minimumAnchorRadius), y: 0 };
    const positions = placeFocusSupplements(
      center,
      shiftedAnchor,
      incoming,
      360,
      300,
      Math.PI / 2,
      clearance.gap
    );
    const first = positions.get('supplier')!;
    const second = positions.get('supplier-group')!;

    expect(shiftedAnchor.x - firstTierRadius).toBeLessThan(100);
    expect(shiftedAnchor.x).toBeGreaterThanOrEqual(210);
    expect(radius(first)).toBeGreaterThanOrEqual(100);
    expect(shiftedAnchor.x - radius(first)).toBeGreaterThanOrEqual(clearance.gap - 0.01);
    expect(Math.hypot(first.x - second.x, first.y - second.y)).toBeGreaterThanOrEqual(100);
  });

  it('keeps revealed neighbors close to the clicked ray and in transaction order', () => {
    const positions = placeFocusSupplements(center, anchor, [
      { id: 'supplier-a', direction: 'incoming', outside: false, width: 70, height: 38 },
      { id: 'supplier-b', direction: 'incoming', outside: false, width: 70, height: 38 },
      { id: 'customer', direction: 'outgoing', outside: false, width: 70, height: 38 },
      { id: 'external', direction: 'outgoing', outside: true, width: 70, height: 38 },
    ], 360, 300, Math.PI / 2);

    expect(positions.has('anchor')).toBe(false);
    expect(radius(positions.get('supplier-a')!)).toBeLessThan(radius(anchor));
    expect(radius(positions.get('supplier-b')!)).toBeLessThan(radius(anchor));
    expect(radius(positions.get('customer')!)).toBeGreaterThan(radius(anchor));
    expect(radius(positions.get('external')!)).toBeGreaterThan(360);
    expect(Math.sign(positions.get('supplier-a')!.y)).toBe(-1);
    expect(Math.sign(positions.get('supplier-b')!.y)).toBe(1);
    expect([...positions.values()].every(({ x, y }) => Math.abs(Math.atan2(y, x)) < 0.5))
      .toBe(true);
  });

  it('places BCA after the deepest existing internal node without moving the anchor', () => {
    const positions = placeFocusSupplements(center, anchor, [
      {
        id: 'bca',
        direction: 'outgoing',
        outside: false,
        terminalInside: true,
        width: 70,
        height: 38,
      },
    ], 390, 420, Math.PI / 2);

    expect(radius(positions.get('bca')!)).toBeGreaterThan(420);
    expect(positions.get('bca')!.y).toBeCloseTo(0);
  });
});
