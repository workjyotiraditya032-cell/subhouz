import { useState, useEffect, useRef, useMemo } from 'react';
/* Inter + Plus Jakarta Sans for the premium header */
import { useNavigate, Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import SearchBar from '../components/search/SearchBar';
import { Check, ArrowRight, MapPin, Phone, Mail, Wifi, Shield, Droplets, Wind, Sun, Users, ChevronDown, Menu, X, Send, Search, Clock, Sparkles, Building2, Wrench, Zap } from 'lucide-react';
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
  'Verified & Secure Stays',
  '3 Premium Properties, Multiple Locations',
  'AC & Non-AC Options',
  'Transparent Rent & Easy Payments',
  'Quick Response to Enquiries',
];

const STATIC_TESTIMONIALS = [
  {
    id: 'static-1',
    title: 'Rohan Sharma',
    description: 'Subhouz has made my stay in Bhubaneswar incredibly comfortable. The rooms are clean, and the security is top-notch!',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    alt_text: 'Rohan Sharma Review'
  },
  {
    id: 'static-2',
    title: 'Ananya Mishra',
    description: 'Living at Homely Havens has been a wonderful experience. The amenities are excellent and the staff is very responsive.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    alt_text: 'Ananya Mishra Review'
  },
  {
    id: 'static-3',
    title: 'Pritam Das',
    description: 'GSR is the best PG I\'ve lived in. Highly recommend it to anyone looking for a premium stay.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    alt_text: 'Pritam Das Review'
  }
];

const STATIC_BLOGS = [
  {
    id: 'static-b1',
    title: 'How to Find the Perfect Room in Bhubaneswar',
    description: 'Discover the top factors to consider when choosing a hostel or PG, from proximity to universities to essential amenities.',
    image: 'https://images.unsplash.com/photo-1552858725-2758b5fb1286?auto=format&fit=crop&w=600&q=80',
    alt_text: 'Finding room blog'
  },
  {
    id: 'static-b2',
    title: 'Top 5 Amenities You Should Look for in a PG',
    description: 'Ensure a comfortable stay by checking if your PG includes security, high-speed internet, power backup, and laundry services.',
    image: 'https://images.unsplash.com/photo-1578112010316-b44c50d27b2b?auto=format&fit=crop&w=600&q=80',
    alt_text: 'Amenities blog'
  }
];

