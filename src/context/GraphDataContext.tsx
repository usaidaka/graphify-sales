import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { NormalizedGraph } from '../graph/types';
import { ParsedWorkbook } from '../parsers/types';
import { loadExcelData } from '../parsers/loader';
import { normalize } from '../graph/normalizer';
import { useUI } from './UIContext';

interface GraphDataContextValue {
  graph: NormalizedGraph | null;
  loading: boolean;
  error: string | null;
}

const GraphDataContext = createContext<GraphDataContextValue | undefined>(undefined);

export const GraphDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { state } = useUI();
  const [parsedData, setParsedData] = useState<ParsedWorkbook | null>(null);
  const [graph, setGraph] = useState<NormalizedGraph | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load raw data once
  useEffect(() => {
    async function initData() {
      try {
        const parsed = await loadExcelData();
        setParsedData(parsed);
        setLoading(false);
      } catch (err: any) {
        console.error('Failed to initialize graph data:', err);
        setError(err.message || 'Failed to load data');
        setLoading(false);
      }
    }
    
    initData();
  }, []);

  // Re-normalize graph whenever universeMode or scopeFilter changes
  useEffect(() => {
    if (parsedData) {
      const normalized = normalize(parsedData, state.universeMode, state.scopeFilter);
      setGraph(normalized);
    }
  }, [parsedData, state.universeMode, state.scopeFilter]);

  return (
    <GraphDataContext.Provider value={{ graph, loading, error }}>
      {children}
    </GraphDataContext.Provider>
  );
};

export function useGraphData() {
  const context = useContext(GraphDataContext);
  if (context === undefined) {
    throw new Error('useGraphData must be used within a GraphDataProvider');
  }
  return context;
}

