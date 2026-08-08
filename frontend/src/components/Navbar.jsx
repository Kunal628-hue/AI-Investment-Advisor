import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ShieldAlert, PieChart, Activity, Sun, Moon, LogOut, UserCheck, TrendingUp } from 'lucide-react';
import EquinoxLogo from './EquinoxLogo';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide global Navbar after sign in or on internal dashboard pages (which have integrated left sidebar & header)
  if (user || location.pathname !== '/auth') {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo EQUINOX FINTECH */}
        <Link to={user ? "/dashboard" : "/"} className="flex items-center group">
          <EquinoxLogo className="w-7 h-7" textClassName="text-base" isDarkBg={false} />
        </Link>

        {/* Navigation Links */}
        {user && (
          <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-950/40 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <Link
              to="/dashboard"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive('/dashboard') ? 'bg-[#00A878] text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <PieChart className="w-4 h-4" />
              Dashboard
            </Link>

            <Link
              to="/planner"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive('/planner') ? 'bg-[#00A878] text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Portfolio Planner
            </Link>

            <Link
              to="/risk-profile"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive('/risk-profile') ? 'bg-[#00A878] text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Risk Profiling
            </Link>

            {user.role === 'admin' && (
              <Link
                to="/admin"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive('/admin') ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-200'
                }`}
              >
                <Activity className="w-4 h-4" />
                Admin Telemetry
              </Link>
            )}
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-[#00A878]" />
              <span className="text-slate-700 dark:text-slate-300 font-semibold">{user.name}</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold font-mono text-[10px]">
                Risk: {user.riskProfile?.score || 65}
              </span>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700/50"
            title="Toggle Dark/Light Mode"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {user ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-colors border border-rose-200 dark:border-rose-500/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-2 rounded-lg bg-[#00A878] hover:bg-[#009268] text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
            >
              Sign In
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
}
