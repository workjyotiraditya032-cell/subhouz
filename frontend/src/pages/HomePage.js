import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Building2, Shield, Cloud, Bell, BarChart3, Users, CreditCard, Calendar, ChevronDown, ArrowRight, CheckCircle2, Star, MessageCircle, Phone } from 'lucide-react';
import { Button } from '../components/ui/button';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function AnimatedCounter({ target, prefix = '', suffix = '', duration = 2 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [inView, target, duration]);
  return <span ref={ref}>{prefix}{typeof target === 'number' && target % 1 !== 0 ? count.toFixed(1) : count}{suffix}</span>;
}

function FloatingCard({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      className={`glass-card p-4 ${className}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
    >
      {children}
    </motion.div>
  );
}

const heroCards = [
  { icon: Users, label: 'Active Residents', value: 512, suffix: '', color: '#1D4ED8' },
  { icon: CreditCard, label: 'Rent Collected', value: 8.6, prefix: '₹', suffix: 'L', color: '#10B981' },
  { icon: Bell, label: 'Pending Payments', value: 18, suffix: '', color: '#F59E0B' },
  { icon: BarChart3, label: 'Occupancy Rate', value: 97, suffix: '%', color: '#10B981' },
  { icon: Building2, label: 'Revenue Growth', value: 18, prefix: '+', suffix: '%', color: '#1D4ED8' },
  { icon: Calendar, label: "Today's Check-ins", value: 12, suffix: '', color: '#8B5CF6' },
];

const trustBadges = [
  '500+ Residents Supported',
  'Multi-Hostel Management',
  'Secure Cloud Database',
  'Automated Rent Tracking',
  'WhatsApp Reminders',
];

const features = [
  { icon: Building2, title: 'Multi-Hostel Management', desc: 'Manage unlimited hostels from a single dashboard with real-time occupancy, revenue tracking, and comparative analytics.' },
  { icon: CreditCard, title: 'One-Tap Rent Collection', desc: 'Mark rent as paid with a single tap. Auto-generate receipts and send WhatsApp challans instantly.' },
  { icon: Bell, title: 'Smart Automation', desc: 'Automated rent reminders, due date alerts, and follow-up notifications via WhatsApp. No manual work.' },
  { icon: Shield, title: 'Secure & Reliable', desc: 'Enterprise-grade security with encrypted data, role-based access, audit logs, and cloud backups.' },
  { icon: BarChart3, title: 'Analytics & Reports', desc: 'Revenue charts, occupancy trends, payment status, and exportable reports for better decision making.' },
  { icon: Users, title: 'Resident Profiles', desc: 'Complete resident management with identity verification, agreement tracking, and payment history.' },
];

const testimonials = [
  { name: 'Rajesh Kumar', role: 'Hostel Owner, Bhubaneswar', text: 'Subhouz transformed how I manage my 3 hostels. The one-tap rent collection alone saves me hours every month.', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face' },
  { name: 'Priya Mohanty', role: 'PG Manager, Patia', text: 'The automated WhatsApp reminders reduced my pending payments by 60%. My residents love the instant receipts.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face' },
  { name: 'Sanjay Dash', role: 'Property Manager', text: 'Finally a platform that understands hostel management. The dashboard gives me complete visibility across all properties.', avatar: 'https://images.unsplash.com/photo-1607503873903-c5e95f80d7b9?w=80&h=80&fit=crop&crop=face' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const headline = "Modern Hostel Management, Simplified.";
  const words = headline.split(' ');

  return (
    <div className="bg-[#050B14] text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#050B14]/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-7 h-7 text-[#10B981]" />
            <span className="font-bold text-xl tracking-tight" style={{ fontFamily: 'Outfit' }}>Subhouz</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </div>
          <Button
            data-testid="nav-login-btn"
            onClick={() => navigate('/login')}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-lg px-5 h-9 text-sm font-medium backdrop-blur-sm"
          >
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-gradient-bg min-h-screen flex items-center pt-16 relative" data-testid="hero-section">
        <div className="hero-grid" />
        {/* Glow */}
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10 py-20">
          {/* Left */}
          <div className="space-y-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-badge inline-flex px-4 py-1.5 text-xs font-medium text-emerald-400 tracking-widest uppercase">
              Smart Hostel Management Platform
            </motion.div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter leading-[1.1]" style={{ fontFamily: 'Outfit' }}>
              {words.map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-block mr-3"
                >
                  {word}
                </motion.span>
              ))}
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed"
            >
              Designed for hostel owners managing hundreds of residents. Track payments, automate WhatsApp rent reminders, manage multiple hostels, and streamline every operation from one intelligent platform.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="flex flex-wrap gap-4"
            >
              <Button
                data-testid="hero-cta-btn"
                onClick={() => navigate('/login')}
                className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-lg px-8 h-12 text-base font-semibold shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all duration-200 hover:scale-[1.02]"
              >
                Start Managing Today <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                data-testid="hero-demo-btn"
                variant="outline"
                className="border-white/15 text-white hover:bg-white/5 rounded-lg px-6 h-12 text-base font-medium"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Explore Features
              </Button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
              className="flex flex-wrap gap-3 pt-2"
            >
              {trustBadges.map((badge, i) => (
                <span key={i} className="glass-badge px-3 py-1.5 text-xs text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {badge}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right - Floating cards */}
          <div className="relative h-[500px] hidden lg:block">
            {heroCards.map((card, i) => {
              const positions = [
                'top-0 left-0', 'top-0 right-0', 'top-1/3 left-8',
                'top-1/3 right-8', 'bottom-16 left-0', 'bottom-16 right-0',
              ];
              const floatClass = ['float-slow', 'float-slow-delay', 'float-slow-delay2', 'float-slow', 'float-slow-delay', 'float-slow-delay2'];
              return (
                <FloatingCard key={i} className={`absolute ${positions[i]} w-[200px] ${floatClass[i]}`} delay={0.4 + i * 0.15}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${card.color}20` }}>
                      <card.icon className="w-4 h-4" style={{ color: card.color }} />
                    </div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">{card.label}</span>
                  </div>
                  <div className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Outfit' }}>
                    <AnimatedCounter target={card.value} prefix={card.prefix || ''} suffix={card.suffix} />
                  </div>
                </FloatingCard>
              );
            })}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 scroll-indicator">
          <ChevronDown className="w-5 h-5 text-slate-500" />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 relative" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-[0.2em]">Features</span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-3" style={{ fontFamily: 'Outfit' }}>Everything You Need to Manage Hostels</h2>
            <p className="text-slate-400 mt-4 max-w-2xl mx-auto text-base">From resident onboarding to automated rent reminders, Subhouz handles every aspect of hostel operations.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 group hover:border-emerald-500/20 transition-all duration-300"
                data-testid={`feature-card-${i}`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#1D4ED8]/10 flex items-center justify-center mb-4 group-hover:bg-[#1D4ED8]/20 transition-colors">
                  <f.icon className="w-5 h-5 text-[#1D4ED8]" />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Outfit' }}>{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 border-y border-white/5">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: 500, suffix: '+', label: 'Residents Managed' },
            { value: 3, suffix: '', label: 'Hostels Active' },
            { value: 98, suffix: '%', label: 'On-Time Payments' },
            { value: 50, suffix: 'L+', prefix: '₹', label: 'Rent Collected' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: 'Outfit' }}>
                <AnimatedCounter target={s.value} prefix={s.prefix || ''} suffix={s.suffix} />
              </div>
              <p className="text-sm text-slate-500 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24" data-testid="testimonials-section">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-[0.2em]">Testimonials</span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-3" style={{ fontFamily: 'Outfit' }}>Trusted by Hostel Owners</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6"
                data-testid={`testimonial-card-${i}`}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="py-24 relative" data-testid="cta-section">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1D4ED8]/5 to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: 'Outfit' }}>Ready to Modernize Your Hostel?</h2>
          <p className="text-slate-400 mt-4 text-base max-w-xl mx-auto">Join hostel owners who have already streamlined their operations with Subhouz. Start your free trial today.</p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Button
              data-testid="cta-start-btn"
              onClick={() => navigate('/login')}
              className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-lg px-8 h-12 text-base font-semibold shadow-lg shadow-blue-600/25"
            >
              Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              className="border-white/15 text-white hover:bg-white/5 rounded-lg px-6 h-12"
            >
              <Phone className="w-4 h-4 mr-2" /> Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#10B981]" />
            <span className="font-bold tracking-tight" style={{ fontFamily: 'Outfit' }}>Subhouz</span>
            <span className="text-xs text-slate-600 ml-2">Smart Hostel Management</span>
          </div>
          <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} Subhouz. All rights reserved.</p>
          <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
            <MessageCircle className="w-4 h-4" /> WhatsApp Support
          </a>
        </div>
      </footer>
    </div>
  );
}
