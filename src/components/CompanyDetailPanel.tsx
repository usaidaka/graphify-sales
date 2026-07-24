import React, { useMemo } from 'react';
import { useUI } from '../context/UIContext';
import { useGraphData } from '../context/GraphDataContext';
import { formatIDR } from '../utils/formatters';
import './RelationshipDetailPanel.css'; // Reusing styles
import './CompanyDetailPanel.css';

export const CompanyDetailPanel: React.FC = () => {
  const { state, dispatch } = useUI();
  const { graph } = useGraphData();

  const focusedNodeId = state.focusedNodeId;
  const node = useMemo(() => graph?.nodes.find(n => n.id === focusedNodeId), [graph, focusedNodeId]);

  const { incoming, outgoing, stats } = useMemo(() => {
    if (!graph || !focusedNodeId) return { incoming: [], outgoing: [], stats: null };

    const incomingEdges = graph.edges.filter(e => e.target === focusedNodeId && e.datasets.some(ds => state.activeLayers.has(ds as any)));
    const outgoingEdges = graph.edges.filter(e => e.source === focusedNodeId && e.datasets.some(ds => state.activeLayers.has(ds as any)));

    let totalInvoicesAsBuyer = 0;
    let totalDPPAsBuyer = 0;
    const sellersMap = new Map<string, { name: string; count: number; dpp: number; id: string }>();

    incomingEdges.forEach(e => {
      totalInvoicesAsBuyer += e.invoiceCount;
      totalDPPAsBuyer += e.totalDPP;
      const sourceNode = graph.nodes.find(n => n.id === e.source);
      if (sourceNode) {
        const existing = sellersMap.get(sourceNode.id) || { name: sourceNode.companyName, count: 0, dpp: 0, id: sourceNode.id };
        sellersMap.set(sourceNode.id, {
          ...existing,
          count: existing.count + e.invoiceCount,
          dpp: existing.dpp + e.totalDPP
        });
      }
    });

    let totalInvoicesAsSeller = 0;
    let totalDPPAsSeller = 0;
    const buyersMap = new Map<string, { name: string; count: number; dpp: number; id: string }>();

    outgoingEdges.forEach(e => {
      totalInvoicesAsSeller += e.invoiceCount;
      totalDPPAsSeller += e.totalDPP;
      const targetNode = graph.nodes.find(n => n.id === e.target);
      if (targetNode) {
        const existing = buyersMap.get(targetNode.id) || { name: targetNode.companyName, count: 0, dpp: 0, id: targetNode.id };
        buyersMap.set(targetNode.id, {
          ...existing,
          count: existing.count + e.invoiceCount,
          dpp: existing.dpp + e.totalDPP
        });
      }
    });

    const sortedIncoming = Array.from(sellersMap.values()).sort((a, b) => b.dpp - a.dpp || b.count - a.count);
    const sortedOutgoing = Array.from(buyersMap.values()).sort((a, b) => b.dpp - a.dpp || b.count - a.count);

    return {
      incoming: sortedIncoming,
      outgoing: sortedOutgoing,
      stats: {
        totalInvoicesAsBuyer,
        totalDPPAsBuyer,
        totalInvoicesAsSeller,
        totalDPPAsSeller
      }
    };
  }, [graph, focusedNodeId, state.activeLayers]);

  if (!node || !stats) return null;

  const handleClose = () => {
    dispatch({ type: 'CLEAR_FOCUS' });
  };

  const handleNodeClick = (id: string) => {
    dispatch({ type: 'SET_FOCUS_NODE', payload: id });
  };

  return (
    <div className="detail-panel company-panel glass-panel">
      <div className="panel-header">
        <h2>Company Detail</h2>
        <button className="close-button" onClick={handleClose}>&times;</button>
      </div>

      <div className="panel-content">
        <div className="company-title-section">
          <div className="value primary-value company-title">{node.companyName}</div>
          <span className={`node-badge badge-${node.nodeType}`}>{node.nodeType}</span>
        </div>

        <div className="divider"></div>

        <div className="data-group">
          <label>Activity Summary</label>
          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-label">Total Invoices (As Seller)</div>
              <div className="stat-value">{stats.totalInvoicesAsSeller}</div>
              <div className="stat-subvalue">{formatIDR(stats.totalDPPAsSeller)}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Total Invoices (As Buyer)</div>
              <div className="stat-value">{stats.totalInvoicesAsBuyer}</div>
              <div className="stat-subvalue">{formatIDR(stats.totalDPPAsBuyer)}</div>
            </div>
          </div>
        </div>

        <div className="divider"></div>

        <div className="data-group">
          <label>Suppliers / Sellers (Urutan Terdekat #1 - {incoming.length})</label>
          {incoming.length > 0 ? (
            <div className="connection-list">
              {incoming.map((s, idx) => (
                <div key={s.id} className="connection-item" onClick={() => handleNodeClick(s.id)}>
                  <span className="rank-tag">#{idx + 1}</span>
                  <span className="connection-name">{s.name}</span>
                  <span className="connection-count">{formatIDR(s.dpp)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-list">None</div>
          )}
        </div>

        <div className="data-group">
          <label>Customers / Buyers (Urutan Terdekat #1 - {outgoing.length})</label>
          {outgoing.length > 0 ? (
            <div className="connection-list">
              {outgoing.map((b, idx) => (
                <div key={b.id} className="connection-item" onClick={() => handleNodeClick(b.id)}>
                  <span className="rank-tag">#{idx + 1}</span>
                  <span className="connection-name">{b.name}</span>
                  <span className="connection-count">{formatIDR(b.dpp)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-list">None</div>
          )}
        </div>
      </div>
    </div>
  );
};

