import React, { useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, AlertCircle } from 'lucide-react';
import { useSearch } from '../../contexts/SearchContext';
import SearchBar from './SearchBar';
import MapView from './MapView';
import PropertyCard from './PropertyCard';
import { useWebsiteImage } from '../../hooks/useWebsiteImages';
import SearchRepository from '../../lib/SearchRepository';

export default function SearchResults() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    hostels, 
    loading, 
    executeSmartSearch, 
    filter, 
    setFilter, 
    sort, 
    setSort,
    searchQuery,
    setSearchQuery
  } = useSearch();

  const logo = useWebsiteImage('website_logo');
  const defaultProperty = useWebsiteImage('default_property');

  useEffect(() => {
    const urlQuery = searchParams.get('location') || searchParams.get('property') || searchParams.get('q') || '';
    setSearchQuery(urlQuery);
    executeSmartSearch(urlQuery);
    
    if (urlQuery.trim()) {
      SearchRepository.saveSearch(urlQuery);
    }
  }, [searchParams, setSearchQuery, executeSmartSearch]);

  // Client-side post-processing (Gender filter and Sorting) on the ranked results
  const processedHostels = useMemo(() => {
    let list = hostels;

    if (filter !== 'all') {
      list = list.filter(h => h.hostel_type === filter);
    }

    if (sort === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'rent') {
      list = [...list].sort((a, b) => a.starting_rent - b.starting_rent);
    } else if (sort === 'rating') {
      list = [...list].sort((a, b) => b.average_rating - a.average_rating);
    }

    return list;
  }, [hostels, filter, sort]);

  const handleClearFilters = () => {
    setFilter('all');
    setSort('name');
    setSearchQuery('');
    setSearchParams({});
  };

  const handleNearbySearch = (area) => {
    setSearchParams({ location: area });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Search Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-[100] shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Link to="/" className="p-2.5 hover:bg-slate-50 rounded-full border border-slate-100 transition-all active:scale-95">
              <ArrowLeft className="w-4 h-4 text-slate-700" />
            </Link>
            <Link to="/">
              <img src={logo.image || "/logo.png"} alt="SUBHOUZ Logo" className="h-8 object-contain" />
            </Link>
          </div>
          
          {/* Advanced Search Bar Component */}
          <div className="w-full md:max-w-xl">
            <SearchBar placeholder="Search by Area, Landmark, College or Property" />
          </div>

          <div className="hidden md:block w-32" />
        </div>
      </header>

      {/* Filters & Controls */}
      <div className="bg-white border-b border-slate-100 px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Gender Filter Badges */}
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wide">
            {['all', 'boys', 'girls', 'mixed'].map((g) => (
              <button
                key={g}
                onClick={() => setFilter(g)}
                className={`px-4 py-2 rounded-xl transition-all border ${
                  filter === g 
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm' 
                    : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
                }`}
              >
                {g === 'all' ? 'All Stays' : g === 'mixed' ? 'Co-Ed' : `${g}'s`}
              </button>
            ))}
          </div>

          {/* Sorting Option */}
          <div className="flex items-center gap-2 font-bold text-slate-600">
            <span>Sort By</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2 outline-none text-slate-800 font-extrabold cursor-pointer hover:border-slate-200 transition-all"
            >
              <option value="name">Alphabetical</option>
              <option value="rent">Lowest Rent</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Split screen content layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-6 relative">
        
        {/* Listings grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide">
              {loading ? 'Smart Searching...' : `${processedHostels.length} Stays Found`}
            </h2>
            {searchQuery && (
              <span className="text-xs bg-slate-100 border border-slate-200 px-3 py-1 rounded-full font-bold text-slate-600 truncate max-w-[200px]">
                Intent: "{searchQuery}"
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(idx => (
                <div key={idx} className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-xs animate-pulse">
                  <div className="aspect-[16/10] bg-slate-100" />
                  <div className="p-6 space-y-4">
                    <div className="h-4 bg-slate-100 rounded w-2/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                    <div className="h-10 bg-slate-50 rounded-2xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : processedHostels.length === 0 ? (
            <AnimatePresence>
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white border border-slate-100 rounded-3xl p-8 text-center space-y-6 max-w-md mx-auto shadow-sm mt-12"
              >
                <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600 shadow-inner">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-800">No properties found near this location.</h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    Try searching for key institutions (e.g. KIIT, ITER), alias codes (e.g. JMH, HHG), gender types, or popular regions.
                  </p>
                </div>

                {/* Popular Shortcuts */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Popular Areas</span>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {['Patia', 'Shampur', 'Mancheswar'].map((area) => (
                      <button
                        key={area}
                        onClick={() => handleNearbySearch(area)}
                        className="px-3.5 py-1.5 bg-slate-50 border border-slate-100 hover:border-emerald-700 hover:bg-emerald-50 text-[11px] font-bold rounded-xl text-slate-700 hover:text-emerald-800 transition-all active:scale-95"
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-50">
                  <button
                    onClick={handleClearFilters}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-full transition-all flex items-center justify-center gap-2 mx-auto active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Search</span>
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {processedHostels.map((h) => (
                <PropertyCard key={h.id} hostel={h} defaultImage={defaultProperty.image} />
              ))}
            </div>
          )}
        </div>

        {/* Sticky Map column — Leaflet + OpenStreetMap (free, no API key) */}
        <div className="h-[400px] lg:h-[calc(100vh-200px)] lg:sticky lg:top-[120px] rounded-3xl overflow-hidden order-first lg:order-last">
          <MapView searchLocation={searchQuery} />
        </div>
      </main>
    </div>
  );
}
