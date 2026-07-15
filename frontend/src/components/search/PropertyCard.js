import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, MapPin, Users, ArrowRight, Shield, Wifi, UtensilsCrossed } from 'lucide-react';
import { useSearch } from '../../contexts/SearchContext';

export default function PropertyCard({ hostel, defaultImage }) {
  const { activeHostelId, setActiveHostelId } = useSearch();
  const navigate = useNavigate();

  const isHighlighted = activeHostelId === hostel.id;

  const handleMouseEnter = () => {
    setActiveHostelId(hostel.id);
  };

  const handleMouseLeave = () => {
    setActiveHostelId(null);
  };

  const getHostelImage = () => {
    if (hostel.images && hostel.images.length > 0) {
      return hostel.images[0];
    }
    const fallbackImage = typeof defaultImage === 'object' ? defaultImage?.image : defaultImage;
    return fallbackImage || "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80";
  };

  return (
    <div
      id={`listing-card-${hostel.id}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => navigate(`/hostels/${hostel.id}`)}
      className={`group relative bg-white rounded-3xl overflow-hidden transition-all duration-300 border cursor-pointer ${
        isHighlighted 
          ? 'shadow-[0_12px_32px_rgba(45,95,63,0.12)] border-emerald-600 scale-[0.99] ring-2 ring-emerald-500/20' 
          : 'shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] border-slate-100'
      }`}
    >
      {/* Property Image Container */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-50">
        <img
          src={getHostelImage()}
          alt={hostel.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Gender Badge */}
        <span className={`absolute top-4 left-4 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm text-white ${
          hostel.hostel_type === 'boys' 
            ? 'bg-blue-600' 
            : hostel.hostel_type === 'girls' 
            ? 'bg-rose-500' 
            : 'bg-emerald-600'
        }`}>
          {hostel.hostel_type === 'mixed' ? 'Co-Ed' : `${hostel.hostel_type}'s pg`}
        </span>
        
        {/* Price Tag Overlay */}
        <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white font-bold text-xs border border-white/10 shadow-lg">
          Starting <span className="text-emerald-400 font-extrabold">₹{hostel.starting_rent.toLocaleString()}</span>/mo
        </div>
      </div>

      {/* Property Content */}
      <div className="p-6 space-y-4">
        {/* Header Details */}
        <div className="flex justify-between items-start gap-3">
          <div className="space-y-1 truncate">
            <h3 className="text-base font-bold text-slate-800 truncate group-hover:text-emerald-800 transition-colors">
              {hostel.name}
            </h3>
            <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{hostel.area}, Bhubaneswar</span>
            </div>
          </div>
          {/* Rating */}
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-xl text-amber-700 font-bold text-xs shrink-0 shadow-sm">
            <Star className="w-3.5 h-3.5 fill-current shrink-0" />
            <span>{hostel.average_rating > 0 ? hostel.average_rating.toFixed(1) : "New"}</span>
            {hostel.review_count > 0 && (
              <span className="text-[10px] text-amber-600/80 font-medium">({hostel.review_count})</span>
            )}
          </div>
        </div>

        {/* Short Description */}
        <p className="text-xs text-slate-500 leading-relaxed font-semibold line-clamp-2">
          {hostel.description || "Premium fully-furnished student/professional accommodation with prime accessibility and state-of-the-art facilities."}
        </p>

        {/* Dynamic Distance / Nearest Landmarks */}
        <div className="bg-slate-50 rounded-2xl p-3.5 flex flex-col gap-2 border border-slate-100/50">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span>Nearest College:</span>
            <span className="text-slate-800 font-bold text-right truncate pl-2 max-w-[160px]">{hostel.college || 'KIIT University'}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span>Landmark Focus:</span>
            <span className="text-slate-800 font-bold text-right truncate pl-2 max-w-[160px]">{hostel.landmark || 'Sikharchandi'}</span>
          </div>
        </div>

        {/* Icons Row */}
        <div className="flex items-center gap-3.5 pt-1 text-slate-400">
          <div className="flex items-center gap-1 text-xs font-semibold">
            <Wifi className="w-4 h-4 text-slate-400" />
            <span>Free Wi-Fi</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold">
            <UtensilsCrossed className="w-4 h-4 text-slate-400" />
            <span>Food / Mess</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold">
            <Shield className="w-4 h-4 text-slate-400" />
            <span>Security</span>
          </div>
        </div>

        {/* View Details Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/hostels/${hostel.id}`);
          }}
          className="w-full py-3 px-4 bg-slate-50 hover:bg-emerald-700 hover:text-white border border-slate-100 font-bold rounded-2xl text-xs transition-all duration-300 flex items-center justify-center gap-2 group-hover:border-emerald-600 shadow-sm active:scale-98"
        >
          <span>View Details</span>
          <ArrowRight className="w-3.5 h-3.5 transform transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
