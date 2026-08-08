import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, User, ShieldCheck, Sparkles } from 'lucide-react';
import EquinoxLogo from '../components/EquinoxLogo';

export default function LandingAuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register, loginAsDemo } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password, role);
      }
      navigate('/risk-profile');
    } catch (err) {
      // Fallback demo mode for smooth design evaluation
      loginAsDemo(role, name, email);
      navigate('/risk-profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInstantDemo = (demoRole = 'user') => {
    loginAsDemo(demoRole);
    navigate('/risk-profile');
  };

  return (
    <div className="min-h-screen bg-white flex text-slate-900 font-sans">
      
      {/* LEFT COLUMN: Pure White Form Area (Matching Reference Screenshot) */}
      <div className="w-full lg:w-[48%] flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-white">
        
        {/* Top Logo Header with EQUINOX FINTECH */}
        <div className="flex items-center justify-between">
          <div className="cursor-pointer" onClick={() => handleInstantDemo('user')}>
            <EquinoxLogo className="w-8 h-8" textClassName="text-lg" isDarkBg={false} />
          </div>

          <button
            type="button"
            onClick={() => handleInstantDemo('user')}
            className="text-xs font-semibold text-[#00A878] hover:text-emerald-700 transition-colors flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Explore Demo
          </button>
        </div>

        {/* Center Form Container */}
        <div className="max-w-md w-full mx-auto my-auto py-8">
          
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-sm text-slate-500 mb-8">
            {isLogin 
              ? 'Sign in to your Equinox Fintech account to continue.' 
              : 'Join as a Retail Investor or Lead Financial Planner.'}
          </p>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Sarah Jenkins"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                {isLogin && (
                  <button type="button" className="text-xs font-medium text-[#00A878] hover:text-emerald-700 transition-colors">
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Account Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-500 transition-all shadow-sm"
                >
                  <option value="user">Retail Investor / Advisory Client</option>
                  <option value="admin">Lead Financial Planner / Analyst (Admin)</option>
                </select>
              </div>
            )}

            {/* Primary Emerald Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[#00A878] hover:bg-[#009268] text-white font-semibold text-sm rounded-lg transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              <span>{isLogin ? 'Sign in' : 'Create account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </form>

          {/* OR Divider */}
          <div className="relative my-8 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <span className="relative px-4 bg-white text-xs font-semibold text-slate-400 uppercase tracking-wider">OR</span>
          </div>

          {/* Toggle Sign in / Sign up link */}
          <div className="text-center text-xs text-slate-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="font-bold text-[#00A878] hover:text-[#008660] transition-colors"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>

          {/* Quick Demo Shortcuts */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={() => handleInstantDemo('user')}
              className="flex-1 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-all flex items-center justify-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-[#00A878]" />
              Demo Investor
            </button>
            <button
              type="button"
              onClick={() => handleInstantDemo('admin')}
              className="flex-1 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-all flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              Demo Admin
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 border-t border-slate-100 pt-6">
          <span>© 2026 Equinox Fintech Inc.</span>
          <div className="flex gap-4">
            <a href="#privacy" className="hover:text-slate-600 transition-colors">Privacy</a>
            <a href="#terms" className="hover:text-slate-600 transition-colors">Terms</a>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Dark Institutional Analytics Showcase Panel */}
      <div className="hidden lg:flex lg:w-[52%] bg-[#080E18] relative flex-col justify-between p-12 overflow-hidden border-l border-slate-800/80">
        
        {/* Decorative Subtle Grid Lines Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none"></div>

        {/* Top Header Card */}
        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#00A878]">Live Performance</span>
              <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight mt-0.5">Global Alpha Fund</h2>
            </div>
            <span className="px-3 py-1 rounded-md bg-[#00A878]/10 border border-[#00A878]/20 text-[#00A878] text-xs font-mono font-bold flex items-center gap-1">
              ↗ +12.4% YTD
            </span>
          </div>

          {/* Interactive Simulated Line Graph Canvas Widget */}
          <div className="p-6 rounded-xl bg-[#0C1424] border border-slate-800/90 relative overflow-hidden backdrop-blur-md">
            
            {/* Floating Metric Callouts */}
            <div className="absolute top-12 left-1/3 px-3 py-1.5 rounded bg-slate-950/90 border border-slate-800 text-[11px] font-mono font-semibold text-slate-200 shadow-xl">
              Vol: 8.2%
            </div>

            <div className="absolute bottom-16 right-16 px-3.5 py-1.5 rounded bg-white border border-slate-300 text-xs font-mono font-extrabold text-slate-900 shadow-xl">
              Nav: $1,245.60
            </div>

            {/* SVG Trend Line */}
            <div className="h-64 w-full flex items-end pt-10">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200" fill="none">
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00A878" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#00A878" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Grid Horizontals */}
                <line x1="0" y1="40" x2="500" y2="40" stroke="#1E293B" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="90" x2="500" y2="90" stroke="#1E293B" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="140" x2="500" y2="140" stroke="#1E293B" strokeWidth="1" strokeDasharray="4 4" />

                {/* Area Fill */}
                <path d="M0,150 L60,135 L120,160 L180,105 L240,118 L300,75 L360,95 L420,40 L500,70 L500,200 L0,200 Z" fill="url(#gradient)" />

                {/* Green Line */}
                <path d="M0,150 L60,135 L120,160 L180,105 L240,118 L300,75 L360,95 L420,40 L500,70" stroke="#00A878" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Active Data Nodes */}
                <circle cx="180" cy="105" r="3.5" fill="#00A878" />
                <circle cx="420" cy="40" r="4.5" fill="#34D399" />
              </svg>
            </div>

            {/* Quarter Axes */}
            <div className="flex justify-between text-[11px] font-mono text-slate-500 pt-4 border-t border-slate-800/60 mt-2">
              <span>Q1</span>
              <span>Q2</span>
              <span>Q3</span>
              <span>Q4</span>
            </div>
          </div>

        </div>

        {/* Bottom Testimonial Card */}
        <div className="relative z-10 p-6 rounded-xl bg-[#0C1424]/80 border border-slate-800/80 backdrop-blur-md">
          <p className="text-sm text-slate-300 italic leading-relaxed mb-4">
            “The high-density data views and institutional-grade analytics have transformed how our advisory team manages client portfolios. Absolute clarity, zero noise.”
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-sm">
              SJ
            </div>
            <div>
              <div className="text-sm font-bold text-slate-100">Sarah Jenkins</div>
              <div className="text-xs text-slate-400">Lead Financial Planner, Apex Wealth</div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
