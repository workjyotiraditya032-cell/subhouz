import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { MapPin, Phone, Star, Users, DoorOpen, ArrowRight, Wifi, Shield, Camera, Car, Dumbbell, UtensilsCrossed, Waves, Wind, Droplets, Sun, ChevronDown, Search, SlidersHorizontal, Building2, Menu, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import api from '../lib/api';

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
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('name');
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    api.get('/hostels/public')
      .then(res => setHostels(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = hostels
    .filter(h => filter === 'all' || h.hostel_type === filter)
    .sort((a, b) => {
      if (sort === 'rent') return (a.starting_rent || 0) - (b.starting_rent || 0);
      if (sort === 'rating') return (b.average_rating || 0) - (a.average_rating || 0);
      if (sort === 'availability') return (b.available_beds || 0) - (a.available_beds || 0);
      return a.name.localeCompare(b.name);
    });

  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMobileNav(false); };
  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Hostels', href: '/hostels' },
    { label: 'Contact', action: () => navigate('/#contact') },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917]" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ━━ NAV ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#E8E0D8]/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" data-testid="listing-nav-logo">
            <div className="w-8 h-8 rounded-lg bg-[#2D5F3F] flex items-center justify-center">
              <span className="text-white font-bold text-sm" style={{ fontFamily: "'Fraunces', serif" }}>S</span>
            </div>
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
            Explore our carefully curated hostels in Bhubaneswar. Each property offers a unique blend of comfort, convenience, and community.
          </motion.p>
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
      <section className="py-12 lg:py-16" data-testid="hostel-listing-grid">
        <div className="max-w-7xl mx-auto px-6">
          {loading ? (
            <div className="grid lg:grid-cols-2 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-[#E8E0D8] overflow-hidden animate-pulse">
                  <div className="h-64 bg-[#E8E0D8]/50" />
                  <div className="p-6 space-y-4">
                    <div className="h-6 bg-[#E8E0D8]/50 rounded w-48" />
                    <div className="h-4 bg-[#E8E0D8]/50 rounded w-full" />
                    <div className="h-4 bg-[#E8E0D8]/50 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Building2 className="w-16 h-16 text-[#D5CFC7] mx-auto mb-4" />
              <p className="text-lg font-medium text-[#6B5E54]">No hostels match your filter</p>
              <p className="text-sm text-[#8C7E72] mt-1">Try selecting "All" to see all properties</p>
            </div>
          ) : (
            <div className="space-y-10">
              {filtered.map((h, i) => (
                <FadeIn key={h.id} delay={i * 0.1}>
                  <div
                    className="group bg-white rounded-2xl border border-[#E8E0D8] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500"
                    data-testid={`listing-card-${h.id}`}
                  >
                    <div className="grid lg:grid-cols-[420px_1fr]">
                      {/* Cover image */}
                      <div className="relative h-72 lg:h-full overflow-hidden">
                        <img
                          src={HOSTEL_COVERS[h.name] || 'https://images.unsplash.com/photo-1776763255235-046cd40f3093?auto=format&fit=crop&w=900&q=80'}
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
                            {h.hostel_type === 'boys' ? 'Boys Hostel' : h.hostel_type === 'girls' ? 'Girls PG' : 'Co-ed'}
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
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="bg-[#1C1917] border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#2D5F3F] flex items-center justify-center">
              <span className="text-white font-bold text-[10px]" style={{ fontFamily: "'Fraunces', serif" }}>S</span>
            </div>
            <span className="text-white text-sm font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>Subhouz</span>
            <span className="text-xs text-[#6B5E54] ml-1">Bhubaneswar, Odisha</span>
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
