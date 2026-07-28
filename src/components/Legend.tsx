import React from 'react';
import './Legend.css';

export const Legend: React.FC = () => {
  return (
    <div className="legend-panel glass-panel">
      <h3>Legend</h3>
      
      <div className="legend-section">
        <h4>Jenis Perusahaan</h4>
        <div className="legend-items legend-node-grid">
          <div className="legend-item">
            <div className="legend-shape node-internal"></div>
            <span>Perusahaan Internal</span>
          </div>
          <div className="legend-item">
            <div className="legend-shape node-external"></div>
            <span>Perusahaan Eksternal</span>
          </div>
          <div className="legend-item">
            <div className="legend-shape node-distributor"></div>
            <span>Distributor</span>
          </div>
          <div className="legend-item">
            <div className="legend-shape node-special"></div>
            <span>Eksternal Khusus</span>
          </div>
          <div className="legend-item">
            <div className="legend-shape node-wapu"></div>
            <span>WAPU (Instansi Pemerintah)</span>
          </div>
          <div className="legend-item">
            <div className="legend-shape node-import"></div>
            <span>Transaksi Import</span>
          </div>
        </div>
      </div>

      <div className="divider"></div>

      <div className="legend-section">
        <h4>Arah Transaksi</h4>
        <div className="legend-items legend-inline-grid">
          <div className="legend-item">
            <div className="legend-arrow edge-sales"></div>
            <span>Penjualan</span>
          </div>
          <div className="legend-item">
            <div className="legend-arrow edge-purchase"></div>
            <span>Pembelian</span>
          </div>
        </div>
      </div>

      <div className="divider"></div>

      <div className="legend-section">
        <h4>Volume Omzet</h4>
        <div className="legend-items legend-inline-grid">
          <div className="legend-item">
            <div className="legend-edge edge-thin"></div>
            <span>Omzet Lebih Kecil</span>
          </div>
          <div className="legend-item">
            <div className="legend-edge edge-thick"></div>
            <span>Omzet Lebih Besar</span>
          </div>
        </div>
      </div>
    </div>
  );
};
