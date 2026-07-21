import React, { useMemo } from 'react';
import { useGraphData } from '../context/GraphDataContext';
import { useUI } from '../context/UIContext';
import './StatisticsPanel.css';

export const StatisticsPanel: React.FC = () => {
  const { graph } = useGraphData();
  const { state } = useUI();

  const stats = useMemo(() => {
    if (!graph) return null;

    const activeEdges = graph.edges.filter(e => e.datasets.some(ds => state.activeLayers.has(ds as any)));
    
    // Nodes that have at least one active edge
    const activeNodeIds = new Set<string>();
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();

    activeEdges.forEach(e => {
      activeNodeIds.add(e.source);
      activeNodeIds.add(e.target);
      
      outDegree.set(e.source, (outDegree.get(e.source) || 0) + 1);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    });

    const activeNodes = graph.nodes.filter(n => activeNodeIds.has(n.id));

    let internal = 0, external = 0, distributor = 0, special = 0;
    activeNodes.forEach(n => {
      if (n.nodeType === 'internal') internal++;
      else if (n.nodeType === 'external') external++;
      else if (n.nodeType === 'distributor') distributor++;
      else if (n.nodeType === 'special-external') special++;
    });

    let topSupplierId = '', maxOut = 0;
    outDegree.forEach((count, id) => {
      if (count > maxOut) { maxOut = count; topSupplierId = id; }
    });

    let topCustomerId = '', maxIn = 0;
    inDegree.forEach((count, id) => {
      if (count > maxIn) { maxIn = count; topCustomerId = id; }
    });

    let mostConnectedId = '', maxTotal = 0;
    activeNodeIds.forEach(id => {
      const total = (inDegree.get(id) || 0) + (outDegree.get(id) || 0);
      if (total > maxTotal) { maxTotal = total; mostConnectedId = id; }
    });

    const getNodeName = (id: string) => graph.nodes.find(n => n.id === id)?.companyName || 'None';

    return {
      totalCompanies: activeNodes.length,
      internal,
      external,
      distributor,
      special,
      totalRelationships: activeEdges.length,
      topSupplier: { name: getNodeName(topSupplierId), count: maxOut },
      topCustomer: { name: getNodeName(topCustomerId), count: maxIn },
      mostConnected: { name: getNodeName(mostConnectedId), count: maxTotal }
    };
  }, [graph, state.activeLayers]);

  if (!stats) return null;

  return (
    <div className="statistics-panel glass-panel">
      <h3>Statistics</h3>
      
      <div className="stat-grid-main">
        <div className="stat-item">
          <span className="stat-item-label">Companies</span>
          <span className="stat-item-value">{stats.totalCompanies}</span>
        </div>
        <div className="stat-item">
          <span className="stat-item-label">Relationships</span>
          <span className="stat-item-value highlight-value">{stats.totalRelationships}</span>
        </div>
      </div>

      <div className="stat-breakdown">
        <div className="breakdown-item">
          <span className="node-badge badge-internal">INT</span>
          <span>{stats.internal}</span>
        </div>
        <div className="breakdown-item">
          <span className="node-badge badge-external">EXT</span>
          <span>{stats.external}</span>
        </div>
        <div className="breakdown-item">
          <span className="node-badge badge-distributor">DIST</span>
          <span>{stats.distributor}</span>
        </div>
        <div className="breakdown-item">
          <span className="node-badge badge-special-external">SPEC</span>
          <span>{stats.special}</span>
        </div>
      </div>

      <div className="divider"></div>

      <div className="stat-leaderboard">
        <div className="leader-item">
          <span className="leader-label">Top Supplier</span>
          <span className="leader-name" title={stats.topSupplier.name}>{stats.topSupplier.name}</span>
          <span className="leader-count">{stats.topSupplier.count} buyers</span>
        </div>
        <div className="leader-item">
          <span className="leader-label">Top Customer</span>
          <span className="leader-name" title={stats.topCustomer.name}>{stats.topCustomer.name}</span>
          <span className="leader-count">{stats.topCustomer.count} sellers</span>
        </div>
        <div className="leader-item">
          <span className="leader-label">Most Connected</span>
          <span className="leader-name" title={stats.mostConnected.name}>{stats.mostConnected.name}</span>
          <span className="leader-count">{stats.mostConnected.count} connections</span>
        </div>
      </div>
    </div>
  );
};
