import React from 'react';
import { useUI, DatasetName } from '../context/UIContext';
import { useGraphData } from '../context/GraphDataContext';
import './LayerManager.css';

export const LayerManager: React.FC = () => {
  const { state, dispatch } = useUI();
  const { availableYears } = useGraphData();
  
  const layers: { id: DatasetName; label: string }[] = [
    { id: 'FM', label: 'FM' },
    { id: 'FK', label: 'FK' },
    { id: 'FM_CRTX', label: 'FM_CRTX' },
    { id: 'FK_CRTX', label: 'FK_CRTX' },
  ];

  const handleToggleLayer = (layerId: DatasetName) => {
    dispatch({ type: 'TOGGLE_LAYER', payload: layerId });
  };

  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  const yearRangeLabel =
    state.yearFrom === 'all' && state.yearTo === 'all'
      ? 'Seluruh tahun'
      : state.yearFrom === 'all'
        ? `Sampai ${state.yearTo}`
        : state.yearTo === 'all'
          ? `${state.yearFrom} sampai terbaru`
          : `${state.yearFrom} – ${state.yearTo}`;

  return (
    <div className="layer-manager glass-panel">
      <div className="control-group">
        <h3>Periode Transaksi</h3>
        <div className="period-filter-grid year-range-grid">
          <label className="period-filter">
            <span>Dari Tahun</span>
            <select
              value={state.yearFrom}
              onChange={(event) => dispatch({
                type: 'SET_YEAR_FROM',
                payload: event.target.value === 'all' ? 'all' : Number(event.target.value),
              })}
            >
              <option value="all">Awal</option>
              {[...availableYears].reverse().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>

          <label className="period-filter">
            <span>Sampai Tahun</span>
            <select
              value={state.yearTo}
              onChange={(event) => dispatch({
                type: 'SET_YEAR_TO',
                payload: event.target.value === 'all' ? 'all' : Number(event.target.value),
              })}
            >
              <option value="all">Terakhir</option>
              {[...availableYears].reverse().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
        </div>
        <span className="period-range-summary">{yearRangeLabel}</span>

        <div className="period-filter-grid period-month-grid">
          <label className="period-filter">
            <span>Bulan</span>
            <select
              value={state.selectedMonth}
              onChange={(event) => dispatch({
                type: 'SET_MONTH_FILTER',
                payload: event.target.value === 'all' ? 'all' : Number(event.target.value),
              })}
            >
              <option value="all">Semua Bulan</option>
              {months.map((month, index) => (
                <option key={month} value={index + 1}>{month}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Universe Switcher */}
      <div className="control-group">
        <h3>Faktur Universe</h3>
        <div className="segmented-control">
          <button
            className={`segmented-btn ${state.universeMode === 'active' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_UNIVERSE_MODE', payload: 'active' })}
          >
            Normal
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
