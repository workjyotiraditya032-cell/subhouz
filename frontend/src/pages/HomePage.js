import { useState, useEffect, useRef, useMemo } from 'react';
/* Inter + Plus Jakarta Sans for the premium header */
import { useNavigate, Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import SearchBar from '../components/search/SearchBar';
import { Check, ArrowRight, MapPin, Phone, Mail, Wifi, Shield, Droplets, Wind, Sun, Users, ChevronDown, Menu, X, Send, Search, Clock, Sparkles, Building2, Wrench, Zap, Home } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import api from '../lib/api';
import { useWebsiteImage, useWebsiteImages } from '../hooks/useWebsiteImages';

/* ── images ─────────────────────────────────────────── */
const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1776763255235-046cd40f3093?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1656274274410-4a3f86a0fa6f?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1552858725-693709cc17c7?auto=format&fit=crop&w=1600&q=80',
];

const HOSTEL_IMAGES = {
  'Jogmaya Hostel': 'https://images.unsplash.com/photo-1612913959689-a83136ac4e7c?auto=format&fit=crop&w=800&q=80',
  'Homely Havens Girls PG': 'https://images.unsplash.com/photo-1775742138486-afd4262157c1?auto=format&fit=crop&w=800&q=80',
  'GopalSarojini (GS) Residency': 'https://images.unsplash.com/photo-1705708001177-4f664a339b78?auto=format&fit=crop&w=800&q=80',
};

const GALLERY_IMAGES = [
  { src: 'https://images.unsplash.com/photo-1552858725-2758b5fb1286?auto=format&fit=crop&w=600&q=80', alt: 'Cozy room with warm lighting' },
  { src: 'https://images.unsplash.com/photo-1776763255235-046cd40f3093?auto=format&fit=crop&w=600&q=80', alt: 'Modern common lounge' },
  { src: 'https://images.unsplash.com/photo-1656274274410-4a3f86a0fa6f?auto=format&fit=crop&w=600&q=80', alt: 'Bright, clean bedroom' },
  { src: 'https://images.unsplash.com/photo-1578112010316-b44c50d27b2b?auto=format&fit=crop&w=600&q=80', alt: 'Reading nook' },
  { src: 'https://images.unsplash.com/photo-1552858725-693709cc17c7?auto=format&fit=crop&w=600&q=80', alt: 'Boutique hostel room' },
  { src: 'https://images.unsplash.com/photo-1612913959689-a83136ac4e7c?auto=format&fit=crop&w=600&q=80', alt: 'Hostel exterior' },
];

const AMENITIES = [
  { icon: Wifi, label: 'High-Speed Wi-Fi' },
  { icon: Shield, label: '24/7 Security' },
  { icon: Droplets, label: 'Water Purifier' },
  { icon: Wind, label: 'AC & Non-AC Options' },
  { icon: Sun, label: 'Power Backup' },
  { icon: Users, label: 'Common Areas' },
];

const TRUST = [
  'Verified & Secure Stays Across India',
  'Hostels, PGs & Co-Living Spaces',
  'Multi-City Rental Discovery',
  'Transparent Rent & Automated Payments',
  '24/7 Tenant & Manager Support',
];

const STATIC_TESTIMONIALS = [
  {
    id: 'static-1',
    title: 'Rohan Sharma',
    description: 'SUBHOUZ made finding a verified PG in Koramangala, Bengaluru incredibly simple and seamless. The property details and digital payments were top-notch!',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    alt_text: 'Rohan Sharma Review'
  },
  {
    id: 'static-2',
    title: 'Ananya Mishra',
    description: 'Living at Homely Havens PG in Hitech City, Hyderabad has been a fantastic experience. Digital rent tracking and rapid maintenance responses make it hassle-free.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    alt_text: 'Ananya Mishra Review'
  },
  {
    id: 'static-3',
    title: 'Pritam Das',
    description: 'Managing our 3 co-living properties in Hinjewadi, Pune using SUBHOUZ has automated our rent collection and electricity billing completely.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    alt_text: 'Pritam Das Review'
  }
];

const STATIC_BLOGS = [
  {
    id: 'static-b1',
    title: 'How to Find the Perfect Rental Accommodation in Top Indian Metro Cities',
    description: 'Discover the key factors to evaluate when booking a PG, hostel, or co-living space across major Indian tech and education hubs.',
    image: 'https://images.unsplash.com/photo-1552858725-2758b5fb1286?auto=format&fit=crop&w=600&q=80',
    alt_text: 'Finding rental room blog'
  },
  {
    id: 'static-b2',
    title: 'Smart Property Operations: Streamlining PG & Rental Management in India',
    description: 'Learn how automated rent collection, digital utility split billing, and instant tenant onboarding are transforming property management.',
    image: 'https://images.unsplash.com/photo-1578112010316-b44c50d27b2b?auto=format&fit=crop&w=600&q=80',
    alt_text: 'Property operations blog'
  }
];

