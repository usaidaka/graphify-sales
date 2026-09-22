export interface Point {
  x: number;
  y: number;
}

export interface VisualSize {
  width: number;
  height: number;
}

export interface RadialLayoutNode extends VisualSize {
  id: string;
  branchId: string;
  level: number;
  preferredAngle: number;
}

export interface RadialLayoutInput {
  center: Point;
  nodes: RadialLayoutNode[];
  branchAngles: ReadonlyMap<string, number>;
  sectorAngle?: number;
  minimumFirstRadius?: number;
  collisionPadding?: number;
  siblingGap?: number;
  levelGap?: number;
}

export interface RadialLayoutResult {
  positions: Map<string, Point>;
  radiusByLevel: Map<number, number>;
}

export const RADIAL_LAYOUT_CONFIG = {
  collisionPadding: 28,
  siblingGap: 34,
  levelGap: 82,
  minimumFirstRadius: 150,
  maximumLabelWidth: 160,
  labelHorizontalPadding: 20,
  focusLevelGap: 118,
  edgeEndpointGap: 5,
  badgeOffset: 14,
} as const;

const OVERVIEW_NODE_MIN_DIAMETER = 72;
const OVERVIEW_NODE_MAX_DIAMETER = 108;
const OVERVIEW_LABEL_HORIZONTAL_PADDING = 24;
const OVERVIEW_LABEL_CHARACTER_WIDTH = 8;

/** Choose one readable circle diameter from the longest visible company name. */
export function uniformCircularNodeDiameter(labels: Iterable<string>): number {
  let requiredDiameter = OVERVIEW_NODE_MIN_DIAMETER;
  for (const rawLabel of labels) {
    const label = rawLabel.trim().replace(/\s+/g, ' ');
    if (!label) continue;
    const longestWordLength = Math.max(...label.split(' ').map((word) => word.length));
    const balancedLineLength = Math.ceil(label.length / 2);
    const lineLength = Math.max(longestWordLength, balancedLineLength);
    requiredDiameter = Math.max(
      requiredDiameter,
      lineLength * OVERVIEW_LABEL_CHARACTER_WIDTH + OVERVIEW_LABEL_HORIZONTAL_PADDING
    );
  }
  return Math.min(
    OVERVIEW_NODE_MAX_DIAMETER,
    Math.ceil(requiredDiameter / 4) * 4
  );
}

const EPSILON = 0.01;

export function visualSize(
  bodyWidth: number,
  bodyHeight: number,
  label = ''
): VisualSize {
  const labelWidth = Math.min(
    RADIAL_LAYOUT_CONFIG.maximumLabelWidth,
    label.trim().length * 8 + RADIAL_LAYOUT_CONFIG.labelHorizontalPadding
  );
  return {
    width: Math.max(bodyWidth, labelWidth),
    height: Math.max(bodyHeight, label ? 20 : 0),
  };
}

function overlaps(
  first: RadialLayoutNode,
  firstPosition: Point,
  second: RadialLayoutNode,
  secondPosition: Point,
  padding: number = RADIAL_LAYOUT_CONFIG.collisionPadding
): boolean {
  return Math.abs(firstPosition.x - secondPosition.x) + EPSILON
      < (first.width + second.width) / 2 + padding
    && Math.abs(firstPosition.y - secondPosition.y) + EPSILON
      < (first.height + second.height) / 2 + padding;
}

export function hasVisualCollisions(
  nodes: RadialLayoutNode[],
  positions: ReadonlyMap<string, Point>,
  padding: number = RADIAL_LAYOUT_CONFIG.collisionPadding
): boolean {
  for (let firstIndex = 0; firstIndex < nodes.length; firstIndex += 1) {
    const firstPosition = positions.get(nodes[firstIndex].id);
    if (!firstPosition) continue;
    for (let secondIndex = firstIndex + 1; secondIndex < nodes.length; secondIndex += 1) {
      const secondPosition = positions.get(nodes[secondIndex].id);
      if (
        secondPosition
        && overlaps(
          nodes[firstIndex],
          firstPosition,
          nodes[secondIndex],
          secondPosition,
          padding
        )
      ) return true;
    }
  }
  return false;
}

function halfDepth(node: VisualSize): number {
  // The half diagonal is conservative for every angle and every node shape.
  return Math.hypot(node.width, node.height) / 2;
}

