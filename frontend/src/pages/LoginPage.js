import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { formatApiError } from '../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050B14] flex items-center justify-center relative overflow-hidden" data-testid="login-page">
      {/* Background effects */}
      <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="hero-grid" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md mx-4 relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Building2 className="w-8 h-8 text-[#10B981]" />
          <span className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Outfit' }}>Subhouz</span>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold text-white text-center mb-1" style={{ fontFamily: 'Outfit' }}>Welcome back</h2>
          <p className="text-sm text-slate-400 text-center mb-6">Sign in to your dashboard</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-sm text-red-400" data-testid="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-slate-300">Email</Label>
              <Input
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@subhouz.com"
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-11 rounded-lg focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-slate-300">Password</Label>
              <div className="relative">
                <Input
                  data-testid="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-11 rounded-lg focus:ring-blue-600 focus:border-blue-600 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  data-testid="toggle-password-btn"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              data-testid="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white h-11 rounded-lg font-semibold shadow-lg shadow-blue-600/25 mt-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                <span className="flex items-center gap-2">Sign In <ArrowRight className="w-4 h-4" /></span>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/5">
            <p className="text-xs text-slate-500 text-center">
              Demo: admin@subhouz.com / SubhouzAdmin@2026
            </p>
          </div>
        </div>

        <button onClick={() => navigate('/')} className="mt-6 text-sm text-slate-500 hover:text-slate-300 transition-colors block mx-auto">
          &larr; Back to home
        </button>
      </motion.div>
    </div>
  );
}
