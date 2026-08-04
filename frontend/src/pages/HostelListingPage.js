import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { MapPin, Phone, Star, Users, DoorOpen, ArrowRight, Wifi, Shield, Camera, Car, Dumbbell, UtensilsCrossed, Waves, Wind, Droplets, Sun, ChevronDown, Search, SlidersHorizontal, Building2, Menu, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import api from '../lib/api';
import { useWebsiteImage, useWebsiteImages } from '../hooks/useWebsiteImages';

const HOSTEL_COVERS = {
  'Jogmaya Hostel': 'https://images.unsplash.com/photo-1612913959689-a83136ac4e7c?auto=format&fit=crop&w=900&q=80',
  'Homely Havens Girls PG': 'https://images.unsplash.com/photo-1775742138486-afd4262157c1?auto=format&fit=crop&w=900&q=80',
  'GopalSarojini (GS) Residency': 'https://images.unsplash.com/photo-1705708001177-4f664a339b78?auto=format&fit=crop&w=900&q=80',
};

const FACILITY_ICONS = {
  'Wi-Fi': Wifi,
  'CCTV': Camera,
  '24/7 Security': Shield,
  'Parking': Car,
  'Gym Access': Dumbbell,
  'Mess / Tiffin': UtensilsCrossed,
  'Laundry': Waves,
  'AC Rooms': Wind,
  'Attached Bathroom': Droplets,
  'Power Backup': Sun,
  'Water Purifier': Droplets,
  'Common Kitchen': UtensilsCrossed,
  'Balcony Rooms': Building2,
};

const PROPERTY_METADATA = {
  'Apex Elite Co-Living': {
    lat: 12.9352,
    lng: 77.6245,
    area: 'Koramangala',
    city: 'Bengaluru',
    colleges: ['IISc Bengaluru', 'Christ University'],
    landmarks: ['Forum Mall Koramangala'],
  },
  'Homely Havens Girls PG': {
    lat: 17.4435,
    lng: 78.3772,
    area: 'Hitech City',
    city: 'Hyderabad',
    colleges: ['IIIT Hyderabad', 'ISB Hyderabad'],
    landmarks: ['Cyber Towers'],
  },
  'Grand Horizon Stays': {
    lat: 18.5912,
    lng: 73.7389,
    area: 'Hinjewadi',
    city: 'Pune',
    colleges: ['Symbiosis International', 'I2IT Pune'],
    landmarks: ['Quadron Business Park'],
  },
  'Skyline Luxury PG': {
    lat: 28.4950,
    lng: 77.0895,
    area: 'Cyber City',
    city: 'Gurugram',
    colleges: ['MDI Gurugram'],
    landmarks: ['DLF CyberHub'],
  },
  'Coastal Breeze Stays': {
    lat: 12.9796,
    lng: 80.2209,
    area: 'Velachery',
    city: 'Chennai',
    colleges: ['IIT Madras', 'Anna University'],
    landmarks: ['Phoenix Marketcity'],
  }
};

const AREA_COORDINATES = {
  'koramangala': [12.9352, 77.6245],
  'indiranagar': [12.9784, 77.6408],
  'hitech city': [17.4435, 78.3772],
  'gachibowli': [17.4401, 78.3489],
  'hinjewadi': [18.5912, 73.7389],
  'viman nagar': [18.5679, 73.9143],
  'cyber city': [28.4950, 77.0895],
  'bandra': [19.0596, 72.8295],
  'velachery': [12.9796, 80.2209],
};

const getPropertyCoords = (hostel) => {
  const meta = PROPERTY_METADATA[hostel.name] || PROPERTY_METADATA[hostel.code];
  if (meta) return [meta.lat, meta.lng];
  
  // Fallback to address matching
  const addr = hostel.address?.toLowerCase() || '';
  if (addr.includes('patia')) return [20.3588, 85.8166];
  if (addr.includes('shampur') || addr.includes('patrapada')) return [20.2885, 85.7766];
  if (addr.includes('mancheswar') || addr.includes('rangamatia')) return [20.3259, 85.8672];
  
  // Deterministic fallback coordinate
  let hash = 0;
  const name = hostel.name || '';
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const latOffset = (hash % 100) / 2000;
  const lngOffset = ((hash >> 8) % 100) / 2000;
  return [20.2961 + latOffset, 85.8245 + lngOffset];
};

const matchesQuery = (h, query) => {
  if (!query) return true;
  const q = query.toLowerCase();
  
  if (h.name.toLowerCase().includes(q)) return true;
  if (h.address.toLowerCase().includes(q)) return true;
  if (h.description?.toLowerCase().includes(q)) return true;
  
  const meta = PROPERTY_METADATA[h.name];
  if (meta) {
    if (meta.area.toLowerCase().includes(q)) return true;
    if (meta.colleges.some(c => c.toLowerCase().includes(q))) return true;
    if (meta.landmarks.some(l => l.toLowerCase().includes(q))) return true;
  }
  
  return false;
};

function FadeIn({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function RatingStars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`w-3.5 h-3.5 ${n <= Math.floor(rating) ? 'fill-amber-400 text-amber-400' : n <= rating ? 'fill-amber-400/50 text-amber-400' : 'text-[#D5CFC7]'}`}
        />
      ))}
    </div>
  );
}

