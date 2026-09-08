import React, { useMemo } from 'react';
import { useGraphData } from '../context/GraphDataContext';
import { useUI } from '../context/UIContext';
import { formatIDR, formatOmzetFaktur } from '../utils/formatters';
import './RelationshipDetailPanel.css';
import './CompanyDetailPanel.css';
import './ExternalGroupDetailPanel.css';

export const ExternalGroupDetailPanel: React.FC = () => {
  const { state, dispatch } = useUI();
  const { relationshipGraph } = useGraphData();
  const group = state.focusedExternalGroup;

  const detail = useMemo(() => {
    if (!group || !relationshipGraph) return null;
    const memberIdSet = new Set(group.memberIds);
    const owner = relationshipGraph.nodes.find((node) => node.id === group.ownerId);
    const members = group.memberIds.flatMap((memberId) => {
      const node = relationshipGraph.nodes.find((candidate) => candidate.id === memberId);
      if (!node) return [];
      const edges = relationshipGraph.edges.filter((edge) =>
        (edge.source === group.ownerId && edge.target === memberId)
        || (edge.source === memberId && edge.target === group.ownerId)
      );
      const isSupplier = edges.some((edge) => edge.target === group.ownerId);
      const isCustomer = edges.some((edge) => edge.source === group.ownerId);
      return [{
        id: memberId,
        name: node.companyName,
        fullName: node.fullName,
        role: isSupplier && isCustomer
          ? 'Pemasok & pelanggan'
          : isSupplier ? 'Pemasok' : 'Pelanggan',
        invoiceCount: edges.reduce((total, edge) => total + edge.invoiceCount, 0),
        totalDPP: edges.reduce((total, edge) => total + edge.totalDPP, 0),
      }];
    }).filter((member) => memberIdSet.has(member.id))
      .sort((a, b) => b.totalDPP - a.totalDPP || b.invoiceCount - a.invoiceCount);

    return { owner, members };
  }, [group, relationshipGraph]);

  if (!group || !detail) return null;

  return (
    <div className="detail-panel external-group-panel glass-panel">
      <div className="panel-header">
        <h2>Perusahaan Eksternal</h2>
        <button
          type="button"
          className="close-button"
          aria-label="Tutup daftar perusahaan eksternal"
          onClick={() => dispatch({ type: 'CLEAR_EXTERNAL_GROUP' })}
        >
          &times;
        </button>
      </div>
      <div className="panel-content">
        <div className="company-title-section">
          <div className="value primary-value company-title">
            {detail.members.length} perusahaan
          </div>
          <div className="external-group-context">
            Relasi langsung dengan {detail.owner?.companyName ?? group.ownerId}
          </div>
        </div>

        <div className="divider" />

        <div className="data-group">
          <label>Daftar perusahaan</label>
          <div className="connection-list external-member-list">
            {detail.members.map((member, index) => (
              <div key={member.id} className="connection-item external-member-item">
                <span className="rank-tag">#{index + 1}</span>
                <span className="external-member-main">
                  <span className="connection-name" title={member.fullName ?? member.name}>
                    {member.name}
                  </span>
                  <span className="external-member-role">{member.role}</span>
                </span>
                <span className="connection-count" title={formatIDR(member.totalDPP)}>
                  {formatOmzetFaktur(member.totalDPP, member.invoiceCount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
