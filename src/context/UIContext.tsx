import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export type DatasetName = 'FM' | 'FK' | 'FM_CRTX' | 'FK_CRTX';
export type ScopeFilter = 'with-external' | 'internal-only';
export type UniverseMode = 'active' | 'cancelled-replaced';

export interface UIState {
  activeLayers: Set<DatasetName>;
  scopeFilter: ScopeFilter;
  universeMode: UniverseMode;
  focusedNodeId: string | null;
  selectedEdgeId: string | null;
  searchQuery: string;
}

type UIAction =
  | { type: 'TOGGLE_LAYER'; payload: DatasetName }
  | { type: 'SET_SCOPE_FILTER'; payload: ScopeFilter }
  | { type: 'SET_UNIVERSE_MODE'; payload: UniverseMode }
  | { type: 'SET_FOCUS_NODE'; payload: string }
  | { type: 'CLEAR_FOCUS' }
  | { type: 'SELECT_EDGE'; payload: string }
  | { type: 'CLEAR_EDGE_SELECTION' }
  | { type: 'SET_SEARCH'; payload: string };

const initialState: UIState = {
  activeLayers: new Set(['FM', 'FK', 'FM_CRTX', 'FK_CRTX']),
  scopeFilter: 'with-external',
  universeMode: 'active',
  focusedNodeId: null,
  selectedEdgeId: null,
  searchQuery: ''
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

