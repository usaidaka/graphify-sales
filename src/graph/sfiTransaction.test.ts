import { describe, expect, it } from 'vitest'

import { buildSfiCytoscapeElements } from './builder'
import { hasVisualCollisions } from './radialLayout'
import {
  calculateSfiPositions,
  createSfiTransactionOverview,
  SFI_INTERNAL_BOUNDARY_MIN_RADIUS,
  SFI_INTERNAL_BOUNDARY_PADDING,
  type SfiTransactionOverview,
  type TransactionView,
  type VisualBranchKey,
} from './sfiTransaction'
import type { EdgeData, NodeData, NormalizedGraph } from './types'

const nodes: NodeData[] = [
  { id: 'sfi', companyName: 'PT SFI', nodeType: 'external' },
  { id: 'ldn', companyName: 'PT LDN', nodeType: 'internal' },
  { id: 'gba', companyName: 'CV GBA', nodeType: 'internal' },
  { id: 'msp', companyName: 'PT MSP', nodeType: 'internal' },
  { id: 'lj', companyName: 'PT LJ', nodeType: 'internal' },
  { id: 'x', companyName: 'Company X', nodeType: 'external' },
  { id: 'a', companyName: 'Company A', nodeType: 'external' },
  { id: 'b', companyName: 'Company B', nodeType: 'external' },
]

function edge(id: string, source: string, target: string, value: number): EdgeData {
  return {
    id,
    source,
    target,
    invoiceCount: 1,
    totalDPP: value,
    totalPPN: value * 0.11,
    datasets: [],
    approvalStatus: [],
    statuses: [],
    periods: [],
  }
}

function graph(edges: EdgeData[]): NormalizedGraph {
  return { nodes, edges }
}

function overview(edges: EdgeData[], view: TransactionView = 'sales') {
  return createSfiTransactionOverview(graph(edges), view)
}

function overviewWithInternalX(edges: EdgeData[], view: TransactionView = 'sales') {
  return createSfiTransactionOverview({
    nodes: nodes.map((node) => node.id === 'x' ? { ...node, nodeType: 'internal' } : node),
    edges,
  }, view)
}

function instancesFor(
  result: SfiTransactionOverview,
  canonicalCompanyId: string,
  branch?: VisualBranchKey,
) {
  return result.nodeInstances.filter(
    (instance) =>
      instance.canonicalCompanyId === canonicalCompanyId &&
      (branch === undefined || instance.branch === branch),
  )
}

function distance(
  positions: Map<string, { x: number; y: number }>,
  from: string,
  to: string,
) {
  const start = positions.get(from)
  const end = positions.get(to)
  expect(start).toBeDefined()
  expect(end).toBeDefined()
  return Math.hypot(end!.x - start!.x, end!.y - start!.y)
}

function segmentsCross(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
) {
  const orientation = (
    p: { x: number; y: number },
    q: { x: number; y: number },
    r: { x: number; y: number },
  ) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)

  const abC = orientation(a, b, c)
  const abD = orientation(a, b, d)
  const cdA = orientation(c, d, a)
  const cdB = orientation(c, d, b)
  return abC * abD < 0 && cdA * cdB < 0
}

