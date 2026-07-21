import React, { useEffect } from 'react';
import { NetworkGraph } from './components/NetworkGraph';
import { LayerManager } from './components/LayerManager';
import { CompanyExplorer } from './components/CompanyExplorer';
import { StatisticsPanel } from './components/StatisticsPanel';
import { RelationshipDetailPanel } from './components/RelationshipDetailPanel';
import { CompanyDetailPanel } from './components/CompanyDetailPanel';
import { Legend } from './components/Legend';
import { useUI } from './context/UIContext';
import './App.css';

function App() {
  const { dispatch } = useUI();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dispatch({ type: 'CLEAR_FOCUS' });
        dispatch({ type: 'CLEAR_EDGE_SELECTION' });
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
          <div className="app-header glass-panel">
            <h1>Sales Connection Explorer</h1>
            <p>Interactive Network Graph MVP</p>
          </div>
          
          <CompanyExplorer />
          <LayerManager />
          
          <div className="legend-wrapper">
            <Legend />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="right-sidebar">
          <StatisticsPanel />
          <RelationshipDetailPanel />
          <CompanyDetailPanel />
        </div>

      </div>
    </div>
  );
}

export default App;
