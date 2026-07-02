import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, MapPin, Phone, Mail, Wifi, Shield, Droplets, Wind, Sun, Users, ChevronDown, Menu, X, Send } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import api from '../lib/api';

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
  '3 Hostels, Multiple Locations',
  'AC & Non-AC Options',
  'Transparent Rent & Easy Payments',
  'Quick Response to Enquiries',
];

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
function HeroCarousel() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % HERO_IMAGES.length), 6000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.img
          key={idx}
          src={HERO_IMAGES[idx]}
          alt="Hostel interior"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
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
    { label: 'Hostels', action: () => scrollTo('hostels') },
    { label: 'Amenities', action: () => scrollTo('amenities') },
    { label: 'Gallery', action: () => scrollTo('gallery') },
    { label: 'Contact', action: () => scrollTo('contact') },
  ];

  return (
    <div className="bg-[#FAF7F2] text-[#1C1917] overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ━━ NAVIGATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#E8E0D8]/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => scrollTo('hero')} className="flex items-center gap-2.5 group" data-testid="nav-logo">
            <div className="w-8 h-8 rounded-lg bg-[#2D5F3F] flex items-center justify-center">
              <span className="text-white font-bold text-sm" style={{ fontFamily: "'Fraunces', serif" }}>S</span>
            </div>
            <span className="text-lg font-semibold tracking-tight text-[#1C1917]" style={{ fontFamily: "'Fraunces', serif" }}>Subhouz</span>
          </button>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(l => (
              <button key={l.label} onClick={l.action} className="text-[13px] font-medium text-[#6B5E54] hover:text-[#1C1917] tracking-wide transition-colors" data-testid={`nav-${l.label.toLowerCase()}`}>
                {l.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button
              data-testid="nav-enquiry-btn"
              onClick={() => scrollTo('contact')}
              className="hidden sm:inline-flex bg-[#2D5F3F] hover:bg-[#1F4A2E] text-white rounded-full px-5 h-9 text-[13px] font-semibold tracking-wide shadow-sm"
            >
              Send an Enquiry
            </Button>
            <button className="md:hidden p-2" onClick={() => setMobileNav(!mobileNav)} data-testid="mobile-nav-toggle">
              {mobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileNav && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden border-t border-[#E8E0D8] bg-[#FAF7F2] overflow-hidden">
              <div className="px-6 py-4 space-y-3">
                {navLinks.map(l => (
                  <button key={l.label} onClick={l.action} className="block text-sm font-medium text-[#6B5E54] hover:text-[#1C1917]">{l.label}</button>
                ))}
                <Button onClick={() => { scrollTo('contact'); }} className="w-full bg-[#2D5F3F] hover:bg-[#1F4A2E] text-white rounded-full h-10 text-sm font-semibold">Send an Enquiry</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="hero" className="relative min-h-screen flex items-center pt-16" data-testid="hero-section">
        <HeroCarousel />
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full py-24 lg:py-32">
          <div className="max-w-2xl">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-[#D4A574] text-xs font-semibold tracking-[0.25em] uppercase mb-6"
            >
              Bhubaneswar&rsquo;s Trusted Hostels
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="text-4xl sm:text-5xl lg:text-[3.6rem] font-semibold text-white leading-[1.12] tracking-tight mb-6"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              A Place That Feels<br className="hidden sm:block" /> Like Home.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.6 }}
              className="text-base sm:text-lg text-[#E8E0D8]/90 leading-relaxed max-w-lg mb-8"
            >
              Browse our hostels, explore rooms and amenities, and send us a booking enquiry&nbsp;&mdash; we&rsquo;ll take it from there.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.5 }}
              className="flex flex-wrap gap-4 mb-10"
            >
              <Button
                data-testid="hero-browse-btn"
                onClick={() => scrollTo('hostels')}
                className="bg-[#2D5F3F] hover:bg-[#1F4A2E] text-white rounded-full px-7 h-12 text-sm font-semibold shadow-lg shadow-black/20 hover:shadow-black/30 transition-all duration-200 hover:scale-[1.02]"
              >
                Browse Our Hostels <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                data-testid="hero-enquiry-btn"
                variant="outline"
                onClick={() => scrollTo('contact')}
                className="border-white/30 text-white hover:bg-white/10 rounded-full px-7 h-12 text-sm font-semibold backdrop-blur-sm"
              >
                Send an Enquiry
              </Button>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex flex-wrap gap-x-5 gap-y-2"
            >
              {TRUST.map((t, i) => (
                <span key={i} className="flex items-center gap-1.5 text-[11px] sm:text-xs text-white/60 font-medium">
                  <Check className="w-3 h-3 text-[#D4A574]" /> {t}
                </span>
              ))}
            </motion.div>
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
            <p className="text-xs font-semibold text-[#2D5F3F] tracking-[0.2em] uppercase mb-3">Our Hostels</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Find Your Ideal Stay in Bhubaneswar
            </h2>
            <p className="text-[#6B5E54] mt-4 text-base leading-relaxed">
              Each of our hostels is carefully maintained to ensure comfort, safety, and a welcoming environment.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {hostels.map((h, i) => (
              <FadeIn key={h.id} delay={i * 0.12}>
                <div className="group rounded-2xl overflow-hidden bg-white border border-[#E8E0D8] shadow-sm hover:shadow-lg transition-shadow duration-300" data-testid={`hostel-public-card-${h.id}`}>
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={HOSTEL_IMAGES[h.name] || HERO_IMAGES[0]}
                      alt={h.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
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
                  <div className="p-5">
                    <h3 className="font-semibold text-lg text-[#1C1917] mb-1" style={{ fontFamily: "'Fraunces', serif" }}>{h.name}</h3>
                    <p className="text-sm text-[#8C7E72] flex items-start gap-1.5 mb-3">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{h.address}, {h.city}</span>
                    </p>
                    {h.phone && (
                      <p className="text-sm text-[#8C7E72] flex items-center gap-1.5 mb-4">
                        <Phone className="w-3.5 h-3.5" />{h.phone}
                      </p>
                    )}
                    <Button
                      onClick={() => scrollTo('contact')}
                      variant="outline"
                      className="w-full rounded-full border-[#2D5F3F]/30 text-[#2D5F3F] hover:bg-[#2D5F3F] hover:text-white text-sm font-semibold h-10 transition-all duration-200"
                      data-testid={`enquire-hostel-${h.id}`}
                    >
                      Enquire About This Hostel
                    </Button>
                  </div>
                </div>
              </FadeIn>
            ))}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
            {AMENITIES.map((a, i) => (
              <FadeIn key={i} delay={i * 0.06}>
                <div className="bg-white/80 rounded-xl p-5 text-center border border-[#E8E0D8]/50 hover:shadow-md transition-shadow">
                  <div className="w-11 h-11 rounded-full bg-[#2D5F3F]/8 flex items-center justify-center mx-auto mb-3">
                    <a.icon className="w-5 h-5 text-[#2D5F3F]" />
                  </div>
                  <p className="text-sm font-medium text-[#1C1917]">{a.label}</p>
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {GALLERY_IMAGES.map((img, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <div className="relative rounded-xl overflow-hidden aspect-[4/3] group">
                  <img src={img.src} alt={img.alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ ENQUIRY / CONTACT ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="contact" className="py-24 lg:py-32 bg-[#1C1917]" data-testid="contact-section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <FadeIn>
              <p className="text-xs font-semibold text-[#D4A574] tracking-[0.2em] uppercase mb-3">Get In Touch</p>
              <h2 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight leading-tight mb-5" style={{ fontFamily: "'Fraunces', serif" }}>
                Ready to Find Your<br />New Home?
              </h2>
              <p className="text-[#A39889] text-base leading-relaxed mb-8 max-w-md">
                Fill in your details and we&rsquo;ll get back to you within 24 hours. Alternatively, call or visit any of our hostels directly.
              </p>
              <div className="space-y-4">
                {hostels.slice(0, 3).map((h, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-[#D4A574] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-white font-medium">{h.name}</p>
                      <p className="text-[#8C7E72] text-xs mt-0.5">{h.address}, {h.city}</p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={0.15}>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8" data-testid="enquiry-form">
                <h3 className="text-white font-semibold text-lg mb-5" style={{ fontFamily: "'Fraunces', serif" }}>Booking Enquiry</h3>
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-[#A39889] mb-1.5 block">Full Name *</Label>
                      <Input data-testid="enquiry-name" value={enquiry.name} onChange={e => setEnquiry({ ...enquiry, name: e.target.value })} placeholder="Your name" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 rounded-lg" />
                    </div>
                    <div>
                      <Label className="text-xs text-[#A39889] mb-1.5 block">Phone *</Label>
                      <Input data-testid="enquiry-phone" value={enquiry.phone} onChange={e => setEnquiry({ ...enquiry, phone: e.target.value })} placeholder="+91 98765 43210" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-[#A39889] mb-1.5 block">Email</Label>
                    <Input data-testid="enquiry-email" value={enquiry.email} onChange={e => setEnquiry({ ...enquiry, email: e.target.value })} placeholder="your@email.com" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 rounded-lg" />
                  </div>
                  <div>
                    <Label className="text-xs text-[#A39889] mb-1.5 block">Preferred Hostel</Label>
                    <select
                      data-testid="enquiry-hostel"
                      value={enquiry.preferred_hostel}
                      onChange={e => setEnquiry({ ...enquiry, preferred_hostel: e.target.value })}
                      className="w-full h-11 rounded-lg bg-white/5 border border-white/10 text-white text-sm px-3 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2D5F3F]"
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
                      className="w-full rounded-lg bg-white/5 border border-white/10 text-white text-sm px-3 py-2.5 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#2D5F3F] resize-none"
                    />
                  </div>
                  <Button
                    data-testid="submit-enquiry-btn"
                    onClick={submitEnquiry}
                    disabled={sending}
                    className="w-full bg-[#2D5F3F] hover:bg-[#1F4A2E] text-white rounded-full h-12 text-sm font-semibold shadow-lg"
                  >
                    {sending ? 'Sending...' : <><Send className="w-4 h-4 mr-2" /> Send Enquiry</>}
                  </Button>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="bg-[#16130F] border-t border-white/5 py-12" data-testid="footer">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid sm:grid-cols-3 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-md bg-[#2D5F3F] flex items-center justify-center">
                  <span className="text-white font-bold text-xs" style={{ fontFamily: "'Fraunces', serif" }}>S</span>
                </div>
                <span className="text-white font-semibold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Subhouz</span>
              </div>
              <p className="text-xs text-[#6B5E54] leading-relaxed max-w-xs">
                Comfortable, secure, and thoughtfully managed hostels in Bhubaneswar, Odisha.
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
              <p className="text-xs font-semibold text-[#8C7E72] uppercase tracking-wider mb-3">Contact</p>
              <div className="space-y-2 text-sm text-[#6B5E54]">
                <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> +91 98765 43210</p>
                <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> hello@subhouz.com</p>
                <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Bhubaneswar, Odisha</p>
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
