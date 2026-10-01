import { describe, expect, it } from 'vitest';
import { projectHierarchyTrace } from './hierarchyTrace';

function overview(
  parents: Array<[nodeId: string, parentId: string, edgeId: string]>
) {
  const visibleNodeIds = new Set(['sfi']);
  const parentByNode = new Map<string, string>();
  const parentEdgeByNode = new Map<string, string>();
  parents.forEach(([nodeId, parentId, edgeId]) => {
    visibleNodeIds.add(nodeId);
    visibleNodeIds.add(parentId);
    parentByNode.set(nodeId, parentId);
    parentEdgeByNode.set(nodeId, edgeId);
  });
  return { sfiInstanceId: 'sfi', visibleNodeIds, parentByNode, parentEdgeByNode };
}

describe('projectHierarchyTrace', () => {
  it('connects SFI to the selected company and keeps only its route to WAPU', () => {
    const result = projectHierarchyTrace(
      overview([
        ['a', 'sfi', 'sfi-a'],
        ['selected', 'a', 'a-selected'],
        ['toward-wapu', 'selected', 'selected-toward'],
        ['wapu', 'toward-wapu', 'toward-wapu'],
        ['dead-end', 'selected', 'selected-dead'],
      ]),
      'selected',
      (id) => id === 'wapu'
    );

    expect([...result.nodeIds]).toEqual(expect.arrayContaining([
      'sfi', 'a', 'selected', 'toward-wapu', 'wapu',
    ]));
    expect(result.nodeIds.has('dead-end')).toBe(false);
    expect(result.edgeIds).toEqual(new Set([
      'sfi-a', 'a-selected', 'selected-toward', 'toward-wapu',
    ]));
  });

  it('includes every descendant branch that terminates at WAPU', () => {
    const result = projectHierarchyTrace(
      overview([
        ['selected', 'sfi', 'sfi-selected'],
        ['left', 'selected', 'selected-left'],
        ['wapu-left', 'left', 'left-wapu'],
        ['right', 'selected', 'selected-right'],
        ['wapu-right', 'right', 'right-wapu'],
      ]),
      'selected',
      (id) => id.startsWith('wapu-')
    );

    expect(result.nodeIds).toEqual(new Set([
      'selected', 'sfi', 'wapu-left', 'left', 'wapu-right', 'right',
    ]));
    expect(result.edgeIds.size).toBe(5);
  });

  it('still shows the upstream SFI route when no WAPU is downstream', () => {
    const result = projectHierarchyTrace(
      overview([
        ['a', 'sfi', 'sfi-a'],
        ['selected', 'a', 'a-selected'],
        ['dead-end', 'selected', 'selected-dead'],
      ]),
      'selected',
      () => false
    );

    expect(result.nodeIds).toEqual(new Set(['selected', 'a', 'sfi']));
    expect(result.edgeIds).toEqual(new Set(['a-selected', 'sfi-a']));
  });
});
