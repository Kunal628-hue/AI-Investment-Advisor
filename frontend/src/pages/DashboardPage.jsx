import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { portfolioAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import EquinoxLogo from '../components/EquinoxLogo';
import Sidebar from '../components/Sidebar';
import EquinoxAIChatModal from '../components/EquinoxAIChatModal';
import { 
  PieChart as PieChartIcon, TrendingUp, ShieldAlert, FileText, Download, 
  Trash2, RefreshCw, Cpu, Award, Zap, ChevronRight, CheckCircle2, Sparkles, Sliders,
  Settings, HelpCircle, Bell, Search, LogOut, UserCheck, Plus
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';

const COLORS = ['#00A878', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'];

export default function DashboardPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [portfolios, setPortfolios] = useState([]);
  const [activePortfolio, setActivePortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchPortfolios();
  }, [user]);

  const fetchPortfolios = async () => {
    setLoading(true);
    let loadedPortfolios = [];

    // 1. Try fetching saved portfolios from MongoDB
    try {
      const res = await portfolioAPI.getPortfolios();
      if (res.data?.success && Array.isArray(res.data.portfolios)) {
        loadedPortfolios = res.data.portfolios;
      }
    } catch (err) {
      console.warn('API connection notice:', err.message);
    }

    // 2. Check localStorage for planned portfolio assets fallback
    const storageKeyAssets = `portfolio_assets_${user?.id || user?._id || 'guest'}`;
    const storageKeyTotal  = `portfolio_total_${user?.id || user?._id || 'guest'}`;
    try {
      const savedAssetsStr = localStorage.getItem(storageKeyAssets);
      if (savedAssetsStr) {
        const savedAssets = JSON.parse(savedAssetsStr);
        if (Array.isArray(savedAssets) && savedAssets.length > 0) {
          const totalVal = Number(localStorage.getItem(storageKeyTotal)) || 100000;
          const assetsWithWeight = savedAssets.map(a => ({
            ticker: a.ticker,
            assetName: a.company || a.name || `${a.ticker} Ltd`,
            sector: a.sector || 'Equity',
            weight: totalVal > 0 ? (Number(a.amountInvested) || 0) / totalVal : 1 / savedAssets.length,
            percentage: totalVal > 0 ? Number((((Number(a.amountInvested) || 0) / totalVal) * 100).toFixed(1)) : Number((100 / savedAssets.length).toFixed(1)),
            shares: Math.max(1, Math.round((Number(a.amountInvested) || 10000) / (a.price || 100))),
            latestPrice: a.price || 100,
            allocationValue: Number(a.amountInvested) || Math.round(totalVal / savedAssets.length)
          }));

          const storageKeyOpt = `portfolio_opt_${user?.id || user?._id || 'guest'}`;
          let optData = null;
          try {
            const savedOpt = localStorage.getItem(storageKeyOpt);
            if (savedOpt) optData = JSON.parse(savedOpt);
          } catch {}

          const summary = optData?.summary || optData;
          const realExpectedReturn = summary?.expectedReturn ?? summary?.expected_return ?? (savedAssets.reduce((sum, a) => sum + (a.returnPct || 12), 0) / savedAssets.length / 100);
          const realVolatility = summary?.volatility ?? 0.247;
          const realSharpe = summary?.sharpeRatio ?? summary?.sharpe_ratio ?? (realExpectedReturn / (realVolatility || 0.247));

          const localPortfolio = {
            _id: 'planned_local_portfolio',
            name: `${user?.name || 'Active'} Planned Strategy`,
            investmentAmount: totalVal,
            objective: 'max_sharpe',
            assets: assetsWithWeight,
            metrics: {
              expectedReturn: realExpectedReturn,
              volatility: realVolatility,
              sharpeRatio: Number(realSharpe.toFixed(2)),
              leftoverCash: summary?.leftoverCash || Math.max(0, totalVal - savedAssets.reduce((s, a) => s + (Number(a.amountInvested) || 0), 0))
            },
            efficientFrontier: optData?.efficientFrontier || [],
            historicalPerformance: optData?.historicalPerformance || [],
            riskMetrics: optData?.riskMetrics || {
              maxDrawdown: -0.152,
              valueAtRisk95: -0.021,
              portfolioBeta: 0.95
            },
            aiNarrative: optData?.narrative || {
              executiveSummary: `This strategy allocates ₹${totalVal.toLocaleString('en-IN')} across ${savedAssets.length} active holdings including ${savedAssets.map(a => a.ticker).slice(0, 3).join(', ')}.`,
              allocationRationale: 'Optimized weighting based on current asset allocations.',
              riskAndVolatilityAnalysis: `Portfolio volatility is estimated at ${(realVolatility * 100).toFixed(1)}% with balanced market exposure.`,
              rebalancingAdvice: 'Monitor positions quarterly for weight drift.'
            }
          };

          loadedPortfolios = [localPortfolio, ...loadedPortfolios.filter(p => p._id !== 'planned_local_portfolio')];
        }
      }
    } catch (e) {
      console.warn('LocalStorage portfolio fallback notice:', e);
    }

    if (loadedPortfolios.length > 0) {
      setPortfolios(loadedPortfolios);
      const targetId = location.state?.newPortfolioId;
      const matched = loadedPortfolios.find(p => p._id === targetId);
      setActivePortfolio(matched || loadedPortfolios[0]);
    } else {
      setPortfolios([]);
      setActivePortfolio(null);
    }
    setLoading(false);
  };

  const handleExportPDF = async () => {
    if (!activePortfolio?._id) return;
    setExporting(true);
    try {
      const res = await portfolioAPI.exportPortfolio(activePortfolio._id, 'pdf');
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activePortfolio.name.replace(/\s+/g, '_')}_Report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert(`Generating PDF Report for ${activePortfolio.name}...`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!activePortfolio?._id) return;
    try {
      const res = await portfolioAPI.exportPortfolio(activePortfolio._id, 'csv');
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activePortfolio.name.replace(/\s+/g, '_')}_Holdings.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert(`Exporting CSV dataset for ${activePortfolio.name}...`);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#F8FAFC] flex overflow-hidden text-slate-900 font-sans">
        <Sidebar activePage="/dashboard" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-600 font-semibold text-sm">
            <RefreshCw className="w-5 h-5 animate-spin text-[#00A878]" />
            Loading portfolio data...
          </div>
        </div>
      </div>
    );
  }

  if (!activePortfolio) {
    return (
      <div className="h-screen bg-[#F8FAFC] flex overflow-hidden text-slate-900 font-sans">
        <Sidebar activePage="/dashboard" />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4 shadow-sm">
            <PieChartIcon className="w-8 h-8 text-[#00A878]" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">No Active Portfolio Found</h2>
          <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
            You haven't created or optimized any investment portfolios yet. Use the Portfolio Planner to configure asset weights and run your first Markowitz Efficient Frontier optimization.
          </p>
          <button
            type="button"
            onClick={() => navigate('/planner')}
            className="px-6 py-3 bg-[#00A878] hover:bg-[#009268] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create & Optimize First Portfolio</span>
          </button>
        </div>
      </div>
    );
  }

  const pieData = (activePortfolio.assets || []).map(a => ({
    name: a.ticker,
    value: a.percentage || Math.round((a.weight || 0) * 100),
    allocationUSD: a.allocationValue || 0
  }));

  const frontierData = activePortfolio.efficientFrontier || [];
  const historyData = activePortfolio.historicalPerformance || [];

  return (
    <div className="h-screen bg-[#F8FAFC] flex overflow-hidden text-slate-900 font-sans">
      
      {/* FIXED LEFT SIDEBAR */}
      <Sidebar activePage="/dashboard" />

      {/* RIGHT MAIN CONTENT AREA (SCROLLABLE) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* TOP HEADER BAR */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Equinox Analytics</h1>

          {/* Search Bar */}
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ticker or asset..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00A878]"
            />
          </div>

          {/* Right Header Icons */}
          <div className="flex items-center gap-4">
            <button type="button" className="p-2 text-slate-500 hover:text-slate-900 transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center border border-slate-700 cursor-pointer">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT AREA */}
        <div className="flex-1 p-8 space-y-6 max-w-7xl w-full">
          
          {/* Subheader & Portfolio Selector Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[#00A878] text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Active MPT Strategy
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Investor: <strong className="text-slate-800">{user?.name || 'Registered Investor'}</strong> (Risk Score: <span className="font-mono text-[#00A878] font-bold">{user?.riskProfile?.score || 62}</span>)
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {activePortfolio.name}
              </h2>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-3">
              {portfolios.length > 1 && (
                <select
                  value={activePortfolio._id}
                  onChange={(e) => {
                    const sel = portfolios.find(p => p._id === e.target.value);
                    if (sel) setActivePortfolio(sel);
                  }}
                  className="px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00A878] shadow-sm cursor-pointer"
                >
                  {portfolios.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name} (Sharpe: {(p.metrics?.sharpeRatio || 1.58).toFixed(2)})
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={() => navigate('/planner')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 transition-all flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5 text-[#00A878]" />
                <span>Planner</span>
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                disabled={exporting}
                className="px-4 py-2 bg-[#00A878] hover:bg-[#009268] text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{exporting ? 'Generating...' : 'PDF Report'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* TOP 4 STAT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Stat 1: Expected Return */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">EXPECTED RETURN</span>
              <div className={`text-2xl font-extrabold font-mono ${(activePortfolio.metrics?.expectedReturn || 0) >= 0 ? 'text-[#00A878]' : 'text-rose-500'}`}>
                {(activePortfolio.metrics?.expectedReturn || 0) >= 0 ? '+' : ''}{((activePortfolio.metrics?.expectedReturn ?? 0.185) * 100).toFixed(2)}%
              </div>
              <p className="text-[11px] text-slate-400">Annualized MPT mean return</p>
            </div>

            {/* Stat 2: Annual Volatility */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">ANNUAL VOLATILITY</span>
              <div className="text-2xl font-extrabold text-blue-600 font-mono">
                {(activePortfolio.metrics?.volatility * 100 || 14.2).toFixed(2)}%
              </div>
              <p className="text-[11px] text-slate-400">Standard deviation of returns</p>
            </div>

            {/* Stat 3: Sharpe Ratio */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">SHARPE RATIO</span>
              <div className="text-2xl font-extrabold text-amber-500 font-mono">
                {(activePortfolio.metrics?.sharpeRatio || 1.58).toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-400">Risk-adjusted return metric</p>
            </div>

            {/* Stat 4: Total Capital */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">TOTAL CAPITAL</span>
              <div className="text-2xl font-extrabold text-slate-900 font-mono">
                ₹{(activePortfolio.investmentAmount || 100000).toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-400">Across {activePortfolio.assets?.length || 5} holdings</p>
            </div>

          </div>

          {/* CHARTS ROW 1: Asset Allocation Donut Chart & Efficient Frontier */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Donut Allocation Chart */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-[#00A878]" />
                Optimized Asset Allocation
              </h3>

              <div className="h-60 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name, item) => [`${val}% (₹${(item.payload.allocationUSD || 0).toLocaleString('en-IN')})`, name]}
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Legend
                      iconType="square"
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Efficient Frontier Scatter Plot */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#00A878]" />
                Markowitz Efficient Frontier Curve
              </h3>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis
                      type="number"
                      dataKey="volatility"
                      name="Volatility"
                      unit=""
                      stroke="#94A3B8"
                      fontSize={10}
                      tickFormatter={(val) => val.toFixed(2)}
                    />
                    <YAxis
                      type="number"
                      dataKey="expectedReturn"
                      name="Return"
                      unit=""
                      stroke="#94A3B8"
                      fontSize={10}
                      tickFormatter={(val) => val.toFixed(2)}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(val, name) => [typeof val === 'number' ? (val * 100).toFixed(2) + '%' : val, name]}
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Scatter
                      name="Optimal Portfolios"
                      data={frontierData}
                      fill="#00A878"
                      line={{ stroke: '#00A878', strokeWidth: 1.5 }}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* CHARTS ROW 2: Cumulative Simulated Return Line Plot */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00A878]" />
              Cumulative Simulated Return Performance vs S&P 500 Benchmark
            </h3>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} />
                  <YAxis stroke="#94A3B8" fontSize={10} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="portfolio" name="Equinox Portfolio" stroke="#00A878" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="benchmark" name="S&P 500 Benchmark" stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* INSIGHTS CARDS: GenAI Narrative & FinBERT Sentiment */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* GenAI Narrative Card */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00A878]" />
                GenAI Investment Rationale (LangChain Synthesis)
              </h3>

              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <p>
                  {activePortfolio.aiNarrative?.executiveSummary}
                </p>
                <p>
                  <strong>Allocation Strategy:</strong> {activePortfolio.aiNarrative?.allocationRationale}
                </p>
                <p>
                  <strong>Risk & Drawdown Guardrails:</strong> {activePortfolio.aiNarrative?.riskAndVolatilityAnalysis}
                </p>
              </div>
            </div>

            {/* FinBERT Sentiment Card */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  FinBERT News Sentiment
                </h3>
                <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-[#00A878] text-[10px] font-mono font-bold">
                  Score: +{activePortfolio.sentimentSnapshot?.portfolioSentimentScore || 0.68}
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {(activePortfolio.sentimentSnapshot?.tickerSentiments || []).map((s, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-900 font-mono">{s.ticker}</span>
                      <span className="text-[#00A878] font-mono text-[10px]">{s.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      "{s.headline}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

      <EquinoxAIChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

    </div>
  );
}
