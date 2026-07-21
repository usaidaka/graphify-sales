import React from 'react';
import './Legend.css';

export const Legend: React.FC = () => {
  return (
    <div className="legend-panel glass-panel">
      <h3>Legend</h3>
      
      <div className="legend-section">
        <h4>Node Types</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-shape node-internal"></div>
            <span>Internal Company</span>
          </div>
          <div className="legend-item">
            <div className="legend-shape node-external"></div>
            <span>External Customer</span>
          </div>
          <div className="legend-item">
            <div className="legend-shape node-distributor"></div>
            <span>Distributor</span>
          </div>
          <div className="legend-item">
            <div className="legend-shape node-special"></div>
            <span>Special External</span>
          </div>
        </div>
      </div>

      <div className="divider"></div>

      <div className="legend-section">
        <h4>Edge Weights</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-edge edge-thin"></div>
            <span>Few Invoices</span>
          </div>
          <div className="legend-item">
            <div className="legend-edge edge-thick"></div>
            <span>Many Invoices</span>
          </div>
        </div>
      </div>
    </div>
  );
};