function buildPositions(
  input: RadialLayoutInput,
  radiusByLevel: ReadonlyMap<number, number>,
  sectorAngle: number
): Map<string, Point> {
  const positions = new Map<string, Point>();
  const groups = new Map<string, RadialLayoutNode[]>();
  input.nodes.forEach((node) => {
    const key = `${node.branchId}:${node.level}`;
    const group = groups.get(key) ?? [];
    group.push(node);
    groups.set(key, group);
  });

  groups.forEach((nodes) => {
    nodes.sort((a, b) => a.preferredAngle - b.preferredAngle || a.id.localeCompare(b.id));
    const radius = radiusByLevel.get(nodes[0].level) ?? input.minimumFirstRadius
      ?? RADIAL_LAYOUT_CONFIG.minimumFirstRadius;
    const footprints = nodes.map((node) => (
      halfDepth(node) * 2 + (input.collisionPadding ?? RADIAL_LAYOUT_CONFIG.collisionPadding)
    ));
    const totalArc = footprints.reduce((sum, value) => sum + value, 0)
      + (input.siblingGap ?? RADIAL_LAYOUT_CONFIG.siblingGap) * Math.max(0, nodes.length - 1);
    const branchAngle = input.branchAngles.get(nodes[0].branchId)
      ?? nodes.reduce((sum, node) => sum + node.preferredAngle, 0) / nodes.length;
    const maximumArc = radius * sectorAngle;
    const scale = totalArc > maximumArc ? maximumArc / totalArc : 1;
    const scaledFootprints = footprints.map((footprint) => footprint * scale);
    const occupiedByNodes = scaledFootprints.reduce((sum, footprint) => sum + footprint, 0);
    // Keep the physical gap proportional to node size. Filling a mostly empty
    // sector makes the same sibling group drift farther apart on larger rings.
    const targetArc = totalArc * scale;
    const distributedGap = nodes.length > 1
      ? Math.max(0, (targetArc - occupiedByNodes) / (nodes.length - 1))
      : 0;
    let cursor = -targetArc / 2;

    nodes.forEach((node, index) => {
      const footprint = scaledFootprints[index];
      cursor += footprint / 2;
      const angle = branchAngle + cursor / Math.max(1, radius);
      positions.set(node.id, {
        x: input.center.x + radius * Math.cos(angle),
        y: input.center.y + radius * Math.sin(angle),
      });
      cursor += footprint / 2 + distributedGap;
    });
  });
  return positions;
}

function firstCollision(
  nodes: RadialLayoutNode[],
  positions: ReadonlyMap<string, Point>,
  padding: number
): [RadialLayoutNode, RadialLayoutNode] | null {
  for (let firstIndex = 0; firstIndex < nodes.length; firstIndex += 1) {
    const firstPosition = positions.get(nodes[firstIndex].id);
    if (!firstPosition) continue;
    for (let secondIndex = firstIndex + 1; secondIndex < nodes.length; secondIndex += 1) {
      const secondPosition = positions.get(nodes[secondIndex].id);
      if (
        secondPosition
        && overlaps(nodes[firstIndex], firstPosition, nodes[secondIndex], secondPosition, padding)
      ) return [nodes[firstIndex], nodes[secondIndex]];
    }
  }
  return null;
}

/**
 * Size-aware radial layout. It never changes a node's hierarchy level; it may
 * only widen a level radius and redistribute siblings inside their branch arc.
 */
export function layoutRadialLevels(input: RadialLayoutInput): RadialLayoutResult {
  const collisionPadding = input.collisionPadding ?? RADIAL_LAYOUT_CONFIG.collisionPadding;
  const siblingGap = input.siblingGap ?? RADIAL_LAYOUT_CONFIG.siblingGap;
  const levelGap = input.levelGap ?? RADIAL_LAYOUT_CONFIG.levelGap;
  const levels = [...new Set(input.nodes.map(({ level }) => level))].sort((a, b) => a - b);
  const branchCount = Math.max(1, input.branchAngles.size);
  const sectorAngle = Math.max(0.25, Math.min(
    Math.PI * 0.9,
    input.sectorAngle ?? (2 * Math.PI / branchCount) * 0.74
  ));
  const radiusByLevel = new Map<number, number>();
  let previousLevel = 0;
  let previousRadius = 0;
  let previousDepth = 36;

  levels.forEach((level) => {
    const levelNodes = input.nodes.filter((node) => node.level === level);
    const levelDepth = Math.max(...levelNodes.map(halfDepth));
    const radiusNeededByBranch = Math.max(...[...new Set(
      levelNodes.map(({ branchId }) => branchId)
    )].map((branchId) => {
      const branchNodes = levelNodes.filter((node) => node.branchId === branchId);
      const requiredArc = branchNodes.reduce(
        (sum, node) => sum + halfDepth(node) * 2
          + collisionPadding,
        siblingGap * Math.max(0, branchNodes.length - 1)
      );
      return requiredArc / sectorAngle;
    }));
    const skippedLevels = Math.max(1, level - previousLevel);
    const radialSeparation = previousRadius + previousDepth + levelDepth
      + levelGap * skippedLevels;
    const legacySpacing = level * (input.minimumFirstRadius
      ?? RADIAL_LAYOUT_CONFIG.minimumFirstRadius);
    const radius = Math.max(radialSeparation, legacySpacing, radiusNeededByBranch);
    radiusByLevel.set(level, radius);
    previousLevel = level;
    previousRadius = radius;
    previousDepth = levelDepth;
  });

  let positions = buildPositions(input, radiusByLevel, sectorAngle);
  for (let iteration = 0; iteration < 80; iteration += 1) {
    const collision = firstCollision(input.nodes, positions, collisionPadding);
    if (!collision) break;
    const affectedLevel = Math.max(collision[0].level, collision[1].level);
    const affectedIndex = levels.indexOf(affectedLevel);
    for (let index = affectedIndex; index < levels.length; index += 1) {
      const level = levels[index];
      const current = radiusByLevel.get(level) ?? 0;
      radiusByLevel.set(level, current + Math.max(16, current * 0.06));
    }
    positions = buildPositions(input, radiusByLevel, sectorAngle);
  }

  return { positions, radiusByLevel };
}

export function radiusAt(position: Point, center: Point): number {
  return Math.hypot(position.x - center.x, position.y - center.y);
}
