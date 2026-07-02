import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { MapPin, Phone, Mail, Star, ArrowLeft, ArrowRight, Wifi, Shield, Camera, Car, Dumbbell, UtensilsCrossed, Waves, Wind, Droplets, Sun, Building2, Users, DoorOpen, Check, Menu, X, Send } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import api from '../lib/api';

const HOSTEL_COVERS = {
  'Jogmaya Hostel': 'https://images.unsplash.com/photo-1612913959689-a83136ac4e7c?auto=format&fit=crop&w=1200&q=80',
  'Homely Havens Girls PG': 'https://images.unsplash.com/photo-1775742138486-afd4262157c1?auto=format&fit=crop&w=1200&q=80',
  'GopalSarojini (GS) Residency': 'https://images.unsplash.com/photo-1705708001177-4f664a339b78?auto=format&fit=crop&w=1200&q=80',
};

const ROOM_IMAGES = [
  'https://images.unsplash.com/photo-1656274274410-4a3f86a0fa6f?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1552858725-693709cc17c7?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1552858725-2758b5fb1286?auto=format&fit=crop&w=600&q=80',
];

const FACILITY_ICONS = {
  'Wi-Fi': Wifi, 'CCTV': Camera, '24/7 Security': Shield, 'Parking': Car, 'Gym Access': Dumbbell,
  'Mess / Tiffin': UtensilsCrossed, 'Laundry': Waves, 'AC Rooms': Wind, 'Attached Bathroom': Droplets,
  'Power Backup': Sun, 'Water Purifier': Droplets, 'Common Kitchen': UtensilsCrossed, 'Balcony Rooms': Building2,
};