const SEARCH_SUGGESTIONS = {
  locations: ['Patia', 'Shampur', 'Mancheswar', 'Patrapada', 'Khandagiri', 'Jaydev Vihar'],
  colleges: ['KIIT University', 'ITER College', 'Silicon Institute of Technology', 'C. V. Raman Global University'],
  landmarks: ['Sikharchandi Temple', 'Ranganath Temple', 'Saraswati Sishu Mandir', 'Khandagiri Caves'],
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
        { id: '1', name: 'Jogmaya Hostel', code: 'JMH', address: 'Sitaram Nagar, Panda Kudia, Plot No- 729, near Saraswati Sishu Mandir, Shampur', city: 'Bhubaneswar', hostel_type: 'boys', phone: '+91 9876543210' },
        { id: '2', name: 'Homely Havens Girls PG', code: 'HHG', address: 'Cluster 3, Plot no- 1587, Sikharchandi Vihar, Patia', city: 'Bhubaneswar', hostel_type: 'girls', phone: '+91 9876543211' },
        { id: '3', name: 'GopalSarojini (GS) Residency', code: 'GSR', address: 'Ranganath Temple, Rangamatia, Tala Sahi, Rangamatia, Mancheswar', city: 'Bhubaneswar', hostel_type: 'mixed', phone: '+91 9876543212' },
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
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #EFEFEF',
          fontFamily: "'Inter', 'Plus Jakarta Sans', 'Outfit', sans-serif",
        }}
      >
        {/* ── inner container: max-width 1280px, centered ── */}
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0 40px',
            height: '84px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          {/* ── LEFT: Logo + Wordmark ── */}
          <button
            onClick={() => scrollTo('hero')}
            data-testid="nav-logo"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
            }}
          >
            {logo.loading ? (
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#E2E8F0', animation: 'pulse 1.5s ease infinite' }} />
            ) : logo.image ? (
              <img
                src={logo.image}
                alt={logo.alt_text || 'Subhouz Logo'}
                style={{
                  width: 42,
                  height: 42,
                  objectFit: 'contain',
                  transition: 'transform 0.3s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              />
            ) : (
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: '#1D4ED8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.3s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>S</span>
              </div>
            )}
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: '#DC2626',
                letterSpacing: '-0.03em',
                fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
                lineHeight: 1,
              }}
            >
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
              display: 'flex',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {/* Desktop CTA */}
            <button
              data-testid="nav-enquiry-btn"
              onClick={() => scrollTo('contact')}
              className="hidden md:inline-flex"
              style={{
                background: '#16A34A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 9999,
                paddingLeft: 28,
                paddingRight: 28,
                height: 48,
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
                fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.04)';
                e.currentTarget.style.boxShadow = '0 8px 28px rgba(22,163,74,0.35)';
                e.currentTarget.style.background = '#15803D';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.background = '#16A34A';
              }}
            >
              Send an Enquiry
            </button>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden"
              onClick={() => setMobileNav(!mobileNav)}
              data-testid="mobile-nav-toggle"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 8,
                borderRadius: 8,
                color: '#333333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              {mobileNav ? <X style={{ width: 22, height: 22 }} /> : <Menu style={{ width: 22, height: 22 }} />}
            </button>
          </div>
        </div>

        {/* ── Mobile expanded menu ── */}
        <AnimatePresence>
          {mobileNav && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={{
                overflow: 'hidden',
                borderTop: '1px solid #EFEFEF',
                background: '#FFFFFF',
              }}
            >
              <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {navLinks.map(l => (
                  <button
                    key={l.label}
                    onClick={l.action}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 15,
                      fontWeight: 500,
                      color: '#333333',
                      textAlign: 'left',
                      padding: '10px 4px',
                      borderRadius: 8,
                      transition: 'color 0.2s ease',
                      fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#1D4ED8'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#333333'; }}
                  >
                    {l.label}
                  </button>
                ))}
                <button
                  onClick={() => { scrollTo('contact'); setMobileNav(false); }}
                  style={{
                    marginTop: 12,
                    background: '#16A34A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 9999,
                    height: 44,
                    fontSize: 15,
                    fontWeight: 500,
                    cursor: 'pointer',
                    width: '100%',
                    fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#15803D'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#16A34A'; }}
                >
                  Send an Enquiry
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center pt-20 overflow-hidden"
      >
        {heroLoading && !dbHeroBackgrounds.length ? (
          <div className="absolute inset-0 bg-[#1C1917] animate-pulse" />
        ) : (
          <HeroCarousel images={heroBackgrounds} />
        )}
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full py-24 lg:py-32">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="inline-flex items-center px-5 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-emerald-300 text-xs font-bold uppercase tracking-[0.3em] mb-8"
              >
                Bhubaneswar&rsquo;s Trusted Stays
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-8 drop-shadow-2xl"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                A Place That Feels<br className="hidden sm:block" /> Like Home.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.6 }}
                className="text-xl text-white/90 leading-relaxed max-w-2xl mb-10"
              >
                Discover comfortable stays, explore rooms and amenities, and send us an enquiry—we'll help you find the perfect place.
              </motion.p>

              {/* Reusable Premium Search Bar */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.6 }}
                className="relative z-30 w-full max-w-2xl mb-8"
              >
                <SearchBar placeholder="Search by Area, Landmark, College or Property" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75, duration: 0.5 }}
                className="flex flex-wrap gap-4 mb-10"
              >
                <Button
                  data-testid="hero-browse-btn"
                  onClick={() => navigate('/hostels')}
                  className="bg-gradient-to-r from-green-700 to-emerald-500 hover:scale-105 hover:shadow-2xl transition-all duration-300 rounded-full px-8 h-14 text-base font-semibold"
                >
                  Browse Stays <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  data-testid="hero-enquiry-btn"
                  variant="outline"
                  onClick={() => scrollTo('contact')}
                  className="border-2 border-white/40 bg-white/10 backdrop-blur-xl hover:bg-white/20 rounded-full px-8 h-14 text-base font-semibold"
                >
                  Send an Enquiry
                </Button>
              </motion.div>

              <div className="mt-14">
                <div className="grid grid-cols-3 gap-6 max-w-2xl">
                  <div className="backdrop-blur-2xl bg-white/10 rounded-3xl border border-white/20 p-6">
                    <h3 className="text-4xl font-black text-white">500+</h3>
                    <p className="text-white/70 mt-2 text-sm">Happy Residents</p>
                  </div>
                  <div className="backdrop-blur-2xl bg-white/10 rounded-3xl border border-white/20 p-6">
                    <h3 className="text-4xl font-black text-white">5+</h3>
                    <p className="text-white/70 mt-2 text-sm">Premium Amenities</p>
                  </div>
                  <div className="backdrop-blur-2xl bg-white/10 rounded-3xl border border-white/20 p-6">
                    <h3 className="text-4xl font-black text-white">24/7</h3>
                    <p className="text-white/70 mt-2 text-sm">Security</p>
                  </div>
                </div>
              </div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex flex-wrap gap-x-5 gap-y-2 mt-8"
              >
                {TRUST.map((t, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-[11px] sm:text-xs text-white/60 font-medium">
                    <Check className="w-3 h-3 text-[#D4A574]" /> {t}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Dynamic Hero Side Image */}
            <div className="hidden lg:block lg:col-span-5">
              {heroSideImage.loading ? (
                <div className="relative rounded-3xl overflow-hidden w-full h-[450px] bg-white/10 border border-white/20 animate-pulse" />
              ) : heroSideImage.image ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="relative rounded-3xl overflow-hidden border border-white/20 shadow-2xl h-[450px]"
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
      <section id="hostels" className="py-24 lg:py-32" data-testid="hostels-section">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="max-w-xl mb-14">
            <p className="text-xs font-semibold text-[#2D5F3F] tracking-[0.2em] uppercase mb-3">Our Properties</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Find Your Ideal Stay in Bhubaneswar
            </h2>
            <p className="text-[#6B5E54] mt-4 text-base leading-relaxed">
              Each of our properties is carefully maintained to ensure comfort, safety, and a welcoming environment.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {hostels.map((h, i) => {
              const customCover = hostelCovers.find(c => c.hostel_id === h.id)?.image;
              const finalCover = customCover || defaultProperty.image || HOSTEL_IMAGES[h.name] || HERO_IMAGES[0];
              return (
                <FadeIn key={h.id} delay={i * 0.12}>
                  <div className="group rounded-3xl overflow-hidden bg-white border border-[#ECE5DD] shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500" data-testid={`hostel-public-card-${h.id}`}>
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={finalCover}
                        alt={h.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
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
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3
                            className="text-xl font-bold text-[#1C1917]"
                            style={{ fontFamily: "'Fraunces', serif" }}
                          >
                            {h.name}
                          </h3>
                          <div className="flex items-center gap-1 mt-1 text-[#8C7E72] text-sm">
                            <MapPin className="w-4 h-4 text-[#2D5F3F]" />
                            <span>{h.city}</span>
                          </div>
                        </div>
                        <span className="bg-[#2D5F3F] text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                          Available
                        </span>
                      </div>

                      <p className="text-sm text-[#6B5E54] line-clamp-2 mb-5">
                        {h.address}
                      </p>

                      {h.phone && (
                        <div className="flex items-center gap-2 mb-5 text-sm text-[#6B5E54]">
                          <Phone className="w-4 h-4 text-[#2D5F3F]" />
                          <span>{h.phone}</span>
                        </div>
                      )}

                      <Button
                        onClick={() => navigate(`/hostels/${h.id}`)}
                        className="w-full h-12 rounded-xl bg-[#2D5F3F] hover:bg-[#214B31] text-white font-semibold transition-all duration-300 hover:scale-[1.02] shadow-lg"
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
      <section id="about" className="py-24 lg:py-32 bg-white" data-testid="about-section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <FadeIn>
              <p className="text-xs font-semibold text-[#2D5F3F] tracking-[0.2em] uppercase mb-3">About Subhouz</p>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
                We Provide Comfortable and Secure Stays for Everyone
              </h2>
              <p className="text-[#6B5E54] text-base leading-relaxed mb-6">
                Subhouz is Bhubaneswar's leading accommodation platform, offering high-quality PGs and hostels. We are committed to providing you a hassle-free, secure, and premium living experience with state-of-the-art amenities and 24/7 support.
              </p>
              <p className="text-[#6B5E54] text-base leading-relaxed mb-8">
                Whether you are a student looking for a quiet study environment or a working professional needing a comfortable space near your workplace, we have properties tailored for your needs.
              </p>
              <Button onClick={() => scrollTo('contact')} className="bg-[#2D5F3F] hover:bg-[#1F4A2E] text-white rounded-full px-8 h-12 text-sm font-semibold shadow-md">
                Get in Touch
              </Button>
            </FadeIn>
            <FadeIn delay={0.12}>
              <div className="relative rounded-[32px] overflow-hidden shadow-2xl h-[450px] border border-[#ECE5DD]">
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
      <section id="amenities" className="py-24 bg-[#F3EDE6]" data-testid="amenities-section">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-semibold text-[#2D5F3F] tracking-[0.2em] uppercase mb-3">What We Offer</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Everything You Need for a Comfortable Stay
            </h2>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-8">
            {AMENITIES.map((a, i) => (
              <FadeIn key={i} delay={i * 0.06}>
                <div className="group relative overflow-hidden rounded-3xl bg-white p-8 border border-[#ECE5DD] shadow-lg hover:shadow-2xl hover:-translate-y-3 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#2D5F3F] to-[#4A8B5E] flex items-center justify-center shadow-lg mb-6 group-hover:rotate-6 group-hover:scale-110 transition-all duration-500">
                      <a.icon className="w-8 h-8 text-white"/>
                    </div>
                    <h3 className="text-lg font-bold text-[#1C1917] mb-2 text-center">
                      {a.label}
                    </h3>
                    <p className="text-sm text-[#6B5E54] leading-relaxed text-center">
                      Designed for a comfortable and secure stay.
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ GALLERY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="gallery" className="py-24 lg:py-32" data-testid="gallery-section">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="max-w-xl mb-14">
            <p className="text-xs font-semibold text-[#2D5F3F] tracking-[0.2em] uppercase mb-3">Gallery</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              See Where You&rsquo;ll Stay
            </h2>
          </FadeIn>
          {galleryLoading && !dbGallery.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 h-[460px]">
              <div className="col-span-2 row-span-2 bg-slate-200 animate-pulse rounded-3xl" />
              <div className="bg-slate-200 animate-pulse rounded-3xl" />
              <div className="bg-slate-200 animate-pulse rounded-3xl" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 auto-rows-[220px]">
              {galleryImages.map((img, i) => (
                <FadeIn key={i} delay={i * 0.08}>
                  <div
                    className={`
                      group
                      relative
                      overflow-hidden
                      rounded-3xl
                      shadow-xl
                      cursor-pointer
                      ${i === 0 ? "md:col-span-2 md:row-span-2 h-[460px]" : "h-[220px]"}
                    `}
                  >
                    <img
                      src={img.src}
                      alt={img.alt}
                      loading="lazy"
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                      <h3 className="text-white text-xl font-bold">
                        {img.alt}
                      </h3>
                      <p className="text-white/80 text-sm mt-2">
                        Experience premium living spaces.
                      </p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ━━ TESTIMONIALS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 bg-[#F3EDE6]" data-testid="testimonials-section">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-semibold text-[#2D5F3F] tracking-[0.2em] uppercase mb-3">Reviews</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              What Our Residents Say
            </h2>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonialItems.map((item, idx) => (
              <FadeIn key={item.id || idx} delay={idx * 0.12}>
                <div className="bg-white rounded-3xl p-8 border border-[#ECE5DD] shadow-lg relative flex flex-col justify-between h-full">
                  <div>
                    <p className="text-[#6B5E54] italic text-sm leading-relaxed mb-6">
                      &ldquo;{item.description}&rdquo;
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                      <img
                        src={item.image}
                        alt={item.alt_text || item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1C1917]" style={{ fontFamily: "'Fraunces', serif" }}>
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-[#2D5F3F] font-semibold uppercase tracking-wider">Resident</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ BLOG / NEWS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 bg-white" data-testid="blog-section">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="max-w-xl mb-14">
            <p className="text-xs font-semibold text-[#2D5F3F] tracking-[0.2em] uppercase mb-3">Our Blog</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Insights & Guides for Easy Living
            </h2>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-8">
            {blogItems.map((item, idx) => (
              <FadeIn key={item.id || idx} delay={idx * 0.15}>
                <div className="group rounded-[32px] overflow-hidden border border-[#ECE5DD] bg-[#FAF7F2] shadow-md hover:shadow-xl transition-all duration-500">
                  <div className="h-60 overflow-hidden relative">
                    <img
                      src={item.image}
                      alt={item.alt_text || item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-8">
                    <h3 className="text-2xl font-bold text-[#1C1917] mb-3 group-hover:text-[#2D5F3F] transition-colors" style={{ fontFamily: "'Fraunces', serif" }}>
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#6B5E54] leading-relaxed line-clamp-3 mb-6">
                      {item.description}
                    </p>
                    <button className="flex items-center gap-1 text-sm font-semibold text-[#2D5F3F] hover:gap-2 transition-all">
                      Read Article <ArrowRight className="w-4 h-4" />
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
        className="relative overflow-hidden py-28 lg:py-36 bg-gradient-to-br from-[#0F172A] via-[#1B4332] to-[#2D5F3F]"
        data-testid="contact-section"
        style={contactBanner.image ? {
          backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.85), rgba(45, 95, 63, 0.9)), url(${contactBanner.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : {}}
      >
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#D4A574]/20 blur-[140px] rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-green-400/10 blur-[180px] rounded-full"></div>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <FadeIn>
              <p className="text-xs font-semibold text-[#D4A574] tracking-[0.2em] uppercase mb-3">Get In Touch</p>
              <h2 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight leading-tight mb-5" style={{ fontFamily: "'Fraunces', serif" }}>
                Ready to Find Your<br />New Home?
              </h2>
              <p className="text-[#A39889] text-base leading-relaxed mb-8 max-w-md">
                Fill in your details and we&rsquo;ll get back to you within 24 hours. Alternatively, call or visit any of our properties directly.
              </p>
              <div className="space-y-5 mt-10">
                {hostels.slice(0, 3).map((h, i) => (
                  <div key={i} className="flex items-center gap-4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:bg-white/15 transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-[#D4A574]/20 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-[#D4A574]" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{h.name}</p>
                      <p className="text-[#8C7E72] text-xs mt-0.5">{h.address}, {h.city}</p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={0.15}>
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[32px] p-8 shadow-2xl" data-testid="enquiry-form">
                <h3 className="text-white font-semibold text-lg mb-5" style={{ fontFamily: "'Fraunces', serif" }}>Book Your Stay</h3>
                <div className="space-y-5 mt-10">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-[#A39889] mb-1.5 block">Full Name *</Label>
                      <Input data-testid="enquiry-name" value={enquiry.name} onChange={e => setEnquiry({ ...enquiry, name: e.target.value })} placeholder="Your name" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 rounded-xl" />
                    </div>
                    <div>
                      <Label className="text-xs text-[#A39889] mb-1.5 block">Phone *</Label>
                      <Input data-testid="enquiry-phone" value={enquiry.phone} onChange={e => setEnquiry({ ...enquiry, phone: e.target.value })} placeholder="+91 98765 43210" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 rounded-xl" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-[#A39889] mb-1.5 block">Email</Label>
                    <Input data-testid="enquiry-email" value={enquiry.email} onChange={e => setEnquiry({ ...enquiry, email: e.target.value })} placeholder="your@email.com" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-xs text-[#A39889] mb-1.5 block">Preferred Property</Label>
                    <select
                      data-testid="enquiry-hostel"
                      value={enquiry.preferred_hostel}
                      onChange={e => setEnquiry({ ...enquiry, preferred_hostel: e.target.value })}
                      className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white text-sm px-3 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2D5F3F]"
                    >
                      <option value="" className="text-[#1C1917]">No preference</option>
                      {hostels.map(h => <option key={h.id} value={h.name} className="text-[#1C1917]">{h.name}</option>)}
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
                      className="w-full rounded-xl bg-white/5 border border-white/10 text-white text-sm px-3 py-2.5 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#2D5F3F] resize-none"
                    />
                  </div>
                  <Button
                    data-testid="submit-enquiry-btn"
                    onClick={submitEnquiry}
                    disabled={sending}
                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#2D5F3F] to-[#4A8B5E] hover:scale-[1.02] transition-all duration-300 text-white text-base font-semibold shadow-2xl"
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
        <section className="py-12 bg-emerald-950 text-white" data-testid="ads-section">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <span className="bg-[#D4A574] text-[#1C1917] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3 inline-block">
                Limited Offer
              </span>
              <h3 className="text-2xl font-bold tracking-tight mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
                {dbAds[0].title || "Special Promotion"}
              </h3>
              <p className="text-white/80 text-sm">
                {dbAds[0].description || "Contact us today and get exclusive discounts on bookings!"}
              </p>
            </div>
            <div className="w-full md:w-80 h-40 rounded-2xl overflow-hidden shadow-lg border border-white/10 shrink-0">
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
      <footer className="bg-[#16130F] border-t border-white/5 py-12" data-testid="footer">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid sm:grid-cols-3 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
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
              <p className="text-xs text-[#6B5E54] leading-relaxed max-w-xs">
                Comfortable, secure, and thoughtfully managed properties in Bhubaneswar, Odisha.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#8C7E72] uppercase tracking-wider mb-3">Quick Links</p>
              <div className="space-y-2">
                {navLinks.map(l => (
                  <button key={l.label} onClick={l.action} className="block text-sm text-[#6B5E54] hover:text-white transition-colors">{l.label}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#8C7E72] uppercase tracking-wider mb-3">Support Contacts</p>
              <div className="space-y-3 text-sm">
                {/* Email */}
                <a
                  href="mailto:Subhouz1@gmail.com"
                  className="flex items-center gap-2 text-white hover:text-[#4A8B5E] transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0 text-[#4A8B5E]" />
                  subhouz1@gmail.com
                </a>
                {/* Plumber 1 */}
                <div className="flex flex-col gap-0.5" style={{ paddingTop: 2 }}>
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
                <div className="flex flex-col gap-0.5" style={{ paddingTop: 2 }}>
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
                <div className="flex flex-col gap-0.5" style={{ paddingTop: 2 }}>
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
          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[#4A4340]">&copy; {new Date().getFullYear()} Subhouz. All rights reserved.</p>
            <Link to="/login" className="text-xs text-[#4A4340] hover:text-[#6B5E54] transition-colors" data-testid="footer-admin-login">
              Admin Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
