import React from 'react';
import { useUI } from '../context/UIContext';
import { useGraphData } from '../context/GraphDataContext';
import { formatIDR } from '../utils/formatters';
import './RelationshipDetailPanel.css';

export const RelationshipDetailPanel: React.FC = () => {
  const { state, dispatch } = useUI();
  const { graph } = useGraphData();

  if (!state.selectedEdgeId || !graph) return null;

  const edge = graph.edges.find(e => e.id === state.selectedEdgeId);
  if (!edge) return null;

  const sourceNode = graph.nodes.find(n => n.id === edge.source);
  const targetNode = graph.nodes.find(n => n.id === edge.target);

  const handleClose = () => {
    dispatch({ type: 'CLEAR_EDGE_SELECTION' });
  };

  return (
    <div className="detail-panel relationship-panel glass-panel">
      <div className="panel-header">
        <h2>Relationship Detail</h2>
        <button className="close-button" onClick={handleClose}>&times;</button>
      </div>

      <div className="panel-content">
        <div className="data-group">
          <label>Seller</label>
          <div className="value primary-value">{sourceNode?.companyName || edge.source}</div>
        </div>
        
        <div className="data-group arrow-down">
          <span>↓</span>
        </div>

        <div className="data-group">
          <label>Buyer</label>
          <div className="value primary-value">{targetNode?.companyName || edge.target}</div>
        </div>

        <div className="divider"></div>

        <div className="data-row">
          <div className="data-group">
            <label>Total Invoices</label>
            <div className="value highlight-value">{edge.invoiceCount}</div>
          </div>
        </div>

        <div className="data-group">
          <label>Total DPP</label>
          <div className="value currency">{formatIDR(edge.totalDPP)}</div>
        </div>

        <div className="data-group">
          <label>Total PPN</label>
          <div className="value currency">{formatIDR(edge.totalPPN)}</div>
        </div>

        <div className="divider"></div>

        <div className="data-group">
          <label>Sources</label>
          <div className="badges-container">
            {edge.datasets.map(ds => (
              <span key={ds} className="dataset-badge">{ds}</span>
            ))}
          </div>
        </div>

        <div className="data-group">
          <label>Periods</label>
          <div className="text-list">
            {edge.periods.slice(0, 5).join(', ')}
            {edge.periods.length > 5 && ' ...'}
          </div>
        </div>

        <div className="data-group">
          <label>Approval Status</label>
          <div className="text-list">
            {edge.approvalStatus.join(', ') || 'Unknown'}
          </div>
        </div>
      </div>
    </div>
  );
};
