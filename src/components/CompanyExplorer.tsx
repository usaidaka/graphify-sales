import React, { useState, useEffect, useRef } from 'react';
import { useGraphData } from '../context/GraphDataContext';
import { useUI } from '../context/UIContext';
import './CompanyExplorer.css';

export const CompanyExplorer: React.FC = () => {
  const { graph } = useGraphData();
  const { state, dispatch } = useUI();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = state.searchQuery;

  const setQuery = (q: string) => {
    dispatch({ type: 'SET_SEARCH', payload: q });
    setIsOpen(true);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleClear = () => {
    dispatch({ type: 'SET_SEARCH', payload: '' });
    setIsOpen(false);
  };

  const handleSelect = (nodeId: string) => {
    dispatch({ type: 'SET_FOCUS_NODE', payload: nodeId });
    setIsOpen(false);
  };

  const results = graph?.nodes.filter(node => 
    node.companyName.toLowerCase().includes(query.toLowerCase())
  ) || [];

  const topResults = results.slice(0, 10);

  return (
    <div className="company-explorer glass-panel" ref={containerRef}>
      <div className="search-input-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search companies..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />
        {query && (
          <button className="clear-button" onClick={handleClear} aria-label="Clear search">
            &times;
          </button>
        )}
      </div>

      {isOpen && query && (
        <div className="search-dropdown">
          {topResults.length > 0 ? (
            topResults.map(node => (
              <div
                key={node.id}
                className="search-result-item"
                onClick={() => handleSelect(node.id)}
              >
                <span className="company-name">{node.companyName}</span>
                <span className={`node-badge badge-${node.nodeType}`}>{node.nodeType}</span>
              </div>
            ))
          ) : (
            <div className="search-no-results">
              No companies found
            </div>
          )}
        </div>
      )}
    </div>
  );
};
