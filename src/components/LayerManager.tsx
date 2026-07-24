import React from 'react';
import { useUI, DatasetName } from '../context/UIContext';
import './LayerManager.css';

export const LayerManager: React.FC = () => {
  const { state, dispatch } = useUI();
  
  const layers: { id: DatasetName; label: string }[] = [
    { id: 'FM', label: 'FM' },
    { id: 'FK', label: 'FK' },
    { id: 'FM_CRTX', label: 'FM_CRTX' },
    { id: 'FK_CRTX', label: 'FK_CRTX' },
  ];

  const handleToggleLayer = (layerId: DatasetName) => {
    dispatch({ type: 'TOGGLE_LAYER', payload: layerId });
  };

  return (
    <div className="layer-manager glass-panel">
      {/* Universe Switcher */}
      <div className="control-group">
        <h3>Invoice Universe</h3>
        <div className="segmented-control">
          <button
            className={`segmented-btn ${state.universeMode === 'active' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_UNIVERSE_MODE', payload: 'active' })}
          >
            Faktur Active
          </button>
          <button
            className={`segmented-btn ${state.universeMode === 'cancelled-replaced' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_UNIVERSE_MODE', payload: 'cancelled-replaced' })}
          >
            Diganti & Batal
          </button>
        </div>
      </div>

      {/* Scope Switcher */}
      <div className="control-group">
        <h3>Scope Filter</h3>
        <div className="segmented-control">
          <button
            className={`segmented-btn ${state.scopeFilter === 'with-external' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_SCOPE_FILTER', payload: 'with-external' })}
          >
            With External
          </button>
          <button
            className={`segmented-btn ${state.scopeFilter === 'internal-only' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_SCOPE_FILTER', payload: 'internal-only' })}
          >
            Internal Only
          </button>
        </div>
      </div>

      {/* Dataset Layers */}
      <div className="control-group">
        <h3>Datasets</h3>
        <div className="layer-list">
          {layers.map(layer => {
            const isActive = state.activeLayers.has(layer.id);
            return (
              <label key={layer.id} className={`layer-toggle ${isActive ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => handleToggleLayer(layer.id)}
                />
                <span className="layer-label">{layer.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