describe('buildSfiTransactionOverview', () => {
  it('resolves SFI from company identity rather than node type', () => {
    const result = overview([edge('sfi-x', 'sfi', 'x', 100)])

    expect(result.sfiId).toBe('sfi')
    expect(result.nodeInstances.find(({ id }) => id === result.sfiInstanceId)?.canonicalCompanyId).toBe('sfi')
  })

  it('keeps direct SFI transactions parallel to principal hierarchies', () => {
    const result = overview([
      edge('sfi-x', 'sfi', 'x', 200),
      edge('sfi-ldn', 'sfi', 'ldn', 100),
      edge('ldn-a', 'ldn', 'a', 80),
      edge('a-b', 'a', 'b', 60),
    ])

    expect(instancesFor(result, 'x')).toHaveLength(1)
    expect(instancesFor(result, 'ldn', 'LDN')).toHaveLength(1)
    expect(instancesFor(result, 'a', 'LDN')[0]?.level).toBe(2)
    expect(instancesFor(result, 'b', 'LDN')[0]?.level).toBe(3)
    expect(result.canonicalVisibleEdgeIds).toEqual(
      new Set(['sfi-x', 'sfi-ldn', 'ldn-a', 'a-b']),
    )
  })

  it('reverses traversal direction for purchases', () => {
    const result = overview(
      [edge('a-ldn', 'a', 'ldn', 80), edge('ldn-sfi', 'ldn', 'sfi', 100)],
      'purchases',
    )

    expect(instancesFor(result, 'ldn', 'LDN')[0]?.level).toBe(1)
    expect(instancesFor(result, 'a', 'LDN')[0]?.level).toBe(2)
    expect(result.canonicalVisibleEdgeIds).toEqual(new Set(['a-ldn', 'ldn-sfi']))
  })

  it('pushes a shared child outward when one sibling supplies the other', () => {
    const data: NormalizedGraph = {
      nodes: [
        ...nodes,
        { id: 'slis', companyName: 'CV SLIS', nodeType: 'internal' },
        { id: 'ikb', companyName: 'CV IKB', nodeType: 'internal' },
      ],
      edges: [
        edge('sfi-slis', 'sfi', 'slis', 100),
        edge('slis-ikb', 'slis', 'ikb', 90),
        edge('slis-lj', 'slis', 'lj', 80),
        edge('ikb-lj', 'ikb', 'lj', 70),
      ],
    }
    const result = createSfiTransactionOverview(data, 'sales')
    const slisBranch = result.branchSlots.find(({ hubNodeId }) => hubNodeId === 'slis')!.principal
    const ikb = instancesFor(result, 'ikb', slisBranch)[0]
    const lj = instancesFor(result, 'lj', slisBranch)[0]

    expect(ikb.level).toBe(2)
    expect(lj.level).toBe(3)
    expect(result.parentByNode.get(lj.id)).toBe(ikb.id)
  })

  it('keeps a direct principal branch while placing its occurrence downstream elsewhere', () => {
    const result = overview([
      edge('sfi-a', 'sfi', 'a', 100),
      edge('sfi-b', 'sfi', 'b', 90),
      edge('a-b', 'a', 'b', 80),
    ])
    const aBranch = result.branchSlots.find(({ hubNodeId }) => hubNodeId === 'a')!.principal
    const bBranch = result.branchSlots.find(({ hubNodeId }) => hubNodeId === 'b')!.principal
    const bUnderA = instancesFor(result, 'b', aBranch)[0]
    const bDirect = instancesFor(result, 'b', bBranch)[0]

    expect(bUnderA.level).toBe(2)
    expect(bDirect.level).toBe(1)
    expect(result.edgeInstances.some(
      ({ canonicalEdgeId, source, target }) =>
        canonicalEdgeId === 'sfi-b'
        && source === result.sfiInstanceId
        && target === bDirect.id,
    )).toBe(true)
  })

  it('keeps siblings at the same level when neither supplies the other', () => {
    const data: NormalizedGraph = {
      nodes: [
        ...nodes,
        { id: 'slis', companyName: 'CV SLIS', nodeType: 'internal' },
        { id: 'ikb', companyName: 'CV IKB', nodeType: 'internal' },
      ],
      edges: [
        edge('sfi-slis', 'sfi', 'slis', 100),
        edge('slis-ikb', 'slis', 'ikb', 90),
        edge('slis-lj', 'slis', 'lj', 80),
      ],
    }
    const result = createSfiTransactionOverview(data, 'sales')
    const branch = result.branchSlots.find(({ hubNodeId }) => hubNodeId === 'slis')!.principal

    expect(instancesFor(result, 'ikb', branch)[0].level).toBe(2)
    expect(instancesFor(result, 'lj', branch)[0].level).toBe(2)
  })

  it('keeps a real parent edge when inferred hierarchy creates a skipped level', () => {
    const data: NormalizedGraph = {
      nodes: [
        nodes[0],
        nodes[1],
        { id: 'lj', companyName: 'PT LJ', nodeType: 'internal' },
        { id: 'kut', companyName: 'CV KUT', nodeType: 'internal' },
        { id: 'sai', companyName: 'PT SAI', nodeType: 'internal' },
        { id: 'bca', companyName: 'CV BCA', nodeType: 'special-external' },
      ],
      edges: [
        edge('sfi-ldn', 'sfi', 'ldn', 100),
        edge('ldn-lj', 'ldn', 'lj', 90),
        edge('lj-kut', 'lj', 'kut', 80),
        edge('lj-sai', 'lj', 'sai', 70),
        edge('lj-bca', 'lj', 'bca', 60),
        edge('kut-bca', 'kut', 'bca', 50),
      ],
    }
    const result = createSfiTransactionOverview(data, 'sales')
    const lj = instancesFor(result, 'lj', 'LDN')[0]
    const sai = instancesFor(result, 'sai', 'LDN')[0]

    expect(result.levelByNode.get(sai.id)).toBe((result.levelByNode.get(lj.id) ?? 0) + 2)
    expect(result.parentByNode.get(sai.id)).toBe(lj.id)
    expect(instancesFor(result, 'sai')).toEqual([sai])
    expect(result.edgeInstances.some((instance) =>
      instance.canonicalEdgeId === 'lj-sai'
      && instance.source === lj.id
      && instance.target === sai.id
    )).toBe(true)
  })

  it('applies effective downstream depth in the purchases view', () => {
    const data: NormalizedGraph = {
      nodes: [
        ...nodes,
        { id: 'slis', companyName: 'CV SLIS', nodeType: 'internal' },
        { id: 'ikb', companyName: 'CV IKB', nodeType: 'internal' },
      ],
      edges: [
        edge('slis-sfi', 'slis', 'sfi', 100),
        edge('ikb-slis', 'ikb', 'slis', 90),
        edge('lj-slis', 'lj', 'slis', 80),
        edge('lj-ikb', 'lj', 'ikb', 70),
      ],
    }
    const result = createSfiTransactionOverview(data, 'purchases')
    const branch = result.branchSlots.find(({ hubNodeId }) => hubNodeId === 'slis')!.principal

    expect(instancesFor(result, 'ikb', branch)[0].level).toBe(2)
    expect(instancesFor(result, 'lj', branch)[0].level).toBe(3)
  })

  it('creates a principal branch for every direct SFI counterpart', () => {
    const result = overview([
      edge('sfi-x', 'sfi', 'x', 400),
      edge('sfi-ldn', 'sfi', 'ldn', 300),
      edge('sfi-a', 'sfi', 'a', 200),
      edge('sfi-b', 'sfi', 'b', 100),
    ])

    expect(result.branchSlots.map((slot) => slot.hubNodeId)).toEqual(['ldn', 'x', 'a', 'b'])
    expect(result.branchSlots.map((slot) => slot.isReplacement)).toEqual([false, false, false, false])
  })

  it('creates only the principal branches present in direct SFI data', () => {
    const result = overview([edge('sfi-ldn', 'sfi', 'ldn', 100)])

    expect(result.branchSlots.map((slot) => slot.hubNodeId)).toEqual(['ldn'])
    expect(result.canonicalVisibleNodeIds).toEqual(new Set(['sfi', 'ldn']))
  })

  it('stops cycles independently inside each branch', () => {
    const result = overview([
      edge('sfi-ldn', 'sfi', 'ldn', 100),
      edge('ldn-a', 'ldn', 'a', 80),
      edge('a-ldn', 'a', 'ldn', 60),
    ])

    expect(instancesFor(result, 'ldn', 'LDN')).toHaveLength(1)
    expect(instancesFor(result, 'a', 'LDN')).toHaveLength(1)
  })

  it('places a larger internal direct counterpart closer than an official principal', () => {
    const result = overviewWithInternalX([
      edge('sfi-x', 'sfi', 'x', 200),
      edge('sfi-ldn', 'sfi', 'ldn', 100),
    ])
    const positions = calculateSfiPositions(result, 'value', 1200, 800)
    const x = instancesFor(result, 'x')[0]
    const ldn = instancesFor(result, 'ldn')[0]

    expect(result.valueRankByNode.get(x.id)).toBe(1)
    expect(result.valueRankByNode.get(ldn.id)).toBe(2)
    expect(distance(positions, result.sfiInstanceId!, x.id)).toBeLessThan(
      distance(positions, result.sfiInstanceId!, ldn.id),
    )
  })

  it('gives equal sibling values the same dense rank', () => {
    const result = overview([
      edge('sfi-x', 'sfi', 'x', 100),
      edge('sfi-ldn', 'sfi', 'ldn', 100),
    ])
    const x = instancesFor(result, 'x')[0]
    const ldn = instancesFor(result, 'ldn')[0]

    expect(result.valueRankByNode.get(x.id)).toBe(1)
    expect(result.valueRankByNode.get(ldn.id)).toBe(1)
  })

  it('uses hierarchy level alone for nodes in the same boundary group', () => {
    const result = overviewWithInternalX([
      edge('sfi-x', 'sfi', 'x', 200),
      edge('sfi-ldn', 'sfi', 'ldn', 100),
    ])
    const positions = calculateSfiPositions(result, 'hierarchy', 1200, 800)
    const x = instancesFor(result, 'x')[0]
    const ldn = instancesFor(result, 'ldn')[0]

    expect(distance(positions, result.sfiInstanceId!, x.id)).toBeCloseTo(
      distance(positions, result.sfiInstanceId!, ldn.id),
    )
  })

  it('orders nodes using non-tree relationships when that avoids an edge crossing', () => {
    const data: NormalizedGraph = {
      nodes: [
        ...nodes,
        { id: 'y', companyName: 'Company Y', nodeType: 'external' },
      ],
      edges: [
        edge('sfi-ldn', 'sfi', 'ldn', 100),
        edge('ldn-a', 'ldn', 'a', 100),
        edge('ldn-b', 'ldn', 'b', 90),
        edge('b-x', 'b', 'x', 100),
        edge('b-y', 'b', 'y', 90),
        edge('a-y', 'a', 'y', 80),
      ],
    }
    const result = createSfiTransactionOverview(data, 'sales')
    const positions = calculateSfiPositions(result, 'hierarchy', 1200, 800)
    const edgeByCanonicalId = new Map(
      result.edgeInstances.map((instance) => [instance.canonicalEdgeId, instance]),
    )
    const diagonal = edgeByCanonicalId.get('a-y')!
    const opposing = edgeByCanonicalId.get('b-x')!

    expect(segmentsCross(
      positions.get(diagonal.source)!,
      positions.get(diagonal.target)!,
      positions.get(opposing.source)!,
      positions.get(opposing.target)!,
    )).toBe(false)
  })

  it('creates one visual instance in every principal path that reaches a company', () => {
    const result = overview([
      edge('sfi-gba', 'sfi', 'gba', 400),
      edge('sfi-ldn', 'sfi', 'ldn', 300),
      edge('sfi-msp', 'sfi', 'msp', 200),
      edge('sfi-lj', 'sfi', 'lj', 100),
      edge('gba-x', 'gba', 'x', 40),
      edge('ldn-x', 'ldn', 'x', 30),
      edge('msp-x', 'msp', 'x', 20),
      edge('lj-x', 'lj', 'x', 10),
    ])

    expect(instancesFor(result, 'x').map((instance) => instance.branch)).toEqual([
      'LDN',
      'LJ',
      'MSP',
      'GBA',
    ])
    expect(result.canonicalVisibleNodeIds.has('x')).toBe(true)
    expect(result.canonicalVisibleNodeIds.size).toBe(6)
  })

  it('deduplicates a company within one branch while retaining all branch edges', () => {
    const result = overview([
      edge('sfi-ldn', 'sfi', 'ldn', 100),
      edge('ldn-a', 'ldn', 'a', 80),
      edge('ldn-b', 'ldn', 'b', 70),
      edge('a-x', 'a', 'x', 60),
      edge('b-x', 'b', 'x', 50),
    ])

    expect(instancesFor(result, 'x', 'LDN')).toHaveLength(1)
    const xEdges = result.edgeInstances.filter(
      (instance) => instance.branch === 'LDN' && ['a-x', 'b-x'].includes(instance.canonicalEdgeId),
    )
    expect(xEdges).toHaveLength(2)
  })

  it('keeps a dynamic direct principal separate from occurrences in four other branches', () => {
    const result = overview([
      edge('sfi-gba', 'sfi', 'gba', 500),
      edge('sfi-ldn', 'sfi', 'ldn', 400),
      edge('sfi-msp', 'sfi', 'msp', 300),
      edge('sfi-lj', 'sfi', 'lj', 200),
      edge('sfi-x', 'sfi', 'x', 100),
      edge('gba-x', 'gba', 'x', 40),
      edge('ldn-x', 'ldn', 'x', 30),
      edge('msp-x', 'msp', 'x', 20),
      edge('lj-x', 'lj', 'x', 10),
    ])

    const xInstances = instancesFor(result, 'x')
    expect(xInstances).toHaveLength(5)
    expect(new Set(xInstances.map((instance) => instance.branch))).toEqual(
      new Set(['GBA', 'LDN', 'MSP', 'LJ', 'COMPANY:x']),
    )
    expect(xInstances.map((instance) => instance.id)).toContain('branch:COMPANY:x:x')
  })
})

