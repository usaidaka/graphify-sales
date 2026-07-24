import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { DEFAULT_FOCUS_SORT_METRIC } from '../graph/focusRanking';

export type DatasetName = 'FM' | 'FK' | 'FM_CRTX' | 'FK_CRTX';
export type ScopeFilter = 'with-external' | 'internal-only';
export type UniverseMode = 'active' | 'cancelled-replaced';
export type FocusSortMetric = 'total-omzet' | 'invoice-count';
export type PeriodFilter = number | 'all';

export interface UIState {
  activeLayers: Set<DatasetName>;
  scopeFilter: ScopeFilter;
  universeMode: UniverseMode;
  focusedNodeId: string | null;
  selectedEdgeId: string | null;
  searchQuery: string;
  focusSortMetric: FocusSortMetric;
  yearFrom: PeriodFilter;
  yearTo: PeriodFilter;
  selectedMonth: PeriodFilter;
}

type UIAction =
  | { type: 'TOGGLE_LAYER'; payload: DatasetName }
  | { type: 'SET_SCOPE_FILTER'; payload: ScopeFilter }
  | { type: 'SET_UNIVERSE_MODE'; payload: UniverseMode }
  | { type: 'SET_FOCUS_NODE'; payload: string }
  | { type: 'CLEAR_FOCUS' }
  | { type: 'SELECT_EDGE'; payload: string }
  | { type: 'CLEAR_EDGE_SELECTION' }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_FOCUS_SORT_METRIC'; payload: FocusSortMetric }
  | { type: 'SET_YEAR_FROM'; payload: PeriodFilter }
  | { type: 'SET_YEAR_TO'; payload: PeriodFilter }
  | { type: 'SET_MONTH_FILTER'; payload: PeriodFilter };

const initialState: UIState = {
  activeLayers: new Set(['FM', 'FK', 'FM_CRTX', 'FK_CRTX']),
  scopeFilter: 'with-external',
  universeMode: 'active',
  focusedNodeId: null,
  selectedEdgeId: null,
  searchQuery: '',
  focusSortMetric: DEFAULT_FOCUS_SORT_METRIC,
  yearFrom: 'all',
  yearTo: 'all',
  selectedMonth: 'all'
};

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'TOGGLE_LAYER': {
      const newLayers = new Set(state.activeLayers);
      if (newLayers.has(action.payload)) {
        newLayers.delete(action.payload);
      } else {
        newLayers.add(action.payload);
      }
      return { ...state, activeLayers: newLayers };
    }
    case 'SET_SCOPE_FILTER':
      return { ...state, scopeFilter: action.payload, focusedNodeId: null, selectedEdgeId: null };
    case 'SET_UNIVERSE_MODE':
      return { ...state, universeMode: action.payload, focusedNodeId: null, selectedEdgeId: null };
    case 'SET_FOCUS_NODE':
      return { ...state, focusedNodeId: action.payload, selectedEdgeId: null, searchQuery: '' };
    case 'CLEAR_FOCUS':
      return { ...state, focusedNodeId: null };
    case 'SELECT_EDGE':
      return { ...state, selectedEdgeId: action.payload, focusedNodeId: null, searchQuery: '' };
    case 'CLEAR_EDGE_SELECTION':
      return { ...state, selectedEdgeId: null };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    case 'SET_FOCUS_SORT_METRIC':
      return { ...state, focusSortMetric: action.payload };
    case 'SET_YEAR_FROM':
      return {
        ...state,
        yearFrom: action.payload,
        yearTo:
          action.payload !== 'all' &&
          state.yearTo !== 'all' &&
          action.payload > state.yearTo
            ? action.payload
            : state.yearTo,
        focusedNodeId: null,
        selectedEdgeId: null,
      };
    case 'SET_YEAR_TO':
      return {
        ...state,
        yearTo: action.payload,
        yearFrom:
          action.payload !== 'all' &&
          state.yearFrom !== 'all' &&
          action.payload < state.yearFrom
            ? action.payload
            : state.yearFrom,
        focusedNodeId: null,
        selectedEdgeId: null,
      };
    case 'SET_MONTH_FILTER':
      return {
        ...state,
        selectedMonth: action.payload,
        focusedNodeId: null,
        selectedEdgeId: null,
      };
    default:
      return state;
  }
}

interface UIContextValue {
  state: UIState;
  dispatch: React.Dispatch<UIAction>;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(uiReducer, initialState);

  return (
    <UIContext.Provider value={{ state, dispatch }}>
      {children}
    </UIContext.Provider>
  );
};

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}

