import React, { useEffect, useState } from 'react';
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
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);

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
        <div className={`left-sidebar-shell ${isLeftSidebarOpen ? 'is-open' : 'is-collapsed'}`}>
          <aside
            id="left-sidebar-panel"
            className="left-sidebar"
            aria-label="Panel pencarian, filter, dan statistik"
            aria-hidden={!isLeftSidebarOpen}
            inert={!isLeftSidebarOpen}
          >
            <CompanyExplorer />
            <LayerManager />
            <StatisticsPanel />
          </aside>
          <button
            type="button"
            className="left-sidebar-toggle glass-panel"
            aria-controls="left-sidebar-panel"
            aria-expanded={isLeftSidebarOpen}
            aria-label={isLeftSidebarOpen ? 'Sembunyikan panel kiri' : 'Tampilkan panel kiri'}
            title={isLeftSidebarOpen ? 'Sembunyikan panel kiri' : 'Tampilkan panel kiri'}
            onClick={() => setIsLeftSidebarOpen((isOpen) => !isOpen)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14.5 5.5 8 12l6.5 6.5" />
            </svg>
          </button>
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
