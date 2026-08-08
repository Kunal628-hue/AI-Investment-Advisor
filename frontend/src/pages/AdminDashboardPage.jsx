import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import EquinoxLogo from '../components/EquinoxLogo';
import Sidebar from '../components/Sidebar';
import { 
  PieChart, TrendingUp, Sparkles, FileText, ShieldAlert, Settings, 
  HelpCircle, Users, Activity, Clock, AlertTriangle, Bell, Download,
  ArrowRight, ShieldCheck, HelpCircle as HelpIcon, LogOut, CheckCircle2, ChevronRight
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [driftMetrics, setDriftMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [analyticsRes, driftRes] = await Promise.all([
        adminAPI.getAnalytics(),
        adminAPI.getModelDrift()
      ]);

      if (analyticsRes.data?.success) setAnalytics(analyticsRes.data.analytics);
      if (driftRes.data?.success) setDriftMetrics(driftRes.data.driftMetrics);
    } catch (err) {
      console.warn('Using design showcase telemetry data');
      setAnalytics({
        users: { total: 12482, growth: '+2.4%' },
        portfolios: { totalCount: 8105, growth: '+1.1%' },
        systemHealth: { status: 'Operational', uptimePct: 99.9, avgApiLatencyMs: 42 }
      });
      setDriftMetrics({
        flaggedCount: 3,
        events: [
          { timestamp: '2026-10-27 14:32:01', metric: 'Alpha-Beta Spread (Eq)', valueBaseline: '0.045 / 0.021', severity: 'Critical' },
          { timestamp: '2026-10-27 11:15:44', metric: 'Volatility Skew Index', valueBaseline: '1.82 / 1.50', severity: 'Warning' },
          { timestamp: '2026-10-26 23:45:10', metric: 'Sentiment Score (NLP)', valueBaseline: '62.4 / 65.0', severity: 'Info' },
          { timestamp: '2026-10-26 09:05:22', metric: 'Liquidity Ratio Estimate', valueBaseline: '0.85 / 1.20', severity: 'Critical' }
        ]
      });
    }
  };

  const dailyActiveUsersBars = [
    30, 32, 38, 35, 45, 50, 48, 55, 58, 52, 62, 59, 68, 64, 70,
    62, 75, 78, 85, 88, 72, 80, 84, 82, 79, 75, 72
  ];

  return (
    <div className="h-screen bg-[#F8FAFC] flex overflow-hidden text-slate-900 font-sans">
      
      {/* FIXED LEFT SIDEBAR */}
      <Sidebar activePage="/admin" />

      {/* RIGHT MAIN CONTENT AREA (SCROLLABLE) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* TOP HEADER BAR */}
        <header className="bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Performance Terminal</h1>
            <p className="text-xs text-slate-500 mt-0.5">Monitoring platform health and model performance metrics.</p>
          </div>

          <div className="flex items-center gap-4">
            <button type="button" className="p-2 text-slate-500 hover:text-slate-900 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
            <button type="button" className="p-2 text-slate-500 hover:text-slate-900 transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center border border-slate-700 cursor-pointer">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SJ'}
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT */}
        <div className="flex-1 p-8 space-y-8 overflow-y-auto">
          
          {/* TOP 4 STAT CARDS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1: Total Users */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                <span>Total Users</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">12,482</span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#00A878] border border-emerald-200 text-[11px] font-mono font-bold">
                  ↗ +2.4%
                </span>
              </div>
            </div>

            {/* Card 2: Active Portfolios */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                <span>Active Portfolios</span>
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">8,105</span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#00A878] border border-emerald-200 text-[11px] font-mono font-bold">
                  ↗ +1.1%
                </span>
              </div>
            </div>

            {/* Card 3: Avg. API Latency */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                <span>Avg. API Latency</span>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">42ms</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-mono font-semibold">
                  Stable
                </span>
              </div>
            </div>

            {/* Card 4: Model Drift Alerts (Warning Tint) */}
            <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-5 shadow-sm relative space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-rose-700">
                <span>Model Drift Alerts</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-rose-600 font-mono">3</span>
                <span className="text-rose-600 font-bold text-sm">Flagged</span>
              </div>
            </div>

          </div>

          {/* MIDDLE 2 CHARTS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Chart 1: Daily Active Users (Bar Chart) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900">Daily Active Users</h3>
                <span className="text-xs text-slate-400 font-medium">Last 30 Days</span>
              </div>

              {/* Bar Chart Visual */}
              <div className="h-48 flex items-end justify-between gap-1.5 pt-6 pb-2">
                {dailyActiveUsersBars.map((val, idx) => (
                  <div key={idx} className="flex-1 bg-slate-100 rounded-t h-full flex items-end">
                    <div 
                      className="w-full bg-[#00A878] rounded-t transition-all hover:opacity-80" 
                      style={{ height: `${val}%` }}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100">
                <span>T-30</span>
                <span>Today</span>
              </div>
            </div>

            {/* Chart 2: Sentiment Model Accuracy (Line Plot vs Threshold) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900">Sentiment Model Accuracy</h3>
                <span className="text-xs text-slate-400 font-medium">Threshold (85%)</span>
              </div>

              {/* Line Plot SVG */}
              <div className="h-48 w-full relative pt-4">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 300 150">
                  {/* Threshold Dotted Line */}
                  <line x1="0" y1="50" x2="300" y2="50" stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" />
                  <text x="5" y="45" fill="#64748B" fontSize="9" fontFamily="monospace">85%</text>

                  <line x1="0" y1="130" x2="300" y2="130" stroke="#E2E8F0" strokeWidth="1" />
                  <text x="5" y="125" fill="#94A3B8" fontSize="9" fontFamily="monospace">70%</text>

                  {/* Accuracy Line Plot */}
                  <path 
                    d="M 0 90 L 30 75 L 60 105 L 90 60 L 120 70 L 150 40 L 180 65 L 210 30 L 240 50 L 270 40 L 300 25" 
                    stroke="#00A878" 
                    strokeWidth="2" 
                    fill="none" 
                    strokeLinecap="round" 
                  />

                  {/* Nodes Above Threshold */}
                  <circle cx="150" cy="40" r="3.5" fill="#00A878" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="210" cy="30" r="3.5" fill="#00A878" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="300" cy="25" r="3.5" fill="#00A878" stroke="#ffffff" strokeWidth="1.5" />
                </svg>
              </div>
            </div>

          </div>

          {/* BOTTOM TABLE: Recent Flagged Drift Events */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm space-y-4">
            
            <div className="p-6 pb-2 flex justify-between items-center border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Recent Flagged Drift Events</h3>
              <button type="button" className="text-xs font-bold text-[#00A878] hover:text-[#009268] flex items-center gap-1">
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-mono font-semibold uppercase">
                  <th className="py-3 px-6">Timestamp (UTC)</th>
                  <th className="py-3 px-6">Metric</th>
                  <th className="py-3 px-6">Value / Baseline</th>
                  <th className="py-3 px-6">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-6 font-bold text-slate-900">2026-10-27 14:32:01</td>
                  <td className="py-3.5 px-6 text-slate-700 font-sans font-medium">Alpha-Beta Spread (Eq)</td>
                  <td className="py-3.5 px-6 font-bold text-rose-600">0.045 / 0.021</td>
                  <td className="py-3.5 px-6">
                    <span className="px-2.5 py-0.5 rounded bg-rose-100 text-rose-700 font-sans font-bold text-[10px]">
                      Critical
                    </span>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-6 font-bold text-slate-900">2026-10-27 11:15:44</td>
                  <td className="py-3.5 px-6 text-slate-700 font-sans font-medium">Volatility Skew Index</td>
                  <td className="py-3.5 px-6 font-bold text-amber-700">1.82 / 1.50</td>
                  <td className="py-3.5 px-6">
                    <span className="px-2.5 py-0.5 rounded bg-amber-100 text-amber-800 font-sans font-bold text-[10px]">
                      Warning
                    </span>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-6 font-bold text-slate-900">2026-10-26 23:45:10</td>
                  <td className="py-3.5 px-6 text-slate-700 font-sans font-medium">Sentiment Score (NLP)</td>
                  <td className="py-3.5 px-6 font-bold text-slate-700">62.4 / 65.0</td>
                  <td className="py-3.5 px-6">
                    <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-600 font-sans font-bold text-[10px]">
                      Info
                    </span>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-6 font-bold text-slate-900">2026-10-26 09:05:22</td>
                  <td className="py-3.5 px-6 text-slate-700 font-sans font-medium">Liquidity Ratio Estimate</td>
                  <td className="py-3.5 px-6 font-bold text-rose-600">0.85 / 1.20</td>
                  <td className="py-3.5 px-6">
                    <span className="px-2.5 py-0.5 rounded bg-rose-100 text-rose-700 font-sans font-bold text-[10px]">
                      Critical
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

          </div>

        </div>

      </div>

    </div>
  );
}
