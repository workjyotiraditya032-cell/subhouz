import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import SearchService from '../lib/SearchService';
import api from '../lib/api';

const SearchContext = createContext(null);

export function SearchProvider({ children }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('name');
  const [activeHostelId, setActiveHostelId] = useState(null);
  
  // Suggestions states
  const [suggestions, setSuggestions] = useState({
    locations: [],
    colleges: [],
    landmarks: [],
    properties: []
  });
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Debounced query Suggestions fetcher
  useEffect(() => {
    let active = true;
    
    const delayDebounceFn = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const data = await SearchService.getSuggestions(searchQuery);
        if (active && data) {
          setSuggestions(data);
        }
      } catch (err) {
        console.error('[SearchContext] Suggestions error:', err);
      } finally {
        if (active) {
          setSuggestionsLoading(false);
        }
      }
    }, 300); // 300ms debounce

    return () => {
      active = false;
      clearTimeout(delayDebounceFn);
    };
  }, [searchQuery]);

  // Execute database-driven smart search
  const executeSmartSearch = async (query) => {
    setLoading(true);
    try {
      const data = await SearchService.searchProperties(query);
      if (data) {
        setHostels(data);
      }
    } catch (err) {
      console.error('[SearchContext] Search execution failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshPublicHostels = async () => {
    setLoading(true);
    try {
      const response = await api.get('/hostels/public');
      if (response.data) {
        setHostels(response.data);
      }
    } catch (err) {
      console.error('[SearchContext] Refresh public hostels failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(() => ({
    searchQuery,
    setSearchQuery,
    searchCategory,
    setSearchCategory,
    hostels,
    setHostels,
    loading,
    setLoading,
    filter,
    setFilter,
    sort,
    setSort,
    activeHostelId,
    setActiveHostelId,
    suggestions,
    setSuggestions,
    suggestionsLoading,
    executeSmartSearch,
    refreshPublicHostels
  }), [
    searchQuery,
    searchCategory,
    hostels,
    loading,
    filter,
    sort,
    activeHostelId,
    suggestions,
    suggestionsLoading
  ]);

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
