import { describe, expect, it } from 'vitest'

import { buildSfiCytoscapeElements } from './builder'
import {
  calculateSfiPositions,
  createSfiTransactionOverview,
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

  it('fills missing principal slots with the largest direct counterparts', () => {
    const result = overview([
      edge('sfi-x', 'sfi', 'x', 400),
      edge('sfi-ldn', 'sfi', 'ldn', 300),
      edge('sfi-a', 'sfi', 'a', 200),
      edge('sfi-b', 'sfi', 'b', 100),
    ])

    expect(result.branchSlots.map((slot) => slot.hubNodeId)).toEqual(['x', 'ldn', 'a', 'b'])
    expect(result.branchSlots.map((slot) => slot.isReplacement)).toEqual([true, false, true, true])
  })

  it('leaves a principal slot empty when no replacement exists', () => {
    const result = overview([edge('sfi-ldn', 'sfi', 'ldn', 100)])

    expect(result.branchSlots.map((slot) => slot.hubNodeId)).toEqual([null, 'ldn', null, null])
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

  it('places a larger direct counterpart closer than an official principal', () => {
    const result = overview([
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

  it('uses hierarchy level alone when distance ranking is disabled', () => {
    const result = overview([
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
      'GBA',
      'LDN',
      'MSP',
      'LJ',
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

  it('keeps a direct SFI instance separate from four branch instances', () => {
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
      new Set(['GBA', 'LDN', 'MSP', 'LJ', 'DIRECT']),
    )
    expect(xInstances.map((instance) => instance.id)).toContain('direct:x')
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
