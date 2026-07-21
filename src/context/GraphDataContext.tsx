import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { NormalizedGraph } from '../graph/types';
import { loadExcelData } from '../parsers/loader';
import { normalize } from '../graph/normalizer';

interface GraphDataContextValue {
  graph: NormalizedGraph | null;
  loading: boolean;
  error: string | null;
}

const GraphDataContext = createContext<GraphDataContextValue | undefined>(undefined);

export const GraphDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [graph, setGraph] = useState<NormalizedGraph | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initData() {
      try {
        const parsed = await loadExcelData();
        const normalized = normalize(parsed);
        setGraph(normalized);
        setLoading(false);
      } catch (err: any) {
        console.error('Failed to initialize graph data:', err);
        setError(err.message || 'Failed to load data');
        setLoading(false);
      }
    }
    
    initData();
  }, []);

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
