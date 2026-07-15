import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Sparkles, Building2, Clock } from 'lucide-react';
import { useSearch } from '../../contexts/SearchContext';

export default function SuggestionDropdown({ 
  onSelect, 
  recentSearches, 
  focusedIndex, 
  setFocusedIndex,
  flattenedList
}) {
  const { suggestions, suggestionsLoading } = useSearch();

  // Highlight matching query text
  const highlightMatch = (text, query) => {
    if (!query) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <strong key={i} className="text-emerald-700 font-bold">{part}</strong>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  if (suggestionsLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-4 bg-slate-100 rounded animate-pulse w-1/4" />
        <div className="space-y-2">
          <div className="h-9 bg-slate-50 rounded-xl animate-pulse" />
          <div className="h-9 bg-slate-50 rounded-xl animate-pulse" />
          <div className="h-9 bg-slate-50 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const renderIcon = (type) => {
    switch (type) {
      case 'recent': return <Clock className="w-4 h-4 text-slate-400" />;
      case 'locations': return <MapPin className="w-4 h-4 text-emerald-600" />;
      case 'colleges': return <Sparkles className="w-4 h-4 text-amber-500" />;
      case 'landmarks': return <MapPin className="w-4 h-4 text-blue-500" />;
      case 'properties': return <Building2 className="w-4 h-4 text-indigo-500" />;
      default: return <MapPin className="w-4 h-4 text-slate-400" />;
    }
  };

  const getLabel = (type) => {
    switch (type) {
      case 'recent': return 'Recent Searches';
      case 'locations': return 'Locations';
      case 'colleges': return 'Colleges & Universities';
      case 'landmarks': return 'Landmarks';
      case 'properties': return 'Properties';
      default: return '';
    }
  };

  // Group the flat list back to render header rows dynamically
  let lastType = null;

  return (
    <div className="p-6 max-h-[420px] overflow-y-auto custom-scrollbar space-y-4">
      {flattenedList.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <p className="text-sm font-semibold">No results match your search</p>
          <p className="text-xs mt-1">Try a different keyword or location</p>
        </div>
      ) : (
        <div className="space-y-4">
          {flattenedList.map((item, idx) => {
            const showHeader = item.type !== lastType;
            lastType = item.type;
            const isFocused = idx === focusedIndex;

            return (
              <div key={idx} className="space-y-1">
                {showHeader && (
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-3 mb-1.5 flex items-center gap-1.5 first:mt-0">
                    {renderIcon(item.type)} {getLabel(item.type)}
                  </h4>
                )}
                <button
                  onMouseEnter={() => setFocusedIndex(idx)}
                  onClick={() => onSelect(item)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all duration-150 flex items-center justify-between group ${
                    isFocused ? 'bg-slate-100/90 text-emerald-800 scale-[0.99] shadow-sm' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate mr-3">
                    <span className="text-sm font-semibold truncate">{item.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide shrink-0">
                    {item.type === 'properties' ? 'View PG' : item.type === 'colleges' ? 'Near Stays' : 'Bhubaneswar'}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
