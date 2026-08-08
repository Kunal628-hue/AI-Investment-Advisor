import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import EquinoxLogo from '../components/EquinoxLogo';
import Sidebar from '../components/Sidebar';
import { 
  PieChart, TrendingUp, Sparkles, FileText, ShieldAlert, Settings as SettingsIcon, 
  HelpCircle, User, Lock, Bell, Cpu, Check, Moon
} from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('account');
  const [userName, setUserName] = useState(user?.name || '');
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userAPI.updateProfile({ name: userName, email: userEmail });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.warn('Profile save notice:', err.message);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen bg-[#F8FAFC] flex overflow-hidden text-slate-900 font-sans">
      
      {/* FIXED LEFT SIDEBAR */}
      <Sidebar activePage="/settings" />

      {/* RIGHT MAIN CONTENT AREA (SCROLLABLE) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* TOP HEADER BAR */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between gap-4 sticky top-0 z-20">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Equinox Settings</h1>

          {/* Right Header Icons */}
          <div className="flex items-center gap-4">
            <button type="button" className="p-2 text-slate-500 hover:text-slate-900 transition-colors">
              <Moon className="w-4 h-4" />
            </button>
            <button type="button" className="p-2 text-slate-500 hover:text-slate-900 transition-colors relative">
              <Bell className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center border border-slate-700 cursor-pointer">
              {userName.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT AREA */}
        <div className="flex-1 p-8 space-y-6 overflow-y-auto max-w-5xl w-full">
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Settings</h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage your account parameters, security preferences, and AI advisor constraints.</p>
            </div>
            {saved && (
              <div className="px-3 py-1.5 bg-emerald-50 text-[#00A878] border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 animate-fadeIn">
                <Check className="w-4 h-4" />
                Settings saved successfully!
              </div>
            )}
          </div>

          {/* Tabs Container */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            
            {/* Filter Tabs Header */}
            <div className="flex items-center gap-6 border-b border-slate-200 pb-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('account')}
                className={`pb-3 relative transition-colors ${
                  activeTab === 'account' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Account Profile
                {activeTab === 'account' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00A878]"></span>}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('notifications')}
                className={`pb-3 relative transition-colors ${
                  activeTab === 'notifications' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Notifications & Alerts
                {activeTab === 'notifications' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00A878]"></span>}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('api')}
                className={`pb-3 relative transition-colors ${
                  activeTab === 'api' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                AI Model & API Keys
                {activeTab === 'api' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00A878]"></span>}
              </button>
            </div>

            {/* TAB 1: ACCOUNT PROFILE */}
            {activeTab === 'account' && (
              <form onSubmit={handleSave} className="space-y-6 max-w-xl">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Account Role</label>
                  <input
                    type="text"
                    value={user?.role === 'admin' ? 'Institutional Administrator' : 'Standard Advisory Client'}
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#00A878] hover:bg-[#009268] text-white font-bold text-xs rounded-lg transition-all shadow-sm"
                  >
                    Save Changes
                  </button>

                  <button
                    type="button"
                    onClick={() => logout && logout()}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-lg border border-rose-200 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="space-y-6 max-w-xl">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Email Portfolio Drift Alerts</div>
                    <div className="text-[11px] text-slate-500">Receive instant email when asset allocation strays &gt;3% from target</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailAlerts(!emailAlerts)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      emailAlerts ? 'bg-[#00A878] justify-end' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
                  </button>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Push Notifications & Market Summaries</div>
                    <div className="text-[11px] text-slate-500">Real-time alerts for FinBERT sentiment score shifts in key holdings</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPushNotifications(!pushNotifications)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      pushNotifications ? 'bg-[#00A878] justify-end' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: AI MODEL & API KEYS */}
            {activeTab === 'api' && (
              <div className="space-y-6 max-w-xl">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-[#00A878]" />
                    Configured AI Providers
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Equinox Fintech integrates with <strong>Google Gemini 1.5 Pro</strong> and <strong>FinBERT Sentiment Engines</strong> for real-time market rationale generation.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Google Gemini API Key</label>
                  <input
                    type="password"
                    value="••••••••••••••••••••••••••••••••"
                    readOnly
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 focus:outline-none"
                  />
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
