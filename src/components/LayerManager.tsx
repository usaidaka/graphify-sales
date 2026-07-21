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

  const handleToggle = (layerId: DatasetName) => {
    dispatch({ type: 'TOGGLE_LAYER', payload: layerId });
  };

  return (
    <div className="layer-manager glass-panel">
      <h3>Datasets</h3>
      <div className="layer-list">
        {layers.map(layer => {
          const isActive = state.activeLayers.has(layer.id);
          return (
            <label key={layer.id} className={`layer-toggle ${isActive ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => handleToggle(layer.id)}
              />
              <span className="layer-label">{layer.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};
