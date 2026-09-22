import React from 'react';
import { useUI } from '../context/UIContext';
import { useGraphData } from '../context/GraphDataContext';
import type { NodeAnnotationMode } from '../graph/types';
import './LayerManager.css';

const ANNOTATION_OPTIONS: { value: NodeAnnotationMode; label: string }[] = [
  { value: 'director', label: 'Dirkom' },
  { value: 'dpp', label: 'Nilai DPP' },
  { value: 'invoice-count', label: 'Faktur' },
  { value: 'kpp', label: 'KPP' },
];

export const LayerManager: React.FC = () => {
  const { state, dispatch } = useUI();
  const { availableYears } = useGraphData();

  return (
    <section className="layer-manager glass-panel" aria-labelledby="filter-title">
      <h2 id="filter-title">Filter</h2>

      <div className="control-group">
        <h3>Orientasi</h3>
        <div className="segmented-control">
          <button
            type="button"
            className={`segmented-btn ${state.transactionView === 'sales' ? 'active' : ''}`}
            aria-pressed={state.transactionView === 'sales'}
            onClick={() => dispatch({ type: 'SET_TRANSACTION_VIEW', payload: 'sales' })}
          >
            Penjualan
          </button>
          <button
            type="button"
            className={`segmented-btn ${state.transactionView === 'purchases' ? 'active' : ''}`}
            aria-pressed={state.transactionView === 'purchases'}
            onClick={() => dispatch({ type: 'SET_TRANSACTION_VIEW', payload: 'purchases' })}
          >
            Pembelian
          </button>
        </div>
      </div>

      <div className="control-group">
        <label className="filter-select">
          <span>Tahun</span>
          <select
            value={state.yearFrom}
            disabled={availableYears.length === 0}
            onChange={(event) => dispatch({
              type: 'SET_YEAR',
              payload: Number(event.target.value),
            })}
          >
            {state.yearFrom === 'all' && <option value="all">Memuat tahun...</option>}
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="control-group">
        <h3>Status</h3>
        <div className="segmented-control">
          <button
            type="button"
            className={`segmented-btn ${state.universeMode === 'active' ? 'active' : ''}`}
            aria-pressed={state.universeMode === 'active'}
            onClick={() => dispatch({ type: 'SET_UNIVERSE_MODE', payload: 'active' })}
          >
            Normal
          </button>
          <button
            type="button"
            className={`segmented-btn ${state.universeMode === 'cancelled-replaced' ? 'active' : ''}`}
            aria-pressed={state.universeMode === 'cancelled-replaced'}
            onClick={() => dispatch({ type: 'SET_UNIVERSE_MODE', payload: 'cancelled-replaced' })}
          >
            Diganti &amp; Batal
          </button>
        </div>
      </div>

      <div className="control-group">
        <h3>Jaringan</h3>
        <div className="segmented-control">
          <button
            type="button"
            className={`segmented-btn ${state.scopeFilter === 'internal-only' ? 'active' : ''}`}
            aria-pressed={state.scopeFilter === 'internal-only'}
            onClick={() => dispatch({ type: 'SET_SCOPE_FILTER', payload: 'internal-only' })}
          >
            Internal
          </button>
          <button
            type="button"
            className={`segmented-btn ${state.scopeFilter === 'with-external' ? 'active' : ''}`}
            aria-pressed={state.scopeFilter === 'with-external'}
            onClick={() => dispatch({ type: 'SET_SCOPE_FILTER', payload: 'with-external' })}
          >
            External
          </button>
        </div>
      </div>

      <div className="control-group">
        <label className="filter-select">
          <span>Keterangan</span>
          <select
            value={state.nodeAnnotationMode}
            onChange={(event) => dispatch({
              type: 'SET_NODE_ANNOTATION_MODE',
              payload: event.target.value as NodeAnnotationMode,
            })}
          >
            {ANNOTATION_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
};