function OccupancyBar({ rate }) {
  const color = rate >= 90 ? 'bg-red-400' : rate >= 70 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="w-full h-1.5 rounded-full bg-[#E8E0D8]/60 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${rate}%` }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
      />
    </div>
  );
}

export default function HostelListingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('name');
  const [mobileNav, setMobileNav] = useState(false);

  // Search states & Map integration
  const [searchQuery, setSearchQuery] = useState('');
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [activeHostelId, setActiveHostelId] = useState(null);
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Dynamic Image Fetching using custom hooks
  const logo = useWebsiteImage('website_logo');
  const footerLogo = useWebsiteImage('footer_logo');
  const defaultProperty = useWebsiteImage('default_property');
  const { images: hostelCovers } = useWebsiteImages('hostel_cover');

  // Parse URL search params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const search = params.get('search') || '';
    setSearchQuery(search);
  }, [location.search]);

  // Fetch hostels
  useEffect(() => {
    setError(null);
    api.get('/hostels/public')
      .then(res => setHostels(res.data))
      .catch(err => {
        console.error(err);
        setError('Failed to load hostels list. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  // Dynamically load Leaflet assets
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setLeafletLoaded(true);
      document.body.appendChild(script);
    } else {
      setLeafletLoaded(true);
    }
  }, []);

  const filtered = useMemo(() => {
    return hostels
      .filter(h => filter === 'all' || h.hostel_type === filter)
      .filter(h => matchesQuery(h, searchQuery))
      .sort((a, b) => {
        if (sort === 'rent') return (a.starting_rent || 0) - (b.starting_rent || 0);
        if (sort === 'rating') return (b.average_rating || 0) - (a.average_rating || 0);
        if (sort === 'availability') return (b.available_beds || 0) - (a.available_beds || 0);
        return a.name.localeCompare(b.name);
      });
  }, [hostels, filter, sort, searchQuery]);

  // Marker highlighting utility
  const updateMarkerHighlight = (activeId) => {
    if (!window.L || !mapInstanceRef.current) return;
    markersRef.current.forEach(item => {
      const markerEl = document.getElementById(`marker-${item.id}`);
      if (markerEl) {
        if (item.id === activeId) {
          markerEl.className = "bg-[#2D5F3F] border-2 border-[#2D5F3F] text-white font-bold rounded-full px-2.5 py-1 shadow-2xl text-xs transition-all duration-300 transform scale-125 z-[1000] flex items-center gap-1 cursor-pointer whitespace-nowrap";
        } else {
          markerEl.className = "bg-white border-2 border-[#2D5F3F] text-[#2D5F3F] font-bold rounded-full px-2.5 py-1 shadow-lg text-xs transition-all duration-300 hover:bg-[#2D5F3F] hover:text-white transform hover:scale-110 flex items-center gap-1 cursor-pointer whitespace-nowrap";
        }
      }
    });
  };

  // Synchronize map center and markers when listing updates
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const L = window.L;

    // Center on India center default
    let center = [20.5937, 78.9629];
    let zoom = 5;

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const areaMatch = Object.keys(AREA_COORDINATES).find(key => q.includes(key) || key.includes(q));
      if (areaMatch) {
        center = AREA_COORDINATES[areaMatch];
        zoom = 14;
      } else {
        const matchedProperty = filtered.find(h => h.name.toLowerCase().includes(q));
        if (matchedProperty) {
          center = getPropertyCoords(matchedProperty);
          zoom = 14;
        } else if (filtered.length > 0) {
          center = getPropertyCoords(filtered[0]);
          zoom = 13;
        }
      }
    } else if (filtered.length > 0) {
      center = getPropertyCoords(filtered[0]);
      zoom = 12;
    }

    const map = L.map(mapRef.current, { zoomControl: false }).setView(center, zoom);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    markersRef.current = [];

    filtered.forEach(h => {
      const coords = getPropertyCoords(h);
      const icon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div id="marker-${h.id}" class="bg-white border-2 border-[#2D5F3F] text-[#2D5F3F] font-bold rounded-full px-2.5 py-1 shadow-lg text-xs transition-all duration-300 hover:bg-[#2D5F3F] hover:text-white transform hover:scale-110 flex items-center gap-1 cursor-pointer whitespace-nowrap">
            <span style="font-family: 'Outfit', sans-serif">₹${(h.starting_rent || 0).toLocaleString()}</span>
          </div>
        `,
        iconSize: [60, 24],
        iconAnchor: [30, 12]
      });

      const marker = L.marker(coords, { icon }).addTo(map);
      markersRef.current.push({ id: h.id, marker });

      marker.on('click', () => {
        setActiveHostelId(h.id);
        updateMarkerHighlight(h.id);
        const card = document.getElementById(`listing-card-${h.id}`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    if (filtered.length > 1) {
      const bounds = L.latLngBounds(filtered.map(h => getPropertyCoords(h)));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [leafletLoaded, filtered, searchQuery]);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Stays', href: '/hostels' },
    { label: 'Contact', action: () => navigate('/#contact') },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917]" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ━━ NAV ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#E8E0D8]/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" data-testid="listing-nav-logo">
            {logo.loading ? (
              <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse" />
            ) : logo.image ? (
              <img
                src={logo.image}
                alt={logo.alt_text || "Subhouz Logo"}
                className="w-8 h-8 object-contain"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#2D5F3F] flex items-center justify-center">
                <span className="text-white font-bold text-sm" style={{ fontFamily: "'Fraunces', serif" }}>S</span>
              </div>
            )}
            <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Subhouz</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(l => (
              <Link key={l.label} to={l.href || '#'} onClick={l.action} className="text-[13px] font-medium text-[#6B5E54] hover:text-[#1C1917] tracking-wide transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/#contact')} className="hidden sm:inline-flex bg-[#2D5F3F] hover:bg-[#1F4A2E] text-white rounded-full px-5 h-9 text-[13px] font-semibold tracking-wide shadow-sm" data-testid="listing-enquiry-btn">
              Send an Enquiry
            </Button>
            <button className="md:hidden p-2" onClick={() => setMobileNav(!mobileNav)}>
              {mobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* ━━ PAGE HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pt-28 pb-12 lg:pt-32 lg:pb-16 bg-[#1C1917] relative overflow-hidden" data-testid="listing-header">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-[#2D5F3F]/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-[#D4A574] text-xs font-semibold tracking-[0.25em] uppercase mb-4">
            Our Properties
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-tight mb-4"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Find Your Perfect Stay
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="text-[#A39889] text-base sm:text-lg max-w-2xl leading-relaxed">
            Explore verified PGs, hostels, co-living spaces, and rental apartments across major Indian cities. Each property offers a unique blend of comfort, security, and community.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.45, duration: 0.5 }}
            className="mt-6 max-w-xl relative"
          >
            <div className="relative flex items-center bg-white rounded-full p-1 shadow-lg border border-slate-200">
              <Search className="w-5 h-5 text-[#2D5F3F] absolute left-4 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Area, Landmark, College or Property..."
                className="w-full bg-transparent border-none text-slate-800 placeholder-slate-400 font-medium text-sm h-10 pl-11 pr-10 focus:outline-none"
                data-testid="listing-search-input"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 text-slate-400 hover:text-slate-600 p-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ━━ FILTERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="sticky top-16 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8E0D8]/60 py-4">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#6B5E54]">Filter:</span>
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'boys', label: 'Boys' },
                { value: 'girls', label: 'Girls' },
                { value: 'mixed', label: 'Co-ed' },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  data-testid={`filter-${f.value}`}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                    filter === f.value
                      ? 'bg-[#2D5F3F] text-white shadow-sm'
                      : 'bg-white border border-[#E8E0D8] text-[#6B5E54] hover:border-[#2D5F3F]/40 hover:text-[#2D5F3F]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#8C7E72]" />
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-40 h-8 text-xs border-[#E8E0D8] rounded-full bg-white" data-testid="sort-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="rent">Lowest Rent</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="availability">Most Available</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ━━ HOSTEL GRID ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-8 lg:py-12" data-testid="hostel-listing-grid">
        <div className="max-w-[1600px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_580px] gap-8 items-start">
          
          {/* Left Column: Properties Listings */}
          <div className="space-y-6 order-2 lg:order-1 w-full animate-fade-in">
            {loading ? (
              <div className="grid grid-cols-1 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-3xl border border-[#E8E0D8] overflow-hidden animate-pulse p-6">
                    <div className="h-64 bg-[#E8E0D8]/50 rounded-2xl" />
                    <div className="p-6 space-y-4">
                      <div className="h-6 bg-[#E8E0D8]/50 rounded w-48" />
                      <div className="h-4 bg-[#E8E0D8]/50 rounded w-full" />
                      <div className="h-4 bg-[#E8E0D8]/50 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-[#E8E0D8] p-8 shadow-sm">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-[#1C1917]" style={{ fontFamily: "'Fraunces', serif" }}>
                  Error Loading Stays
                </h3>
                <p className="text-sm text-[#8C7E72] mt-2 max-w-sm mx-auto">
                  {error}
                </p>
                <button 
                  onClick={() => {
                    setLoading(true);
                    setError(null);
                    api.get('/hostels/public')
                      .then(res => setHostels(res.data))
                      .catch(err => setError('Failed to load hostels list.'))
                      .finally(() => setLoading(false));
                  }}
                  className="mt-6 px-5 py-2.5 bg-[#2D5F3F] hover:bg-[#1F4A2E] text-white rounded-full text-xs font-semibold shadow-sm transition-all duration-200"
                >
                  Try Again
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-[#E8E0D8] p-8 shadow-sm">
                <Building2 className="w-16 h-16 text-[#D5CFC7] mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[#1C1917]" style={{ fontFamily: "'Fraunces', serif" }}>
                  No properties found in this area
                </h3>
                <p className="text-sm text-[#8C7E72] mt-2 max-w-sm mx-auto">
                  No properties found in this area. Try searching nearby locations or resetting your filters.
                </p>
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="mt-6 px-5 py-2.5 bg-[#2D5F3F] hover:bg-[#1F4A2E] text-white rounded-full text-xs font-semibold shadow-sm transition-all duration-200"
                  >
                    Clear Search Filter
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {filtered.map((h, i) => {
                  const customCover = hostelCovers.find(c => c.hostel_id === h.id)?.image;
                  const finalCover = customCover || defaultProperty.image || HOSTEL_COVERS[h.name] || 'https://images.unsplash.com/photo-1776763255235-046cd40f3093?auto=format&fit=crop&w=900&q=80';
                  return (
                    <FadeIn key={h.id} delay={i * 0.1}>
                      <div
                        id={`listing-card-${h.id}`}
                        onMouseEnter={() => {
                          setActiveHostelId(h.id);
                          updateMarkerHighlight(h.id);
                        }}
                        onMouseLeave={() => {
                          setActiveHostelId(null);
                          updateMarkerHighlight(null);
                        }}
                        className={`group bg-white rounded-3xl border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 ${
                          activeHostelId === h.id ? 'border-[#2D5F3F] ring-2 ring-[#2D5F3F]/20 scale-[1.01]' : 'border-[#E8E0D8]'
                        }`}
                        data-testid={`listing-card-${h.id}`}
                      >
                        <div className="grid lg:grid-cols-[380px_1fr]">
                          {/* Cover image */}
                          <div className="relative h-72 lg:h-full overflow-hidden">
                            <img
                              src={finalCover}
                              alt={h.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                            {/* Type badge */}
                            <div className="absolute top-4 left-4">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full backdrop-blur-md border ${
                                h.hostel_type === 'boys' ? 'bg-blue-500/20 text-white border-blue-300/30' :
                                h.hostel_type === 'girls' ? 'bg-pink-500/20 text-white border-pink-300/30' :
                                'bg-purple-500/20 text-white border-purple-300/30'
                              }`}>
                                {h.hostel_type === 'boys' ? 'Boys Stay' : h.hostel_type === 'girls' ? 'Girls Stay' : 'Co-ed'}
                              </span>
                            </div>

                            {/* Rating overlay */}
                            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span className="text-white text-sm font-semibold">{h.average_rating}</span>
                              <span className="text-white/60 text-xs">({h.review_count} reviews)</span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-6 lg:p-8 flex flex-col justify-between">
                            <div>
                              {/* Header row */}
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h2 className="text-xl lg:text-2xl font-semibold tracking-tight text-[#1C1917] group-hover:text-[#2D5F3F] transition-colors" style={{ fontFamily: "'Fraunces', serif" }}>
                                    {h.name}
                                  </h2>
                                  <p className="text-sm text-[#8C7E72] flex items-start gap-1.5 mt-1">
                                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    <span>{h.address}, {h.city}</span>
                                  </p>
                                </div>
                                <div className="text-right shrink-0 ml-4">
                                  <p className="text-xs text-[#8C7E72] uppercase tracking-wider font-medium">From</p>
                                  <p className="text-2xl font-bold text-[#2D5F3F]" style={{ fontFamily: "'Fraunces', serif" }}>
                                    ₹{h.starting_rent?.toLocaleString()}
                                  </p>
                                  <p className="text-[10px] text-[#8C7E72]">per month</p>
                                </div>
                              </div>

                              {/* Description */}
                              <p className="text-sm text-[#6B5E54] leading-relaxed mb-4 line-clamp-2">
                                {h.description}
                              </p>

                              {/* Stats row */}
                              <div className="grid grid-cols-3 gap-4 mb-5">
                                <div className="bg-[#FAF7F2] rounded-xl p-3 text-center">
                                  <p className="text-lg font-bold text-[#1C1917]" style={{ fontFamily: "'Fraunces', serif" }}>{h.total_rooms}</p>
                                  <p className="text-[10px] text-[#8C7E72] uppercase tracking-wider font-medium">Rooms</p>
                                </div>
                                <div className="bg-[#FAF7F2] rounded-xl p-3 text-center">
                                  <p className="text-lg font-bold text-[#2D5F3F]" style={{ fontFamily: "'Fraunces', serif" }}>{h.available_beds}</p>
                                  <p className="text-[10px] text-[#8C7E72] uppercase tracking-wider font-medium">Beds Free</p>
                                </div>
                                <div className="bg-[#FAF7F2] rounded-xl p-3 text-center">
                                  <div className="mb-1">
                                    <p className="text-lg font-bold text-[#1C1917]" style={{ fontFamily: "'Fraunces', serif" }}>{h.occupancy_rate}%</p>
                                  </div>
                                  <OccupancyBar rate={h.occupancy_rate} />
                                  <p className="text-[10px] text-[#8C7E72] uppercase tracking-wider font-medium mt-1">Occupancy</p>
                                </div>
                              </div>

                              {/* Facilities */}
                              <div className="flex flex-wrap gap-2 mb-5">
                                {(h.facilities || []).slice(0, 8).map((f, fi) => {
                                  const FIcon = FACILITY_ICONS[f] || Shield;
                                  return (
                                    <span key={fi} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F3EDE6] text-[10px] font-medium text-[#6B5E54] border border-[#E8E0D8]/50" data-testid={`facility-${h.id}-${fi}`}>
                                      <FIcon className="w-3 h-3 text-[#2D5F3F]" /> {f}
                                    </span>
                                  );
                                })}
                                {(h.facilities || []).length > 8 && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#F3EDE6] text-[10px] font-medium text-[#8C7E72]">
                                    +{h.facilities.length - 8} more
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-4 border-t border-[#E8E0D8]/60">
                              <Button
                                data-testid={`view-details-${h.id}`}
                                onClick={() => navigate(`/hostels/${h.id}`)}
                                className="flex-1 bg-[#2D5F3F] hover:bg-[#1F4A2E] text-white rounded-full h-11 text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                              >
                                View Details <ArrowRight className="w-4 h-4 ml-2" />
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => navigate('/#contact')}
                                className="rounded-full h-11 px-6 border-[#2D5F3F]/30 text-[#2D5F3F] hover:bg-[#2D5F3F] hover:text-white text-sm font-semibold transition-all duration-200"
                                data-testid={`enquire-listing-${h.id}`}
                              >
                                Enquire
                              </Button>
                              {h.phone && (
                                <a href={`tel:${h.phone}`} className="w-11 h-11 rounded-full border border-[#E8E0D8] flex items-center justify-center hover:bg-[#F3EDE6] transition-colors" data-testid={`call-hostel-${h.id}`}>
                                  <Phone className="w-4 h-4 text-[#6B5E54]" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </FadeIn>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Responsive & Sticky Map Container */}
          <div className="w-full h-[320px] lg:h-[calc(100vh-175px)] rounded-3xl overflow-hidden border border-[#E8E0D8] shadow-md lg:shadow-xl order-1 lg:order-2 lg:sticky lg:top-[140px]">
            <div ref={mapRef} className="w-full h-full bg-[#E8E0D8]/20 z-10" />
          </div>

        </div>
      </section>

      {/* ━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="bg-[#1C1917] border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {footerLogo.loading ? (
              <div className="w-6 h-6 rounded-md bg-white/10 animate-pulse" />
            ) : footerLogo.image ? (
              <img
                src={footerLogo.image}
                alt={footerLogo.alt_text || "Subhouz Footer Logo"}
                className="w-6 h-6 object-contain"
              />
            ) : (
              <div className="w-6 h-6 rounded-md bg-[#2D5F3F] flex items-center justify-center">
                <span className="text-white font-bold text-[10px]" style={{ fontFamily: "'Fraunces', serif" }}>S</span>
              </div>
            )}
            <span className="text-white text-sm font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>Subhouz</span>
            <span className="text-xs text-[#6B5E54] ml-1">India</span>
          </div>
          <div className="flex items-center gap-6">
            <p className="text-xs text-[#4A4340]">&copy; {new Date().getFullYear()} Subhouz</p>
            <Link to="/login" className="text-xs text-[#4A4340] hover:text-[#6B5E54] transition-colors" data-testid="listing-footer-admin">Admin Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
