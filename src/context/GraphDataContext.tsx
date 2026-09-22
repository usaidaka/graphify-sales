import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { NormalizedGraph } from '../graph/types';
import { ParsedWorkbook } from '../parsers/types';
import { loadExcelData } from '../parsers/loader';
import { normalize } from '../graph/normalizer';
import { createSfiTransactionOverview } from '../graph/sfiTransaction';
import { useUI } from './UIContext';

interface GraphDataContextValue {
  graph: NormalizedGraph | null;
  relationshipGraph: NormalizedGraph | null;
  availableYears: number[];
  loading: boolean;
  error: string | null;
}

const GraphDataContext = createContext<GraphDataContextValue | undefined>(undefined);
const FIRST_FILTER_YEAR = 2019;
const LAST_FILTER_YEAR = 2026;

function transactionYears(parsed: ParsedWorkbook): number[] {
  return Array.from(new Set([
    ...parsed.fm,
    ...parsed.fk,
    ...parsed.fmCrtx,
    ...parsed.fkCrtx,
  ].flatMap(row => row.year === null ? [] : [row.year])))
    .filter(year => year >= FIRST_FILTER_YEAR && year <= LAST_FILTER_YEAR)
    .sort((a, b) => b - a);
}

function initialGraphYear(parsed: ParsedWorkbook, years: number[]): number | undefined {
  return years.find((year) => {
    const candidate = normalize(parsed, 'active', 'with-external', year, year, 'all');
    return createSfiTransactionOverview(candidate, 'sales').canonicalVisibleEdgeIds.size > 0;
  }) ?? years[0];
}

export const GraphDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { state, dispatch } = useUI();
  const [parsedData, setParsedData] = useState<ParsedWorkbook | null>(null);
  const [graph, setGraph] = useState<NormalizedGraph | null>(null);
  const [relationshipGraph, setRelationshipGraph] = useState<NormalizedGraph | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const availableYears = parsedData ? transactionYears(parsedData) : [];

  // Load raw data once
  useEffect(() => {
    async function initData() {
      try {
        const parsed = await loadExcelData();
        const years = transactionYears(parsed);
        const initialYear = initialGraphYear(parsed, years);
        if (initialYear) dispatch({ type: 'SET_YEAR', payload: initialYear });
        setParsedData(parsed);
        setLoading(false);
      } catch (err: any) {
        console.error('Failed to initialize graph data:', err);
        setError(err.message || 'Failed to load data');
        setLoading(false);
      }
    }
    
    initData();
  }, [dispatch]);

  // Re-normalize graph whenever universeMode or scopeFilter changes
  useEffect(() => {
    if (parsedData) {
      const fullScopeGraph = normalize(
        parsedData,
        state.universeMode,
        'with-external',
        state.yearFrom,
        state.yearTo,
        'all'
      );
      setRelationshipGraph(fullScopeGraph);
      setGraph(state.scopeFilter === 'with-external'
        ? fullScopeGraph
        : normalize(
            parsedData,
            state.universeMode,
            state.scopeFilter,
            state.yearFrom,
            state.yearTo,
            'all'
          ));
    }
  }, [
    parsedData,
    state.universeMode,
    state.scopeFilter,
    state.yearFrom,
    state.yearTo,
  ]);

  return (
    <GraphDataContext.Provider value={{ graph, relationshipGraph, availableYears, loading, error }}>
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