describe('calculateSfiPositions', () => {
  it('fans out a converging branch until its transaction lines no longer cross', () => {
    const internal = (id: string): NodeData => ({
      id,
      companyName: id.toUpperCase(),
      nodeType: 'internal',
    })
    const data: NormalizedGraph = {
      nodes: [
        nodes[0],
        ...['root', 'middle', 'left-parent', 'right-parent', 'kut', 'sdja', 'sai']
          .map(internal),
        { id: 'bca', companyName: 'CV BCA', nodeType: 'special-external' },
        { id: 'axi', companyName: 'PT AXI', nodeType: 'external' },
      ],
      edges: [
        edge('sfi-root', 'sfi', 'root', 1_000),
        edge('root-middle', 'root', 'middle', 900),
        edge('middle-left', 'middle', 'left-parent', 800),
        edge('middle-right', 'middle', 'right-parent', 700),
        edge('left-bca', 'left-parent', 'bca', 600),
        edge('right-kut', 'right-parent', 'kut', 550),
        edge('right-sdja', 'right-parent', 'sdja', 500),
        edge('right-bca', 'right-parent', 'bca', 450),
        edge('right-sai', 'right-parent', 'sai', 400),
        edge('kut-bca', 'kut', 'bca', 350),
        edge('sdja-bca', 'sdja', 'bca', 300),
        edge('sai-axi', 'sai', 'axi', 250),
      ],
    }
    const result = createSfiTransactionOverview(data, 'sales')
    const bca = instancesFor(result, 'bca')[0]
    const sai = instancesFor(result, 'sai')[0]
    const axi = instancesFor(result, 'axi')[0]
    const sizes = new Map(result.nodeInstances.map(({ id }) => [
      id,
      { width: 72, height: 72 },
    ]))
    const positions = calculateSfiPositions(result, 'hierarchy', 1920, 1080, {
      nodeSizes: sizes,
      terminalInsideNodeIds: new Set([bca.id]),
    })
    let crossingCount = 0
    for (let firstIndex = 0; firstIndex < result.edgeInstances.length; firstIndex += 1) {
      const first = result.edgeInstances[firstIndex]
      for (let secondIndex = firstIndex + 1; secondIndex < result.edgeInstances.length; secondIndex += 1) {
        const second = result.edgeInstances[secondIndex]
        if ([first.source, first.target].some((id) =>
          id === second.source || id === second.target)) continue
        if (segmentsCross(
          positions.get(first.source)!,
          positions.get(first.target)!,
          positions.get(second.source)!,
          positions.get(second.target)!,
        )) crossingCount += 1
      }
    }

    expect(crossingCount).toBe(0)
    const center = positions.get(result.sfiInstanceId!)!
    const angleFromCenter = (nodeId: string) => {
      const position = positions.get(nodeId)!
      return Math.atan2(position.y - center.y, position.x - center.x)
    }
    expect(Math.abs(Math.atan2(
      Math.sin(angleFromCenter(axi.id) - angleFromCenter(sai.id)),
      Math.cos(angleFromCenter(axi.id) - angleFromCenter(sai.id)),
    ))).toBeLessThan(0.2)
    expect(hasVisualCollisions(result.nodeInstances
      .filter(({ id }) => id !== result.sfiInstanceId)
      .map((instance) => ({
        ...instance,
        branchId: instance.branch,
        preferredAngle: 0,
        width: 72,
        height: 72,
      })), positions, 12)).toBe(false)
  })

  it('places a two-stage branch directly from its hub to BCA as the endpoint', () => {
    const result = createSfiTransactionOverview({
      nodes: [
        nodes[0],
        nodes[1],
        { id: 'bca', companyName: 'CV BCA', nodeType: 'special-external' },
      ],
      edges: [
        edge('sfi-ldn', 'sfi', 'ldn', 100),
        edge('ldn-bca', 'ldn', 'bca', 80),
      ],
    }, 'sales')
    const hub = instancesFor(result, 'ldn')[0]
    const bca = instancesFor(result, 'bca')[0]
    const positions = calculateSfiPositions(result, 'hierarchy', 1200, 800, {
      terminalInsideNodeIds: new Set([bca.id]),
    })

    expect(result.levelByNode.get(hub.id)).toBe(1)
    expect(result.levelByNode.get(bca.id)).toBe(2)
    expect(result.parentByNode.get(bca.id)).toBe(hub.id)
    expect(distance(positions, result.sfiInstanceId!, bca.id))
      .toBeGreaterThan(distance(positions, result.sfiInstanceId!, hub.id))
  })

  it('keeps BCA at the internal end and aligns external endpoints from different depths', () => {
    const data: NormalizedGraph = {
      nodes: [
        ...nodes.map((company) => ['a', 'b'].includes(company.id)
          ? { ...company, nodeType: 'internal' as const }
          : company),
        { id: 'bca', companyName: 'CV BCA', nodeType: 'special-external' },
      ],
      edges: [
        edge('sfi-ldn', 'sfi', 'ldn', 100),
        edge('ldn-a', 'ldn', 'a', 90),
        edge('a-b', 'a', 'b', 80),
        edge('ldn-bca', 'ldn', 'bca', 70),
        edge('a-x', 'a', 'x', 60),
        edge('b-y', 'b', 'y', 50),
      ],
    }
    data.nodes.push({ id: 'y', companyName: 'Company Y', nodeType: 'external' })
    const result = createSfiTransactionOverview(data, 'sales')
    const bca = instancesFor(result, 'bca')[0]
    const a = instancesFor(result, 'a')[0]
    const b = instancesFor(result, 'b')[0]
    const x = instancesFor(result, 'x')[0]
    const y = instancesFor(result, 'y')[0]
    for (const compactHierarchy of [false, true]) {
      const positions = calculateSfiPositions(result, 'hierarchy', 1200, 800, {
        terminalInsideNodeIds: new Set([bca.id]),
        compactHierarchy,
      })
      const radius = (id: string) => distance(positions, result.sfiInstanceId!, id)

      expect(radius(bca.id)).toBeGreaterThan(radius(a.id))
      expect(radius(bca.id)).toBeCloseTo(radius(b.id))
      expect(radius(x.id)).toBeCloseTo(radius(y.id))
      expect(radius(x.id)).toBeGreaterThan(radius(a.id))
      expect(radius(y.id)).toBeGreaterThan(radius(b.id))
    }
  })

  it('keeps dense terminal externals in a short band beyond their parent', () => {
    const children = Array.from({ length: 120 }, (_, index): NodeData => ({
      id: `child-${index}`,
      companyName: `External Company ${index}`,
      nodeType: 'external',
    }))
    const data: NormalizedGraph = {
      nodes: [nodes[0], nodes[1], ...children],
      edges: [
        edge('sfi-ldn', 'sfi', 'ldn', 1_000),
        ...children.map((child, index) => edge(
          `ldn-${child.id}`,
          'ldn',
          child.id,
          900 - index,
        )),
      ],
    }
    const result = createSfiTransactionOverview(data, 'sales')
    const regular = calculateSfiPositions(result, 'hierarchy', 1920, 1080)
    const compact = calculateSfiPositions(result, 'hierarchy', 1920, 1080, {
      compactHierarchy: true,
    })
    const radius = (nodeId: string) => distance(compact, result.sfiInstanceId!, nodeId)
    const terminalRadii = result.nodeInstances
      .filter(({ canonicalCompanyId }) => canonicalCompanyId.startsWith('child-'))
      .map(({ id }) => radius(id))

    const parentRadius = radius(instancesFor(result, 'ldn')[0].id)
    expect(Math.min(...terminalRadii)).toBeGreaterThan(parentRadius)
    expect(Math.max(...terminalRadii)).toBeLessThan(600)
    expect(Math.max(...terminalRadii) - Math.min(...terminalRadii)).toBeLessThan(300)
    expect(radius(instancesFor(result, 'child-0')[0].id))
      .toBeLessThan(distance(regular, result.sfiInstanceId!, instancesFor(result, 'child-0')[0].id))
    expect(hasVisualCollisions(result.nodeInstances.map((instance) => ({
      ...instance,
      branchId: instance.branch,
      preferredAngle: 0,
      width: 52,
      height: 32,
    })), regular, 12)).toBe(false)
  })

  it('draws one WAPU occurrence per seller without multiplying business entities', () => {
    const data: NormalizedGraph = {
      nodes: [
        ...nodes,
        { id: 'seller-a', companyName: 'Seller A', nodeType: 'internal' },
        { id: 'seller-b', companyName: 'Seller B', nodeType: 'internal' },
        { id: 'wapu', companyName: 'WAPU', nodeType: 'wapu' },
      ],
      edges: [
        edge('sfi-ldn', 'sfi', 'ldn', 100),
        edge('ldn-a', 'ldn', 'seller-a', 90),
        edge('ldn-b', 'ldn', 'seller-b', 80),
        edge('a-wapu', 'seller-a', 'wapu', 70),
        edge('b-wapu', 'seller-b', 'wapu', 60),
      ],
    }
    const result = createSfiTransactionOverview(data, 'sales')
    const wapuNodes = instancesFor(result, 'wapu', 'LDN')
    const wapuEdges = result.edgeInstances.filter(({ canonicalEdgeId }) =>
      canonicalEdgeId === 'a-wapu' || canonicalEdgeId === 'b-wapu'
    )

    expect(wapuNodes).toHaveLength(2)
    expect(new Set(wapuEdges.map(({ target }) => target))).toEqual(new Set(wapuNodes.map(({ id }) => id)))
    expect(wapuEdges.every(({ source, target }) =>
      result.parentByNode.get(target) === source
      && result.levelByNode.get(target) === (result.levelByNode.get(source) ?? 0) + 1
    )).toBe(true)
    expect(wapuNodes.every(({ id }) => !result.insideBoundaryNodeIds.has(id))).toBe(true)
    expect(result.canonicalVisibleNodeIds.has('wapu')).toBe(true)
    expect(result.canonicalVisibleEdgeIds.size).toBe(5)
    const positions = calculateSfiPositions(result, 'hierarchy', 1200, 800)
    const deepestInsideRadius = Math.max(...[...result.insideBoundaryNodeIds].map((nodeId) =>
      distance(positions, result.sfiInstanceId!, nodeId)
    ))
    const boundaryRadius = Math.max(
      SFI_INTERNAL_BOUNDARY_MIN_RADIUS,
      deepestInsideRadius + SFI_INTERNAL_BOUNDARY_PADDING
    )
    expect(wapuNodes.every(({ id }) =>
      distance(positions, result.sfiInstanceId!, id) > boundaryRadius
    )).toBe(true)
    expect(wapuEdges.every(({ source, target }) =>
      distance(positions, result.sfiInstanceId!, target)
        > distance(positions, result.sfiInstanceId!, source)
    )).toBe(true)
    expect(hasVisualCollisions(result.nodeInstances.map((instance) => ({
      ...instance,
      branchId: instance.branch,
      preferredAngle: 0,
      width: 52,
      height: 32,
    })), positions, 12)).toBe(false)
  })

  it('keeps a direct SFI to WAPU branch connected after creating its occurrence', () => {
    const result = createSfiTransactionOverview({
      nodes: [nodes[0], { id: 'wapu', companyName: 'WAPU', nodeType: 'wapu' }],
      edges: [edge('sfi-wapu', 'sfi', 'wapu', 100)],
    }, 'sales')
    const occurrence = instancesFor(result, 'wapu')[0]

    expect(result.branchSlots[0].hubInstanceId).toBe(occurrence.id)
    expect(result.edgeInstances[0].target).toBe(occurrence.id)
    expect(result.officialPrincipalIds.has(occurrence.id)).toBe(true)
    expect(calculateSfiPositions(result, 'hierarchy', 1200, 800).has(occurrence.id)).toBe(true)
  })
})

