import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EquinoxLogo from './EquinoxLogo';
import EquinoxAIChatModal from './EquinoxAIChatModal';
import { 
  PieChart, TrendingUp, Sparkles, FileText, ShieldAlert, Settings, 
  HelpCircle, Award
} from 'lucide-react';

export default function Sidebar({ activePage }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isChatOpen, setIsChatOpen] = useState(false);

  const currentPath = location.pathname;

  const isActive = (path) => {
    if (activePage) return activePage === path;
    return currentPath === path;
  };

  return (
    <>
      <aside className="w-64 h-screen bg-[#1E293B] text-slate-300 flex flex-col justify-between p-4 border-r border-slate-700/50 shrink-0 sticky top-0 z-30 select-none">
        <div>
          {/* Logo Header */}
          <div className="px-3 py-4 mb-6">
            <EquinoxLogo className="w-7 h-7 text-[#00A878]" textClassName="text-base" isDarkBg={true} />
          </div>

          {/* Navigation Links (Exact Reference Order) */}
          <nav className="space-y-1">
            <Link
              to="/dashboard"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                isActive('/dashboard')
                  ? 'font-bold text-[#00A878] bg-[#00A878]/15 border-l-4 border-[#00A878]'
                  : 'font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <PieChart className={`w-4 h-4 ${isActive('/dashboard') ? 'text-[#00A878]' : ''}`} />
              Dashboard
            </Link>

            <Link
              to="/planner"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                isActive('/planner')
                  ? 'font-bold text-[#00A878] bg-[#00A878]/15 border-l-4 border-[#00A878]'
                  : 'font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <TrendingUp className={`w-4 h-4 ${isActive('/planner') ? 'text-[#00A878]' : ''}`} />
              Portfolio Planner
            </Link>

            <Link
              to="/recommendations"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                isActive('/recommendations')
                  ? 'font-bold text-[#00A878] bg-[#00A878]/15 border-l-4 border-[#00A878]'
                  : 'font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${isActive('/recommendations') ? 'text-[#00A878]' : 'text-emerald-400'}`} />
              Recommendations
            </Link>

            <Link
              to="/reports"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                isActive('/reports')
                  ? 'font-bold text-[#00A878] bg-[#00A878]/15 border-l-4 border-[#00A878]'
                  : 'font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <FileText className={`w-4 h-4 ${isActive('/reports') ? 'text-[#00A878]' : ''}`} />
              Reports
            </Link>

            <Link
              to="/risk-profile"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                isActive('/risk-profile')
                  ? 'font-bold text-[#00A878] bg-[#00A878]/15 border-l-4 border-[#00A878]'
                  : 'font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <ShieldAlert className={`w-4 h-4 ${isActive('/risk-profile') ? 'text-[#00A878]' : ''}`} />
              Risk Profile
            </Link>

            <Link
              to="/settings"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                isActive('/settings')
                  ? 'font-bold text-[#00A878] bg-[#00A878]/15 border-l-4 border-[#00A878]'
                  : 'font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Settings className={`w-4 h-4 ${isActive('/settings') ? 'text-[#00A878]' : ''}`} />
              Settings
            </Link>

            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                  isActive('/admin')
                    ? 'font-bold text-[#00A878] bg-[#00A878]/15 border-l-4 border-[#00A878]'
                    : 'font-semibold text-purple-400 hover:text-purple-200 hover:bg-slate-800/60'
                }`}
              >
                <Award className={`w-4 h-4 ${isActive('/admin') ? 'text-[#00A878]' : 'text-purple-400'}`} />
                Admin Terminal
              </Link>
            )}
          </nav>
        </div>

        {/* Sidebar Bottom Actions */}
        <div className="space-y-3 pt-6 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            className="w-full py-3 bg-[#00A878] hover:bg-[#009268] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Ask Equinox
          </button>

          <Link to="/help" className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors">
            <HelpCircle className="w-4 h-4" />
            Help Center
          </Link>
        </div>
      </aside>

      {/* Interactive AI Chat Modal */}
      <EquinoxAIChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
}