const SEARCH_SUGGESTIONS = {
  locations: ['Bengaluru', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi NCR', 'Chennai', 'Kolkata', 'Jaipur'],
  colleges: ['IISc Bengaluru', 'IIT Bombay', 'IIT Delhi', 'BITS Pilani', 'Anna University'],
  landmarks: ['Koramangala', 'Hitech City', 'Hinjewadi', 'Cyber City', 'Indiranagar'],
};

/* ── section fade-in wrapper ────────────────────────── */
function FadeIn({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── hero image carousel ────────────────────────────── */
function HeroCarousel({ images }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!images || images.length === 0) return;
    const t = setInterval(() => setIdx(i => (i + 1) % images.length), 6000);
    return () => clearInterval(t);
  }, [images]);

  if (!images || images.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.img
          key={idx}
          src={images[idx]}
          alt="Hostel interior"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 2,
            ease: "easeInOut"
          }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>
      {/* warm overlay for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#1C1917]/80 via-[#1C1917]/50 to-[#1C1917]/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917]/60 via-transparent to-transparent" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function HomePage() {
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = useState(false);
  const [hostels, setHostels] = useState([]);
  const [enquiry, setEnquiry] = useState({ name: '', phone: '', email: '', preferred_hostel: '', message: '' });
  const [sending, setSending] = useState(false);

  // Dynamic Image Fetching using the reusable hooks
  const logo = useWebsiteImage('website_logo');
  const footerLogo = useWebsiteImage('footer_logo');
  const heroSideImage = useWebsiteImage('hero_side_image');
  const aboutImage = useWebsiteImage('about_image');
  const contactBanner = useWebsiteImage('contact_banner');
  const defaultProperty = useWebsiteImage('default_property');

  const { images: dbHeroBackgrounds, loading: heroLoading } = useWebsiteImages('hero_background');
  const { images: dbGallery, loading: galleryLoading } = useWebsiteImages('gallery');
  const { images: dbTestimonials } = useWebsiteImages('testimonial');
  const { images: dbBlogs } = useWebsiteImages('blog');
  const { images: dbAds } = useWebsiteImages('advertisement');
  const { images: hostelCovers } = useWebsiteImages('hostel_cover');

  // Compute dynamic lists with fallbacks
  const heroBackgrounds = useMemo(() => {
    if (dbHeroBackgrounds && dbHeroBackgrounds.length > 0) {
      return dbHeroBackgrounds.map(img => img.image);
    }
    return HERO_IMAGES;
  }, [dbHeroBackgrounds]);

  const galleryImages = useMemo(() => {
    if (dbGallery && dbGallery.length > 0) {
      return dbGallery.map(img => ({
        src: img.image,
        alt: img.alt_text || img.title || "Gallery Image"
      }));
    }
    return GALLERY_IMAGES;
  }, [dbGallery]);

  const testimonialItems = useMemo(() => {
    if (dbTestimonials && dbTestimonials.length > 0) {
      return dbTestimonials;
    }
    return STATIC_TESTIMONIALS;
  }, [dbTestimonials]);

  const blogItems = useMemo(() => {
    if (dbBlogs && dbBlogs.length > 0) {
      return dbBlogs;
    }
    return STATIC_BLOGS;
  }, [dbBlogs]);

  useEffect(() => {
    // Fetch public hostel list (no auth required)
    api.get('/hostels/public').then(res => {
      if (res.data?.length) setHostels(res.data);
    }).catch(() => {
      // Fallback to static data if API unavailable
      setHostels([
        { id: '1', name: 'Apex Elite Co-Living', code: 'AEC', address: '12th Main Rd, Koramangala', city: 'Bengaluru', hostel_type: 'mixed', phone: '+91 9876543210' },
        { id: '2', name: 'Homely Havens Girls PG', code: 'HHG', address: 'Phase 2, Hitech City', city: 'Hyderabad', hostel_type: 'girls', phone: '+91 9876543211' },
        { id: '3', name: 'Grand Horizon Stays', code: 'GHS', address: 'Phase 1, Hinjewadi', city: 'Pune', hostel_type: 'mixed', phone: '+91 9876543212' },
      ]);
    });
  }, []);

  const submitEnquiry = async () => {
    if (!enquiry.name || !enquiry.phone) { toast.error('Name and phone are required'); return; }
    setSending(true);
    try {
      await api.post('/automation/enquiries', enquiry);
      toast.success('Enquiry sent! We\'ll get back to you shortly.');
      setEnquiry({ name: '', phone: '', email: '', preferred_hostel: '', message: '' });
    } catch (err) {
      console.error('Enquiry submission error:', err);
      toast.error('Could not send enquiry. Please try again or call us directly.');
    } finally { setSending(false); }
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileNav(false);
  };

  /* ── NAV ─────────────────────────────────────────── */
  const navLinks = [
    { label: 'Home', action: () => scrollTo('hero') },
    { label: 'Stays', action: () => navigate('/hostels') },
    { label: 'About', action: () => scrollTo('about') },
    { label: 'Amenities', action: () => scrollTo('amenities') },
    { label: 'Gallery', action: () => scrollTo('gallery') },
    { label: 'Contact', action: () => scrollTo('contact') },
  ];

  return (
    <div className="bg-[#FAF7F2] text-[#1C1917] overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ━━ NAVIGATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#EFEFEF]">
        {/* ── inner container: max-width 1280px, centered ── */}
        <div className="px-4 sm:px-6 md:px-10 h-16 sm:h-20 max-w-[1280px] mx-auto flex items-center justify-between relative">
          {/* ── LEFT: Logo + Wordmark ── */}
          <button
            onClick={() => scrollTo('hero')}
            data-testid="nav-logo"
            className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer p-0 shrink-0"
          >
            {logo.loading ? (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-200 animate-pulse" />
            ) : logo.image ? (
              <img
                src={logo.image}
                alt={logo.alt_text || 'Subhouz Logo'}
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain transition-transform duration-300 hover:scale-105"
              />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#1D4ED8] flex items-center justify-center text-white font-bold text-base sm:text-lg shrink-0">
                <span>S</span>
              </div>
            )}
            <span className="text-xl sm:text-2xl font-bold text-[#DC2626] tracking-tight leading-none font-sans">
              Subhouz
            </span>
          </button>

          {/* ── CENTER: Desktop nav links (absolutely centered) ── */}
          <div
            className="hidden lg:flex"
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              alignItems: 'center',
              gap: '36px',
            }}
          >
            {navLinks.map(l => (
              <button
                key={l.label}
                onClick={l.action}
                data-testid={`nav-${l.label.toLowerCase()}`}
                className="subhouz-nav-link"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 500,
                  color: '#333333',
                  textDecoration: 'none',
                  padding: '6px 0',
                  position: 'relative',
                  transition: 'color 0.2s ease',
                  fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#1D4ED8';
                  const line = e.currentTarget.querySelector('.nav-underline');
                  if (line) line.style.width = '100%';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = '#333333';
                  const line = e.currentTarget.querySelector('.nav-underline');
                  if (line) line.style.width = '0%';
                }}
              >
                {l.label}
                <span
                  className="nav-underline"
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    left: 0,
                    height: 2,
                    width: '0%',
                    background: '#1D4ED8',
                    borderRadius: 999,
                    transition: 'width 0.25s ease',
                    display: 'block',
                  }}
                />
              </button>
            ))}
          </div>

          {/* ── RIGHT: CTA + Mobile hamburger ── */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Desktop CTA */}
            <button
              data-testid="nav-enquiry-btn"
              onClick={() => scrollTo('contact')}
              className="hidden md:inline-flex bg-[#16A34A] hover:bg-[#15803D] text-white rounded-full px-6 lg:px-7 h-10 lg:h-12 text-sm lg:text-15 font-semibold items-center justify-center transition-all duration-200 hover:scale-[1.03] shadow-md shadow-green-700/20 tracking-wide"
            >
              Send an Enquiry
            </button>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden flex items-center justify-center p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              onClick={() => setMobileNav(!mobileNav)}
              data-testid="mobile-nav-toggle"
              aria-label="Toggle navigation menu"
            >
              {mobileNav ? <X className="w-6 h-6 stroke-[2.2]" /> : <Menu className="w-6 h-6 stroke-[2.2]" />}
            </button>
          </div>
        </div>

        {/* ── Mobile Slide-over Drawer Menu ── */}
        <AnimatePresence>
          {mobileNav && (
            <>
              {/* Backdrop Overlay */}
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileNav(false)}
                className="fixed inset-0 bg-[#1C1917]/50 backdrop-blur-sm z-40 lg:hidden"
              />

              {/* Slide Drawer */}
              <motion.div
                key="drawer"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className="fixed inset-y-0 right-0 h-full w-[310px] max-w-[85vw] bg-white shadow-2xl z-50 flex flex-col p-5 sm:p-6 lg:hidden border-l border-slate-100"
              >
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    {logo.image ? (
                      <img src={logo.image} alt={logo.alt_text || 'Subhouz Logo'} className="w-8 h-8 object-contain" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-[#1D4ED8] flex items-center justify-center text-white font-bold text-sm">S</div>
                    )}
                    <span className="text-xl font-bold text-[#DC2626] font-sans">Subhouz</span>
                  </div>
                  <button
                    onClick={() => setMobileNav(false)}
                    className="p-2 -mr-1 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5 stroke-[2.2]" />
                  </button>
                </div>

                {/* Navigation Links */}
                <div className="flex flex-col gap-1 py-4 overflow-y-auto flex-1 custom-scrollbar">
                  {navLinks.map(l => (
                    <button
                      key={l.label}
                      onClick={() => {
                        l.action();
                        setMobileNav(false);
                      }}
                      className="text-left py-2.5 px-3 rounded-xl text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/60 font-semibold text-sm sm:text-base transition-all font-sans flex items-center justify-between"
                    >
                      <span>{l.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100" />
                    </button>
                  ))}

                  <div className="my-2 border-t border-slate-100" />

                  {/* Direct Stays Search Link */}
                  <button
                    onClick={() => {
                      navigate('/hostels');
                      setMobileNav(false);
                    }}
                    className="text-left py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 font-semibold text-sm transition-all flex items-center gap-2.5"
                  >
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <span>Explore All Properties</span>
                  </button>

                  {/* Quick Call Link */}
                  <a
                    href="tel:+919937066699"
                    className="text-left py-2.5 px-3 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-all flex items-center gap-2.5"
                  >
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>Call Support (+91 99370 66699)</span>
                  </a>

                  {/* Admin Login Link */}
                  <button
                    onClick={() => {
                      navigate('/login');
                      setMobileNav(false);
                    }}
                    className="text-left py-2.5 px-3 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-medium text-xs transition-all flex items-center gap-2.5 mt-2"
                  >
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span>Admin Portal Login</span>
                  </button>
                </div>

                {/* Bottom CTA Button */}
                <div className="pt-4 border-t border-slate-100 mt-auto space-y-2">
                  <button
                    onClick={() => {
                      scrollTo('contact');
                      setMobileNav(false);
                    }}
                    className="w-full bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white font-semibold rounded-full h-12 text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Send an Enquiry
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>

      {/* ━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        id="hero"
        className="relative min-h-fit md:min-h-screen flex items-center pt-20 pb-12 sm:pt-24 sm:pb-16 md:pt-24 md:pb-0 overflow-hidden"
      >
        {heroLoading && !dbHeroBackgrounds.length ? (
          <div className="absolute inset-0 bg-[#1C1917] animate-pulse" />
        ) : (
          <HeroCarousel images={heroBackgrounds} />
        )}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full py-10 sm:py-16 md:py-24 lg:py-32">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="inline-flex items-center px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-emerald-300 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-4 sm:mb-6 md:mb-8"
              >
                India's Smart Property & Rental Platform
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold sm:font-black text-white tracking-tight mb-4 sm:mb-6 md:mb-8 drop-shadow-2xl leading-[1.15]"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                A Place That Feels<br className="hidden sm:block" /> Like Home.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.6 }}
                className="text-sm sm:text-base md:text-xl text-white/90 leading-relaxed max-w-2xl mb-6 sm:mb-8 md:mb-10"
              >
                Discover verified rental properties, PGs, hostels, co-living spaces, and apartments across India. Smart management for owners, seamless living for tenants.
              </motion.p>

              {/* Reusable Premium Search Bar */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.6 }}
                className="relative z-30 w-full max-w-2xl mb-5 sm:mb-6 md:mb-8"
              >
                <SearchBar placeholder="Search Area, College, Landmark or Property" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75, duration: 0.5 }}
                className="flex flex-row gap-3 sm:gap-4 mb-8 sm:mb-10 w-full sm:w-auto"
              >
                <Button
                  data-testid="hero-browse-btn"
                  onClick={() => navigate('/hostels')}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-green-700 to-emerald-500 hover:scale-105 hover:shadow-2xl transition-all duration-300 rounded-full px-5 sm:px-8 h-11 sm:h-14 text-xs sm:text-base font-semibold flex justify-center items-center"
                >
                  Browse Stays <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
                </Button>
                <Button
                  data-testid="hero-enquiry-btn"
                  variant="outline"
                  onClick={() => scrollTo('contact')}
                  className="flex-1 sm:flex-none border-2 border-white/40 bg-white/10 backdrop-blur-xl hover:bg-white/20 rounded-full px-5 sm:px-8 h-11 sm:h-14 text-xs sm:text-base font-semibold flex justify-center items-center text-white"
                >
                  Send an Enquiry
                </Button>
              </motion.div>

              <div className="mt-6 sm:mt-10 md:mt-14">
                <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 max-w-2xl">
                  <div className="backdrop-blur-2xl bg-white/10 rounded-2xl sm:rounded-3xl border border-white/20 p-2.5 sm:p-4 md:p-6 text-center sm:text-left">
                    <h3 className="text-xl sm:text-3xl md:text-4xl font-black text-white">50+</h3>
                    <p className="text-white/70 mt-1 sm:mt-2 text-[10px] sm:text-xs md:text-sm">Cities</p>
                  </div>
                  <div className="backdrop-blur-2xl bg-white/10 rounded-2xl sm:rounded-3xl border border-white/20 p-2.5 sm:p-4 md:p-6 text-center sm:text-left">
                    <h3 className="text-xl sm:text-3xl md:text-4xl font-black text-white">10,000+</h3>
                    <p className="text-white/70 mt-1 sm:mt-2 text-[10px] sm:text-xs md:text-sm">Verified Stays</p>
                  </div>
                  <div className="backdrop-blur-2xl bg-white/10 rounded-2xl sm:rounded-3xl border border-white/20 p-2.5 sm:p-4 md:p-6 text-center sm:text-left">
                    <h3 className="text-xl sm:text-3xl md:text-4xl font-black text-white">100k+</h3>
                    <p className="text-white/70 mt-1 sm:mt-2 text-[10px] sm:text-xs md:text-sm">Residents</p>
                  </div>
                </div>
              </div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex flex-wrap gap-x-3 sm:gap-x-5 gap-y-1.5 sm:gap-y-2 mt-4 sm:mt-6 md:mt-8"
              >
                {TRUST.map((t, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-[10px] sm:text-xs text-white/70 font-medium">
                    <Check className="w-3 h-3 text-[#D4A574] shrink-0" /> {t}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Dynamic Hero Side Image */}
            <div className="hidden lg:block w-full lg:col-span-5 mt-10 lg:mt-0">
              {heroSideImage.loading ? (
                <div className="relative rounded-3xl overflow-hidden w-full h-[350px] lg:h-[450px] bg-white/10 border border-white/20 animate-pulse" />
              ) : heroSideImage.image ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="relative rounded-3xl overflow-hidden border border-white/20 shadow-2xl h-[350px] lg:h-[450px]"
                >
                  <img
                    src={heroSideImage.image}
                    alt={heroSideImage.alt_text || "Subhouz Hero Side Preview"}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
            <ChevronDown className="w-5 h-5 text-white/40" />
          </motion.div>
        </div>
      </section>

      {/* ━━ OUR HOSTELS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="hostels" className="py-14 sm:py-20 lg:py-28" data-testid="hostels-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <FadeIn className="max-w-xl mb-8 sm:mb-14">
            <p className="text-xs font-semibold text-[#2D5F3F] tracking-[0.2em] uppercase mb-2 sm:mb-3">Our Properties</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Find Verified Rental Properties Across India
            </h2>
            <p className="text-[#6B5E54] mt-3 sm:mt-4 text-sm sm:text-base leading-relaxed">
              Explore curated PGs, hostels, co-living spaces, and rental apartments across major Indian cities with complete peace of mind.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
            {hostels.map((h, i) => {
              const customCover = hostelCovers.find(c => c.hostel_id === h.id)?.image;
              const finalCover = customCover || defaultProperty.image || HOSTEL_IMAGES[h.name] || HERO_IMAGES[0];
              return (
                <FadeIn key={h.id} delay={i * 0.12}>
                  <div className="group rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-[#ECE5DD] shadow-md hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300" data-testid={`hostel-public-card-${h.id}`}>
                    <div className="relative h-48 sm:h-52 md:h-56 overflow-hidden">
                      <img
                        src={finalCover}
                        alt={h.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute top-3 right-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-md ${
                          h.hostel_type === 'boys' ? 'bg-blue-500/20 text-blue-100 border border-blue-300/30' :
                          h.hostel_type === 'girls' ? 'bg-pink-500/20 text-pink-100 border border-pink-300/30' :
                          'bg-purple-500/20 text-purple-100 border border-purple-300/30'
                        }`}>
                          {h.hostel_type === 'boys' ? 'Boys' : h.hostel_type === 'girls' ? 'Girls' : 'Co-ed'}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 sm:p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3
                            className="text-lg sm:text-xl font-bold text-[#1C1917]"
                            style={{ fontFamily: "'Fraunces', serif" }}
                          >
                            {h.name}
                          </h3>
                          <div className="flex items-center gap-1 mt-1 text-[#8C7E72] text-xs sm:text-sm">
                            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2D5F3F] shrink-0" />
                            <span className="truncate">{h.city}</span>
                          </div>
                        </div>
                        <span className="bg-[#2D5F3F] text-white text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full shadow shrink-0">
                          Available
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-[#6B5E54] line-clamp-2 mb-4">
                        {h.address}
                      </p>

                      {h.phone && (
                        <div className="flex items-center gap-2 mb-4 text-xs sm:text-sm text-[#6B5E54]">
                          <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2D5F3F] shrink-0" />
                          <span className="truncate">{h.phone}</span>
                        </div>
                      )}

                      <Button
                        onClick={() => navigate(`/hostels/${h.id}`)}
                        className="w-full h-11 sm:h-12 rounded-xl bg-[#2D5F3F] hover:bg-[#214B31] text-white text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-98 shadow-md flex items-center justify-center"
                        data-testid={`enquire-hostel-${h.id}`}
                      >
                        View Property →
                      </Button>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ━━ ABOUT US ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="about" className="py-14 sm:py-20 lg:py-28 bg-white" data-testid="about-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <FadeIn>
              <p className="text-xs font-semibold text-[#2D5F3F] tracking-[0.2em] uppercase mb-2 sm:mb-3">About Subhouz</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-tight mb-4 sm:mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
                We Provide Comfortable and Secure Stays for Everyone
              </h2>
              <p className="text-[#6B5E54] text-sm sm:text-base leading-relaxed mb-4 sm:mb-6">
                SUBHOUZ is India&rsquo;s Smart Property & Rental Management Platform. We empower property managers, PG operators, co-living brands, and landlords with automated operations, digital rent collection, and smart tenant management—while offering tenants a seamless rental discovery experience across India.
              </p>
              <p className="text-[#6B5E54] text-sm sm:text-base leading-relaxed mb-6 sm:mb-8">
                Whether you are a student looking for a quiet study environment or a working professional needing a comfortable space near your workplace, we have properties tailored for your needs.
              </p>
              <Button onClick={() => scrollTo('contact')} className="w-full sm:w-auto bg-[#2D5F3F] hover:bg-[#1F4A2E] text-white rounded-full px-8 h-11 sm:h-12 text-sm font-semibold shadow-md flex items-center justify-center">
                Get in Touch
              </Button>
            </FadeIn>
            <FadeIn delay={0.12}>
              <div className="relative rounded-2xl sm:rounded-[32px] overflow-hidden shadow-xl h-[220px] sm:h-[320px] md:h-[450px] border border-[#ECE5DD]">
                {aboutImage.loading ? (
                  <div className="w-full h-full bg-slate-200 animate-pulse" />
                ) : (
                  <img
                    src={aboutImage.image || 'https://images.unsplash.com/photo-1552858725-2758b5fb1286?auto=format&fit=crop&w=800&q=80'}
                    alt={aboutImage.alt_text || "About Subhouz"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ━━ AMENITIES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="amenities" className="py-14 sm:py-20 lg:py-28 bg-[#F3EDE6]" data-testid="amenities-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <FadeIn className="text-center max-w-xl mx-auto mb-10 sm:mb-14">
            <p className="text-xs font-semibold text-[#2D5F3F] tracking-[0.2em] uppercase mb-2 sm:mb-3">What We Offer</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Everything You Need for a Comfortable Stay
            </h2>
          </FadeIn>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
            {AMENITIES.map((a, i) => (
              <FadeIn key={i} delay={i * 0.06}>
                <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white p-3.5 sm:p-5 md:p-8 border border-[#ECE5DD] shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative z-10 text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#2D5F3F] to-[#4A8B5E] flex items-center justify-center shadow-md mb-3 sm:mb-5 group-hover:rotate-6 group-hover:scale-105 transition-all duration-300">
                      <a.icon className="w-6 h-6 sm:w-8 sm:h-8 text-white"/>
                    </div>
                    <h3 className="text-xs sm:text-sm md:text-base font-bold text-[#1C1917] mb-1 sm:mb-2 text-center">
                      {a.label}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[#6B5E54] leading-relaxed text-center hidden sm:block">
                      Designed for comfort and security.
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ GALLERY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="gallery" className="py-14 sm:py-20 lg:py-28" data-testid="gallery-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <FadeIn className="max-w-xl mb-8 sm:mb-14">
            <p className="text-xs font-semibold text-[#2D5F3F] tracking-[0.2em] uppercase mb-2 sm:mb-3">Gallery</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              See Where You&rsquo;ll Stay
            </h2>
          </FadeIn>
          {galleryLoading && !dbGallery.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 h-auto md:h-[460px]">
              <div className="col-span-2 row-span-2 bg-slate-200 animate-pulse rounded-2xl sm:rounded-3xl" />
              <div className="bg-slate-200 animate-pulse rounded-2xl sm:rounded-3xl" />
              <div className="bg-slate-200 animate-pulse rounded-2xl sm:rounded-3xl" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 auto-rows-[130px] sm:auto-rows-[180px] md:auto-rows-[220px]">
              {galleryImages.map((img, i) => (
                <FadeIn key={i} delay={i * 0.08}>
                  <div
                    className={`
                      group
                      relative
                      overflow-hidden
                      rounded-2xl
                      sm:rounded-3xl
                      shadow-md
                      cursor-pointer
                      ${i === 0 ? "col-span-2 h-[180px] sm:h-[260px] md:col-span-2 md:row-span-2 md:h-[460px]" : "h-[130px] sm:h-[180px] md:h-[220px]"}
                    `}
                  >
                    <img
                      src={img.src}
                      alt={img.alt}
                      loading="lazy"
                      className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                    />
                    {/* Gradient with permanent subtle caption on mobile */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 flex items-end p-2.5 sm:p-5">
                      <div className="transform sm:translate-y-4 sm:group-hover:translate-y-0 transition-transform duration-300">
                        <span className="text-white text-xs sm:text-base font-bold line-clamp-1">
                          {img.alt}
                        </span>
                        <p className="text-white/70 text-[10px] sm:text-xs mt-0.5 hidden sm:block">
                          Premium living space
                        </p>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ━━ TESTIMONIALS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-14 sm:py-20 bg-[#F3EDE6]" data-testid="testimonials-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <FadeIn className="text-center max-w-xl mx-auto mb-10 sm:mb-14">
            <p className="text-xs font-semibold text-[#2D5F3F] tracking-[0.2em] uppercase mb-2 sm:mb-3">Reviews</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              What Our Residents Say
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
            {testimonialItems.map((item, idx) => (
              <FadeIn key={item.id || idx} delay={idx * 0.12}>
                <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 border border-[#ECE5DD] shadow-md relative flex flex-col justify-between h-full">
                  <div>
                    <p className="text-[#6B5E54] italic text-xs sm:text-sm leading-relaxed mb-5 sm:mb-6">
                      &ldquo;{item.description}&rdquo;
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden shrink-0">
                      <img
                        src={item.image}
                        alt={item.alt_text || item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-[#1C1917]" style={{ fontFamily: "'Fraunces', serif" }}>
                        {item.title}
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-[#2D5F3F] font-semibold uppercase tracking-wider">Resident</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ BLOG / NEWS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-14 sm:py-20 bg-white" data-testid="blog-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <FadeIn className="max-w-xl mb-10 sm:mb-14">
            <p className="text-xs font-semibold text-[#2D5F3F] tracking-[0.2em] uppercase mb-2 sm:mb-3">Our Blog</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Insights & Guides for Easy Living
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {blogItems.map((item, idx) => (
              <FadeIn key={item.id || idx} delay={idx * 0.15}>
                <div className="group rounded-2xl sm:rounded-[32px] overflow-hidden border border-[#ECE5DD] bg-[#FAF7F2] shadow-md hover:shadow-xl transition-all duration-300">
                  <div className="h-48 sm:h-60 overflow-hidden relative">
                    <img
                      src={item.image}
                      alt={item.alt_text || item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-5 sm:p-6 md:p-8">
                    <h3 className="text-lg sm:text-2xl font-bold text-[#1C1917] mb-2 sm:mb-3 group-hover:text-[#2D5F3F] transition-colors" style={{ fontFamily: "'Fraunces', serif" }}>
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#6B5E54] leading-relaxed line-clamp-3 mb-4 sm:mb-6">
                      {item.description}
                    </p>
                    <button className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#2D5F3F] hover:gap-2 transition-all">
                      Read Article <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ ENQUIRY / CONTACT ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        id="contact"
        className="relative overflow-hidden py-16 sm:py-24 lg:py-36 bg-gradient-to-br from-[#0F172A] via-[#1B4332] to-[#2D5F3F]"
        data-testid="contact-section"
        style={contactBanner.image ? {
          backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.85), rgba(45, 95, 63, 0.9)), url(${contactBanner.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : {}}
      >
        <div className="absolute top-0 left-0 w-72 sm:w-96 h-72 sm:h-96 bg-[#D4A574]/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 sm:w-[450px] h-80 sm:h-[450px] bg-green-400/10 blur-[150px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <FadeIn>
              <p className="text-xs font-semibold text-[#D4A574] tracking-[0.2em] uppercase mb-2 sm:mb-3">Get In Touch</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white tracking-tight leading-tight mb-3 sm:mb-5" style={{ fontFamily: "'Fraunces', serif" }}>
                Ready to Find Your<br />New Home?
              </h2>
              <p className="text-[#A39889] text-sm sm:text-base leading-relaxed mb-6 sm:mb-8 max-w-md">
                Fill in your details and we&rsquo;ll get back to you within 24 hours. Alternatively, call or visit any of our properties directly.
              </p>
              <div className="space-y-3 sm:space-y-4 mt-6 sm:mt-10">
                {hostels.slice(0, 3).map((h, i) => (
                  <div key={i} className="flex items-center gap-3 sm:gap-4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:bg-white/15 transition-all duration-200">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#D4A574]/20 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4A574]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm sm:text-base truncate">{h.name}</p>
                      <p className="text-[#8C7E72] text-[11px] sm:text-xs mt-0.5 truncate">{h.address}, {h.city}</p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={0.15}>
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-[32px] p-5 sm:p-7 md:p-8 shadow-2xl" data-testid="enquiry-form">
                <h3 className="text-white font-semibold text-base sm:text-lg mb-4 sm:mb-5" style={{ fontFamily: "'Fraunces', serif" }}>Book Your Stay</h3>
                <div className="space-y-4 sm:space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-xs text-[#A39889] mb-1.5 block">Full Name *</Label>
                      <Input data-testid="enquiry-name" value={enquiry.name} onChange={e => setEnquiry({ ...enquiry, name: e.target.value })} placeholder="Your name" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 rounded-xl text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs text-[#A39889] mb-1.5 block">Phone *</Label>
                      <Input data-testid="enquiry-phone" value={enquiry.phone} onChange={e => setEnquiry({ ...enquiry, phone: e.target.value })} placeholder="+91 98765 43210" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 rounded-xl text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-[#A39889] mb-1.5 block">Email</Label>
                    <Input data-testid="enquiry-email" value={enquiry.email} onChange={e => setEnquiry({ ...enquiry, email: e.target.value })} placeholder="your@email.com" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 rounded-xl text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-[#A39889] mb-1.5 block">Preferred Property</Label>
                    <select
                      data-testid="enquiry-hostel"
                      value={enquiry.preferred_hostel}
                      onChange={e => setEnquiry({ ...enquiry, preferred_hostel: e.target.value })}
                      className="w-full h-11 rounded-xl bg-[#1B4332]/80 border border-white/15 text-white text-sm px-3 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="" className="text-slate-900 bg-white font-medium">No preference</option>
                      {hostels.map(h => <option key={h.id} value={h.name} className="text-slate-900 bg-white font-medium">{h.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-[#A39889] mb-1.5 block">Message</Label>
                    <textarea
                      data-testid="enquiry-message"
                      value={enquiry.message}
                      onChange={e => setEnquiry({ ...enquiry, message: e.target.value })}
                      placeholder="Tell us what you're looking for — room type, budget, move-in date..."
                      rows={3}
                      className="w-full rounded-xl bg-white/5 border border-white/10 text-white text-sm px-3 py-2.5 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>
                  <Button
                    data-testid="submit-enquiry-btn"
                    onClick={submitEnquiry}
                    disabled={sending}
                    className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#2D5F3F] to-[#4A8B5E] hover:from-[#214B31] hover:to-[#3b724c] transition-all duration-200 text-white text-sm sm:text-base font-semibold shadow-xl active:scale-98"
                  >
                    {sending ? 'Sending...' : <><Send className="w-4 h-4 mr-2" /> Send Enquiry</>}
                  </Button>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ━━ ADVERTISEMENTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {dbAds.length > 0 && (
        <section className="py-8 sm:py-12 bg-emerald-950 text-white" data-testid="ads-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
            <div className="max-w-xl text-center md:text-left">
              <span className="bg-[#D4A574] text-[#1C1917] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-2 sm:mb-3 inline-block">
                Limited Offer
              </span>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
                {dbAds[0].title || "Special Promotion"}
              </h3>
              <p className="text-white/80 text-xs sm:text-sm">
                {dbAds[0].description || "Contact us today and get exclusive discounts on bookings!"}
              </p>
            </div>
            <div className="w-full md:w-80 h-36 sm:h-40 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg border border-white/10 shrink-0">
              <img
                src={dbAds[0].image}
                alt={dbAds[0].alt_text || "Advertisement banner"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </section>
      )}

      {/* ━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="bg-[#16130F] border-t border-white/5 pt-10 sm:pt-12 pb-24 md:pb-12" data-testid="footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mb-8 sm:mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                {footerLogo.loading ? (
                  <div className="w-7 h-7 rounded-md bg-white/10 animate-pulse" />
                ) : footerLogo.image ? (
                  <img
                    src={footerLogo.image}
                    alt={footerLogo.alt_text || "Subhouz Footer Logo"}
                    className="w-7 h-7 object-contain"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-md bg-[#2D5F3F] flex items-center justify-center">
                    <span className="text-white font-bold text-xs" style={{ fontFamily: "'Fraunces', serif" }}>S</span>
                  </div>
                )}
                <span className="text-white font-semibold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Subhouz</span>
              </div>
              <p className="text-xs text-[#8C7E72] leading-relaxed max-w-xs">
                India&rsquo;s Smart Property & Rental Management Platform for Hostels, PGs, Co-living Spaces & Rental Apartments.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#8C7E72] uppercase tracking-wider mb-3">Quick Links</p>
              <div className="space-y-2">
                {navLinks.map(l => (
                  <button key={l.label} onClick={l.action} className="block text-xs sm:text-sm text-[#8C7E72] hover:text-white transition-colors">{l.label}</button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2 md:col-span-1">
              <p className="text-xs font-semibold text-[#8C7E72] uppercase tracking-wider mb-3">Support Contacts</p>
              <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
                {/* Email */}
                <a
                  href="mailto:Subhouz1@gmail.com"
                  className="flex items-center gap-2 text-white hover:text-[#4A8B5E] transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0 text-[#4A8B5E]" />
                  subhouz1@gmail.com
                </a>
                {/* Plumber 1 */}
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-white">
                    <Wrench className="w-3.5 h-3.5 shrink-0 text-[#4A8B5E]" />
                    Plumber 1
                  </span>
                  <a
                    href="tel:+919937066699"
                    className="flex items-center gap-2 text-[#4A8B5E] hover:text-emerald-400 transition-colors pl-5"
                  >
                    <Phone className="w-3 h-3 shrink-0" />
                    +91 99370 66699
                  </a>
                </div>
                {/* Plumber 2 */}
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-white">
                    <Wrench className="w-3.5 h-3.5 shrink-0 text-[#4A8B5E]" />
                    Plumber 2
                  </span>
                  <a
                    href="tel:+919337805457"
                    className="flex items-center gap-2 text-[#4A8B5E] hover:text-emerald-400 transition-colors pl-5"
                  >
                    <Phone className="w-3 h-3 shrink-0" />
                    +91 93378 05457
                  </a>
                </div>
                {/* Electrician */}
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-white">
                    <Zap className="w-3.5 h-3.5 shrink-0 text-[#4A8B5E]" />
                    Electrician
                  </span>
                  <a
                    href="tel:+918826044546"
                    className="flex items-center gap-2 text-[#4A8B5E] hover:text-emerald-400 transition-colors pl-5"
                  >
                    <Phone className="w-3 h-3 shrink-0" />
                    +91 88260 44546
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-[#6B5E54]">&copy; {new Date().getFullYear()} Subhouz. All rights reserved.</p>
            <Link to="/login" className="text-xs text-[#8C7E72] hover:text-white transition-colors" data-testid="footer-admin-login">
              Admin Login
            </Link>
          </div>
        </div>
      </footer>

      {/* ━━ FIXED MOBILE BOTTOM NAVIGATION BAR ━━ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] py-1.5 px-3 flex md:hidden items-center justify-around pb-safe">
        <button
          onClick={() => scrollTo('hero')}
          className="flex flex-col items-center justify-center gap-1 text-[#2D5F3F] min-w-[56px] py-1 active:scale-95 transition-transform"
        >
          <Home className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button
          onClick={() => navigate('/hostels')}
          className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-[#2D5F3F] min-w-[56px] py-1 active:scale-95 transition-transform"
        >
          <Building2 className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] font-semibold">Stays</span>
        </button>
        <button
          onClick={() => scrollTo('contact')}
          className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-[#2D5F3F] min-w-[56px] py-1 active:scale-95 transition-transform"
        >
          <Send className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] font-semibold">Enquire</span>
        </button>
        <a
          href="tel:+919937066699"
          className="flex flex-col items-center justify-center gap-1 text-emerald-700 min-w-[56px] py-1 active:scale-95 transition-transform"
        >
          <Phone className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] font-semibold">Call</span>
        </a>
        <button
          onClick={() => navigate('/login')}
          className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-[#2D5F3F] min-w-[56px] py-1 active:scale-95 transition-transform"
        >
          <Shield className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] font-semibold">Admin</span>
        </button>
      </div>
    </div>
  );
}