function FadeIn({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

export default function HostelDetailPage() {
  const { hostelId } = useParams();
  const navigate = useNavigate();
  const [hostel, setHostel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enquiry, setEnquiry] = useState({ name: '', phone: '', email: '', message: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get(`/hostels/public/${hostelId}`)
      .then(res => setHostel(res.data))
      .catch(() => navigate('/hostels'))
      .finally(() => setLoading(false));
  }, [hostelId, navigate]);

  const submitEnquiry = async () => {
    if (!enquiry.name || !enquiry.phone) { toast.error('Name and phone are required'); return; }
    setSending(true);
    try {
      await api.post('/automation/enquiries', { ...enquiry, preferred_hostel: hostel?.name });
      toast.success('Enquiry sent! We\'ll get back to you shortly.');
      setEnquiry({ name: '', phone: '', email: '', message: '' });
    } catch { toast.error('Could not send enquiry. Please try again.'); }
    finally { setSending(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#2D5F3F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hostel) return null;
  const h = hostel;

  const availableRooms = (h.rooms || []).filter(r => r.available_beds > 0);
  const typeLabel = h.hostel_type === 'boys' ? 'Boys Hostel' : h.hostel_type === 'girls' ? 'Girls PG' : 'Co-ed Residency';

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#E8E0D8]/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2D5F3F] flex items-center justify-center">
              <span className="text-white font-bold text-sm" style={{ fontFamily: "'Fraunces', serif" }}>S</span>
            </div>
            <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Subhouz</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/hostels" className="text-[13px] font-medium text-[#6B5E54] hover:text-[#1C1917]">All Hostels</Link>
            <Button onClick={() => document.getElementById('enquiry')?.scrollIntoView({ behavior: 'smooth' })} className="bg-[#2D5F3F] hover:bg-[#1F4A2E] text-white rounded-full px-5 h-9 text-[13px] font-semibold" data-testid="detail-enquiry-btn">
              Send an Enquiry
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero cover */}
      <section className="relative pt-16 h-[50vh] min-h-[360px] overflow-hidden" data-testid="detail-hero">
        <img
          src={HOSTEL_COVERS[h.name] || ROOM_IMAGES[0]}
          alt={h.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917]/70 via-[#1C1917]/20 to-transparent" />
        <div className="relative z-10 h-full flex flex-col justify-end max-w-7xl mx-auto px-6 pb-8">
          <button onClick={() => navigate('/hostels')} className="flex items-center gap-1.5 text-white/70 text-sm mb-4 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to all hostels
          </button>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3 inline-block ${
                h.hostel_type === 'boys' ? 'bg-blue-500/30 text-blue-100' : h.hostel_type === 'girls' ? 'bg-pink-500/30 text-pink-100' : 'bg-purple-500/30 text-purple-100'
              }`}>{typeLabel}</span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>{h.name}</h1>
              <p className="text-white/70 text-sm flex items-center gap-1.5 mt-2"><MapPin className="w-4 h-4" /> {h.address}, {h.city}, {h.state}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-5 py-3 text-center border border-white/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-white text-xl font-bold">{h.average_rating}</span>
                </div>
                <p className="text-white/50 text-[10px] uppercase tracking-wider">{h.review_count} reviews</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-5 py-3 text-center border border-white/10">
                <p className="text-xs text-white/50 uppercase tracking-wider">From</p>
                <p className="text-white text-xl font-bold" style={{ fontFamily: "'Fraunces', serif" }}>₹{h.starting_rent?.toLocaleString()}</p>
                <p className="text-white/50 text-[10px]">per month</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        <div className="grid lg:grid-cols-[1fr_380px] gap-12">
          {/* Left column */}
          <div className="space-y-10">
            {/* Overview stats */}
            <FadeIn>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Rooms', value: h.total_rooms, icon: DoorOpen },
                  { label: 'Total Beds', value: h.total_beds, icon: Users },
                  { label: 'Available Beds', value: h.available_beds, icon: Check, highlight: true },
                  { label: 'Occupancy', value: `${h.occupancy_rate}%`, icon: Building2 },
                ].map((s, i) => (
                  <div key={i} className={`rounded-xl p-4 text-center border ${s.highlight ? 'bg-[#2D5F3F]/5 border-[#2D5F3F]/20' : 'bg-white border-[#E8E0D8]'}`}>
                    <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.highlight ? 'text-[#2D5F3F]' : 'text-[#8C7E72]'}`} />
                    <p className="text-xl font-bold text-[#1C1917]" style={{ fontFamily: "'Fraunces', serif" }}>{s.value}</p>
                    <p className="text-[10px] text-[#8C7E72] uppercase tracking-wider font-medium mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </FadeIn>

            {/* About */}
            <FadeIn>
              <h2 className="text-xl font-semibold tracking-tight mb-3" style={{ fontFamily: "'Fraunces', serif" }}>About This Property</h2>
              <p className="text-sm text-[#6B5E54] leading-relaxed">{h.description}</p>
              <div className="flex flex-wrap gap-3 mt-4">
                {h.phone && <a href={`tel:${h.phone}`} className="flex items-center gap-1.5 text-sm text-[#2D5F3F] font-medium hover:underline"><Phone className="w-4 h-4" />{h.phone}</a>}
                {h.email && <a href={`mailto:${h.email}`} className="flex items-center gap-1.5 text-sm text-[#2D5F3F] font-medium hover:underline"><Mail className="w-4 h-4" />{h.email}</a>}
              </div>
            </FadeIn>

            {/* Facilities */}
            <FadeIn>
              <h2 className="text-xl font-semibold tracking-tight mb-4" style={{ fontFamily: "'Fraunces', serif" }}>Facilities & Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(h.facilities || []).map((f, i) => {
                  const FIcon = FACILITY_ICONS[f] || Shield;
                  return (
                    <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-[#E8E0D8]">
                      <div className="w-9 h-9 rounded-lg bg-[#2D5F3F]/8 flex items-center justify-center shrink-0">
                        <FIcon className="w-4 h-4 text-[#2D5F3F]" />
                      </div>
                      <span className="text-sm font-medium text-[#1C1917]">{f}</span>
                    </div>
                  );
                })}
              </div>
            </FadeIn>

            {/* Available rooms */}
            <FadeIn>
              <h2 className="text-xl font-semibold tracking-tight mb-4" style={{ fontFamily: "'Fraunces', serif" }}>Available Rooms</h2>
              {(h.rooms || []).length === 0 ? (
                <p className="text-sm text-[#8C7E72]">Room details coming soon.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {(h.rooms || []).map((r, ri) => (
                    <Card key={r.id} className={`border-[#E8E0D8] overflow-hidden ${r.available_beds > 0 ? '' : 'opacity-60'}`} data-testid={`room-detail-${r.id}`}>
                      <div className="h-36 overflow-hidden relative">
                        <img src={ROOM_IMAGES[ri % ROOM_IMAGES.length]} alt={`Room ${r.room_number}`} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute top-2 right-2 flex gap-1.5">
                          {r.ac_type === 'ac' && <span className="bg-blue-500/80 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-full backdrop-blur-sm">AC</span>}
                          {r.available_beds > 0 ? (
                            <span className="bg-emerald-500/80 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-full backdrop-blur-sm">{r.available_beds} bed{r.available_beds > 1 ? 's' : ''} free</span>
                          ) : (
                            <span className="bg-red-500/80 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-full backdrop-blur-sm">Full</span>
                          )}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-[#1C1917]" style={{ fontFamily: "'Fraunces', serif" }}>Room {r.room_number}</h4>
                            <p className="text-xs text-[#8C7E72]">Floor {r.floor_number} &middot; {r.capacity} beds &middot; {r.room_type}</p>
                          </div>
                          <p className="text-lg font-bold text-[#2D5F3F]" style={{ fontFamily: "'Fraunces', serif" }}>₹{r.rent?.toLocaleString()}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {r.has_bathroom && <span className="text-[10px] px-2 py-0.5 bg-[#F3EDE6] rounded-full text-[#6B5E54]">Bathroom</span>}
                          {r.has_balcony && <span className="text-[10px] px-2 py-0.5 bg-[#F3EDE6] rounded-full text-[#6B5E54]">Balcony</span>}
                          {(r.amenities || []).map((a, ai) => <span key={ai} className="text-[10px] px-2 py-0.5 bg-[#F3EDE6] rounded-full text-[#6B5E54]">{a}</span>)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </FadeIn>
          </div>

          {/* Right sidebar — enquiry form */}
          <div className="lg:sticky lg:top-24 h-fit">
            <FadeIn delay={0.2}>
              <div id="enquiry" className="bg-white rounded-2xl border border-[#E8E0D8] p-6 shadow-sm" data-testid="detail-enquiry-form">
                <h3 className="font-semibold text-lg mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Interested in this hostel?</h3>
                <p className="text-xs text-[#8C7E72] mb-5">Send us an enquiry and we'll respond within 24 hours.</p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-[#6B5E54]">Full Name *</Label>
                    <Input data-testid="detail-enquiry-name" value={enquiry.name} onChange={e => setEnquiry({...enquiry, name: e.target.value})} placeholder="Your name" className="h-10 rounded-lg border-[#E8E0D8]" />
                  </div>
                  <div>
                    <Label className="text-xs text-[#6B5E54]">Phone *</Label>
                    <Input data-testid="detail-enquiry-phone" value={enquiry.phone} onChange={e => setEnquiry({...enquiry, phone: e.target.value})} placeholder="+91 98765 43210" className="h-10 rounded-lg border-[#E8E0D8]" />
                  </div>
                  <div>
                    <Label className="text-xs text-[#6B5E54]">Email</Label>
                    <Input data-testid="detail-enquiry-email" value={enquiry.email} onChange={e => setEnquiry({...enquiry, email: e.target.value})} placeholder="your@email.com" className="h-10 rounded-lg border-[#E8E0D8]" />
                  </div>
                  <div>
                    <Label className="text-xs text-[#6B5E54]">Message</Label>
                    <textarea data-testid="detail-enquiry-message" value={enquiry.message} onChange={e => setEnquiry({...enquiry, message: e.target.value})} placeholder="Room type, budget, move-in date..." rows={3} className="w-full rounded-lg border border-[#E8E0D8] text-sm px-3 py-2 placeholder:text-[#D5CFC7] focus:outline-none focus:ring-2 focus:ring-[#2D5F3F] resize-none" />
                  </div>
                  <Button data-testid="detail-submit-enquiry" onClick={submitEnquiry} disabled={sending} className="w-full bg-[#2D5F3F] hover:bg-[#1F4A2E] text-white rounded-full h-11 text-sm font-semibold shadow-sm">
                    {sending ? 'Sending...' : <><Send className="w-4 h-4 mr-2" /> Send Enquiry</>}
                  </Button>
                </div>
                {h.phone && (
                  <div className="mt-4 pt-4 border-t border-[#E8E0D8]/60 text-center">
                    <p className="text-xs text-[#8C7E72] mb-2">Or call us directly</p>
                    <a href={`tel:${h.phone}`} className="flex items-center justify-center gap-2 text-sm font-semibold text-[#2D5F3F] hover:underline"><Phone className="w-4 h-4" />{h.phone}</a>
                  </div>
                )}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1C1917] border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#2D5F3F] flex items-center justify-center"><span className="text-white font-bold text-[10px]" style={{ fontFamily: "'Fraunces', serif" }}>S</span></div>
            <span className="text-white text-sm font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>Subhouz</span>
          </div>
          <div className="flex items-center gap-6">
            <p className="text-xs text-[#4A4340]">&copy; {new Date().getFullYear()} Subhouz</p>
            <Link to="/login" className="text-xs text-[#4A4340] hover:text-[#6B5E54]">Admin Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
