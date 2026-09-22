import React, { useEffect } from 'react';
import { NetworkGraph } from './components/NetworkGraph';
import { LayerManager } from './components/LayerManager';
import { CompanyExplorer } from './components/CompanyExplorer';
import { StatisticsPanel } from './components/StatisticsPanel';
import { RelationshipDetailPanel } from './components/RelationshipDetailPanel';
import { CompanyDetailPanel } from './components/CompanyDetailPanel';
import { ExternalGroupDetailPanel } from './components/ExternalGroupDetailPanel';
import { useUI } from './context/UIContext';
import './App.css';

function App() {
  const { dispatch } = useUI();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc' || e.code === 'Escape') {
        dispatch({ type: 'CLEAR_FOCUS' });
        dispatch({ type: 'CLEAR_EDGE_SELECTION' });
        window.dispatchEvent(new Event('graph-reset-view'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  return (
    <div className="app-container">
      {/* Background Graph Layer */}
      <div className="graph-layer">
        <NetworkGraph />
      </div>

      {/* Foreground UI Layer */}
      <div className="ui-layer">
        
        {/* Left Sidebar */}
        <div className="left-sidebar">
          <CompanyExplorer />
          <LayerManager />
          <StatisticsPanel />
        </div>

        {/* Right Sidebar */}
        <div className="right-sidebar">
          <RelationshipDetailPanel />
          <CompanyDetailPanel />
          <ExternalGroupDetailPanel />
        </div>

      </div>
    </div>
  );
}

export default App;