describe('buildSfiCytoscapeElements', () => {
  it('uses unique visual IDs while preserving canonical node and edge identity', () => {
    const data = graph([
      edge('sfi-gba', 'sfi', 'gba', 400),
      edge('sfi-ldn', 'sfi', 'ldn', 300),
      edge('sfi-msp', 'sfi', 'msp', 200),
      edge('sfi-lj', 'sfi', 'lj', 100),
      edge('gba-x', 'gba', 'x', 40),
      edge('ldn-x', 'ldn', 'x', 30),
      edge('msp-x', 'msp', 'x', 20),
      edge('lj-x', 'lj', 'x', 10),
    ])
    const result = createSfiTransactionOverview(data, 'sales')
    const elements = buildSfiCytoscapeElements(data, result)
    const xNodes = elements.filter(
      (element) => !('source' in element.data) && element.data.canonicalCompanyId === 'x',
    )
    const xEdges = elements.filter(
      (element) => 'source' in element.data && String(element.data.canonicalEdgeId).endsWith('-x'),
    )

    expect(xNodes).toHaveLength(4)
    expect(new Set(xNodes.map((element) => element.data.id)).size).toBe(4)
    expect(xEdges).toHaveLength(4)
    expect(new Set(xEdges.map((element) => element.data.id)).size).toBe(4)
    expect(new Set(xEdges.map((element) => element.data.canonicalEdgeId))).toEqual(
      new Set(['gba-x', 'ldn-x', 'msp-x', 'lj-x']),
    )
  })
})
