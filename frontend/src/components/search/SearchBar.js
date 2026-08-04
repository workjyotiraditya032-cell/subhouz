import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useSearch } from '../../contexts/SearchContext';
import SuggestionDropdown from './SuggestionDropdown';

export default function SearchBar({ placeholder = "Search by Area, Landmark, College or Property", autoFocus = false }) {
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery, suggestions } = useSearch();
  
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('subhouz_recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading recent searches:', e);
    }
  }, []);

  // Save a recent search
  const saveRecentSearch = (term) => {
    if (!term || !term.trim()) return;
    const clean = term.trim();
    const updated = [clean, ...recentSearches.filter(s => s !== clean)].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem('subhouz_recent_searches', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving recent searches:', e);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Flatten suggestions list to support simple index-based keyboard focus
  const flattenedList = useMemo(() => {
    const list = [];
    
    // Recent Searches
    if (recentSearches.length > 0 && !searchQuery) {
      recentSearches.forEach(term => {
        list.push({ type: 'recent', name: term });
      });
    }
    
    // Locations
    if (suggestions.locations) {
      suggestions.locations.forEach(loc => {
        list.push({ type: 'locations', name: loc.name, data: loc });
      });
    }
    
    // Colleges
    if (suggestions.colleges) {
      suggestions.colleges.forEach(col => {
        list.push({ type: 'colleges', name: col.name, data: col });
      });
    }
    
    // Landmarks
    if (suggestions.landmarks) {
      suggestions.landmarks.forEach(lm => {
        list.push({ type: 'landmarks', name: lm.name, data: lm });
      });
    }
    
    // Properties
    if (suggestions.properties) {
      suggestions.properties.forEach(prop => {
        list.push({ type: 'properties', name: prop.name, data: prop });
      });
    }
    
    return list;
  }, [recentSearches, searchQuery, suggestions]);

  // Reset focus when query changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchQuery]);

  const handleSelect = (item) => {
    saveRecentSearch(item.name);
    setIsOpen(false);
    setFocusedIndex(-1);
    
    if (item.type === 'properties') {
      navigate(`/search?property=${encodeURIComponent(item.name)}`);
    } else {
      navigate(`/search?location=${encodeURIComponent(item.name)}`);
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % flattenedList.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev - 1 + flattenedList.length) % flattenedList.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < flattenedList.length) {
          handleSelect(flattenedList[focusedIndex]);
        } else if (searchQuery.trim()) {
          saveRecentSearch(searchQuery);
          setIsOpen(false);
          navigate(`/search?location=${encodeURIComponent(searchQuery)}`);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        inputRef.current?.blur();
        break;
      default:
        break;
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-3xl mx-auto z-50">
      {/* Search Input Container */}
      <div className="relative flex flex-col md:flex-row items-stretch md:items-center bg-white/95 backdrop-blur-md rounded-2xl md:rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-slate-100 hover:border-emerald-500/30 transition-all duration-300 group overflow-hidden p-2 md:p-0 gap-2 md:gap-0">
        <div className="flex items-center w-full md:flex-1">
          <div className="pl-4 md:pl-6 text-slate-400 group-hover:text-emerald-600 transition-colors">
            <Search className="w-5 h-5 stroke-[2.5]" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="w-full py-3 md:py-4.5 px-3 md:px-4 text-slate-800 placeholder-slate-400/80 bg-transparent outline-none font-semibold text-[15px] leading-normal"
          />
          {searchQuery && (
            <button
              onClick={handleClear}
              className="p-2 mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-all"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
        <button
          onClick={() => {
            if (searchQuery.trim()) {
              saveRecentSearch(searchQuery);
              setIsOpen(false);
              navigate(`/search?location=${encodeURIComponent(searchQuery)}`);
            }
          }}
          className="w-full md:w-auto md:mr-2 px-6 py-4 md:py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl md:rounded-full text-base md:text-sm transition-all shadow-md active:scale-95 flex items-center justify-center h-[52px] md:h-auto"
        >
          Search
        </button>
      </div>

      {/* Suggestion Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white/98 backdrop-blur-xl border border-slate-100 rounded-3xl shadow-[0_12px_48px_rgba(0,0,0,0.12)] overflow-hidden transition-all duration-300">
          <SuggestionDropdown
            onSelect={handleSelect}
            recentSearches={recentSearches}
            focusedIndex={focusedIndex}
            setFocusedIndex={setFocusedIndex}
            flattenedList={flattenedList}
          />
        </div>
      )}
    </div>
  );
}
