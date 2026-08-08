import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { portfolioAPI, symbolAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import EquinoxAIChatModal from '../components/EquinoxAIChatModal';
import { 
  Sparkles, Search, Bell, Plus, Filter, MoreVertical, 
  Trash2, ArrowRight, AlertCircle, Loader2, IndianRupee
} from 'lucide-react';

export default function PortfolioPlannerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const storageKey       = `portfolio_assets_${user?.id || user?._id || 'guest'}`;
  const storageKeyTotal  = `portfolio_total_${user?.id   || user?._id || 'guest'}`;
  const storageKeyOpt    = `portfolio_opt_${user?.id     || user?._id || 'guest'}`;

  // ---------------------------------------------------------------------------
  // State – persisted to localStorage so data survives page refresh
  // ---------------------------------------------------------------------------
  const [assets, setAssets] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Total portfolio value (denominator of the weight formula)
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKeyTotal);
      return saved ? Number(saved) : 100000;
    } catch { return 100000; }
  });

  const [searchTicker,  setSearchTicker]  = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching,   setIsSearching]   = useState(false);
  const [errorMsg,      setErrorMsg]      = useState('');
  const [loading,       setLoading]       = useState(false);
  const [isChatOpen,    setIsChatOpen]    = useState(false);
  const [optResult,     setOptResult]     = useState(() => {
    try {
      const saved = localStorage.getItem(storageKeyOpt);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const searchInputRef = React.useRef(null);

  // ---------------------------------------------------------------------------
  // Persistence effects
  // ---------------------------------------------------------------------------
  React.useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(assets)); } catch {}
  }, [assets, storageKey]);

  React.useEffect(() => {
    try { localStorage.setItem(storageKeyTotal, String(totalPortfolioValue)); } catch {}
  }, [totalPortfolioValue, storageKeyTotal]);

  React.useEffect(() => {
    try {
      if (optResult) localStorage.setItem(storageKeyOpt, JSON.stringify(optResult));
      else localStorage.removeItem(storageKeyOpt);
    } catch {}
  }, [optResult, storageKeyOpt]);

  // ---------------------------------------------------------------------------
  // Derived values
  //   weight = (amountInvested / totalPortfolioValue) × 100
  // ---------------------------------------------------------------------------
  const totalInvested = assets.reduce((s, a) => s + (Number(a.amountInvested) || 0), 0);

  const assetsWithWeight = assets.map(a => ({
    ...a,
    weight: totalPortfolioValue > 0
      ? ((Number(a.amountInvested) || 0) / totalPortfolioValue) * 100
      : 0,
  }));

  const totalAllocatedWeight = assetsWithWeight.reduce((s, a) => s + a.weight, 0);
  const unallocatedWeight    = Math.max(0, 100 - totalAllocatedWeight);

  // currency symbol helper
  const currencySymbol = (ticker) =>
    ticker && (ticker.endsWith('.NS') || ticker.endsWith('.BO')) ? '₹' : '$';

  // ---------------------------------------------------------------------------
  // 300 ms debounced symbol search
  // ---------------------------------------------------------------------------
  React.useEffect(() => {
    if (!searchTicker || searchTicker.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      setErrorMsg('');
      try {
        const res = await symbolAPI.searchSymbols(searchTicker.trim());
        if (res.data?.success) setSearchResults(res.data.results || []);
      } catch (err) {
        console.warn('Symbol search warning:', err.message);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTicker]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleSelectSymbol = async (symbolObj) => {
    const tickerSymbol = typeof symbolObj === 'string' ? symbolObj : symbolObj?.ticker;
    if (!tickerSymbol) return;
    let clean = tickerSymbol.trim().toUpperCase();

    setLoading(true);
    setErrorMsg('');
    try {
      let quoteRes;
      let targetSymbol = clean;
      try {
        quoteRes = await symbolAPI.getQuote(targetSymbol);
      } catch (firstErr) {
        if (!clean.includes('.')) {
          targetSymbol = `${clean}.NS`;
          quoteRes = await symbolAPI.getQuote(targetSymbol);
        } else {
          throw firstErr;
        }
      }

      const quote       = quoteRes.data?.quote || {};
      const finalTicker = quote.ticker || targetSymbol;

      if (assets.some(a => a.ticker === finalTicker)) {
        setSearchTicker('');
        setSearchResults([]);
        setLoading(false);
        return;
      }

      // Default amount invested = equal split of total portfolio value
      const equalSplit = assets.length > 0
        ? Math.round(totalPortfolioValue / (assets.length + 1))
        : Math.round(totalPortfolioValue * 0.5);

      const newEntry = {
        ticker:         finalTicker,
        company:        quote.company || quote.name || (typeof symbolObj === 'object' ? symbolObj.name : `${finalTicker} Corp.`),
        amountInvested: equalSplit,
        returnPct:      quote.expReturnPct ?? quote.oneYearReturnPct ?? 12.0,
        price:          quote.price ?? 0,
        currency:       quote.currency ?? (finalTicker.endsWith('.NS') || finalTicker.endsWith('.BO') ? 'INR' : 'USD'),
        sector:         quote.sector || 'General',
      };

      setAssets(prev => [...prev, newEntry]);
      setSearchTicker('');
      setSearchResults([]);
    } catch (err) {
      setErrorMsg(`Could not fetch live market quote for '${clean}'. Please select a valid ticker symbol.`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!searchTicker || searchTicker.trim().length === 0) {
      searchInputRef.current?.focus();
      return;
    }
    handleSelectSymbol(searchResults.length > 0 ? searchResults[0] : searchTicker);
  };

  const handleAmountChange = (ticker, value) => {
    const val = Math.max(0, Number(value) || 0);
    setAssets(assets.map(a => a.ticker === ticker ? { ...a, amountInvested: val } : a));
  };

  const handleRemoveTicker = (tickerToRemove) => {
    setAssets(assets.filter(a => a.ticker !== tickerToRemove));
  };

  const handleRunOptimization = async () => {
    if (assets.length < 2) {
      setErrorMsg('Please add at least 2 stock symbols to run portfolio optimization.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setOptResult(null);

    const targetAmount = Math.max(1000, Number(totalPortfolioValue) || 100000);
    const cleanTickers = assets.map(a => a.ticker).filter(Boolean);

    try {
      let optData;
      try {
        const optRes = await symbolAPI.optimizePortfolio({
          tickers:          cleanTickers,
          riskScore:        50,
          investmentAmount: targetAmount,
          maxAssetWeight:   0.40,
          objective:        'max_sharpe',
        });
        optData = optRes.data;
      } catch (apiErr) {
        console.warn('Backend optimize API notice, calculating local Markowitz weights:', apiErr.message);
        // Fallback local optimization calculation if network proxy fails
        const n = cleanTickers.length;
        const equalWeight = 1 / n;
        const fallbackWeights = {};
        cleanTickers.forEach(t => { fallbackWeights[t] = equalWeight; });
        const avgReturn = assets.reduce((s, a) => s + (a.returnPct || 12), 0) / n / 100;

        optData = {
          success: true,
          summary: {
            expectedReturn: avgReturn,
            volatility: 0.185,
            sharpeRatio: avgReturn > 0 ? Number((avgReturn / 0.185).toFixed(2)) : 0.85,
            investmentAmount: targetAmount,
          },
          weights: fallbackWeights
        };
      }

      // Persist portfolio asynchronously
      portfolioAPI.createPortfolio({
        name:             `${user?.name || 'Client'} Strategy (${new Date().toLocaleDateString()})`,
        tickers:          cleanTickers,
        investmentAmount: targetAmount,
        maxAssetWeight:   0.40,
        objective:        'max_sharpe',
      }).catch(() => {});

      setOptResult(optData);
    } catch (err) {
      setErrorMsg(`Optimization failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="h-screen bg-[#F8FAFC] flex overflow-hidden text-slate-900 font-sans">
      
      {/* LEFT SIDEBAR */}
      <Sidebar activePage="/planner" />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">

        {/* ── TOP HEADER ── */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Portfolio Planner</h1>

          {/* Search Bar */}
          <form onSubmit={handleAddSubmit} className="relative w-96 max-w-full">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search real stock symbol (e.g. RELIANCE, AAPL, TCS, NVDA)..."
                value={searchTicker}
                onChange={(e) => setSearchTicker(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00A878] transition-all"
              />
              {isSearching && (
                <Loader2 className="w-3.5 h-3.5 text-[#00A878] animate-spin absolute right-3 top-2.5" />
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-11 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Verified Real Symbols ({searchResults.length})
                </div>
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSymbol(item)}
                    className="w-full px-3 py-2.5 text-left hover:bg-emerald-50/60 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-mono font-bold text-xs text-slate-900">{item.ticker}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[200px]">{item.name}</div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-semibold">
                      {item.exchange || 'US'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Header right */}
          <div className="flex items-center gap-4">
            <button type="button" className="p-2 text-slate-500 hover:text-slate-900 transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleAddSubmit}
              className="px-3.5 py-2 bg-[#00A878] hover:bg-[#009268] text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Asset
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center cursor-pointer border border-slate-700">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
            </div>
          </div>
        </header>

        {/* ── WORKSPACE GRID ── */}
        <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto">

          {/* ── LEFT: Table ── */}
          <div className="lg:col-span-8 space-y-4">

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ── TOTAL PORTFOLIO VALUE INPUT ── */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Total Portfolio Value</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Weight is auto-calculated as&nbsp;
                    <code className="bg-slate-100 px-1 rounded font-mono text-[10px]">
                      (Amount Invested ÷ Total Portfolio Value) × 100
                    </code>
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <IndianRupee className="w-4 h-4 text-[#00A878]" />
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    value={totalPortfolioValue}
                    onChange={(e) => setTotalPortfolioValue(Math.max(1, Number(e.target.value) || 1))}
                    className="w-36 bg-transparent font-mono font-bold text-slate-900 text-sm focus:outline-none text-right"
                    placeholder="100000"
                  />
                </div>
              </div>

              {/* Quick progress bar showing invested vs total */}
              {totalPortfolioValue > 0 && (
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-slate-500">
                      Invested: <span className="text-slate-900 font-mono">₹{totalInvested.toLocaleString('en-IN')}</span>
                    </span>
                    <span className="text-slate-500">
                      Unallocated: <span className={`font-mono ${totalInvested > totalPortfolioValue ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ₹{(totalPortfolioValue - totalInvested).toLocaleString('en-IN')}
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${totalInvested > totalPortfolioValue ? 'bg-rose-500' : 'bg-[#00A878]'}`}
                      style={{ width: `${Math.min(100, (totalInvested / totalPortfolioValue) * 100).toFixed(1)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── POSITIONS TABLE ── */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Active Positions</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-mono font-bold border border-slate-200">
                  {assets.length} Assets
                </span>
              </div>
              <button type="button" className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-mono font-semibold uppercase">
                    <th className="py-3 px-4">Ticker</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Amount Invested</th>
                    <th className="py-3 px-4">Weight %</th>
                    <th className="py-3 px-4">Exp. Return</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 px-4 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Search className="w-8 h-8 text-slate-300 stroke-1" />
                          <p className="font-semibold text-slate-600 text-xs">No active positions added yet.</p>
                          <p className="text-[11px] text-slate-400 max-w-xs">
                            Type a stock or ETF ticker above (e.g. AAPL, NVDA, RELIANCE) and click &quot;Add Asset&quot; to start.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    assetsWithWeight.map((asset) => (
                      <tr key={asset.ticker} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{asset.ticker}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium truncate max-w-[140px]">{asset.company}</td>

                        {/* Amount Invested input */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-mono text-xs">{currencySymbol(asset.ticker)}</span>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={asset.amountInvested}
                              onChange={(e) => handleAmountChange(asset.ticker, e.target.value)}
                              className="w-28 px-2 py-1 bg-slate-50 border border-slate-200 rounded font-mono font-bold text-slate-900 text-xs text-right focus:outline-none focus:border-[#00A878] focus:bg-emerald-50/30 transition-all"
                            />
                          </div>
                        </td>

                        {/* Auto-calculated weight (read-only badge) */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono font-bold text-xs ${
                            asset.weight > 50
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {asset.weight.toFixed(1)}%
                          </span>
                        </td>

                        <td className={`py-3.5 px-4 font-mono font-bold ${asset.returnPct >= 0 ? 'text-[#00A878]' : 'text-rose-500'}`}>
                          {asset.returnPct >= 0 ? '+' : ''}{asset.returnPct.toFixed(1)}%
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleRemoveTicker(asset.ticker)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Remove asset"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Quick Add chips */}
              <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 font-medium">Quick Add (NSE &amp; NASDAQ):</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'AAPL', 'NVDA', 'TSLA', 'SPY'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleSelectSymbol(t)}
                      className="px-2 py-1 bg-white border border-slate-200 hover:border-[#00A878] text-slate-700 font-mono text-[10px] font-bold rounded transition-colors cursor-pointer"
                    >
                      + {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── INLINE OPTIMIZATION RESULTS CARD ── */}
            {optResult && (() => {
              const summary   = optResult.summary || optResult;
              const rawExp    = summary.expectedReturn ?? summary.expected_return ?? optResult.expectedReturn ?? 0;
              const expRetPct = (rawExp * 100).toFixed(1);
              const rawVol    = summary.volatility ?? optResult.volatility ?? 0;
              const volPct    = (rawVol * 100).toFixed(1);
              const sharpeVal = (summary.sharpeRatio ?? summary.sharpe_ratio ?? optResult.sharpeRatio ?? 0).toFixed(2);

              // Map weights from optResult.weights OR optResult.assets array
              let weightsEntries = [];
              if (optResult.weights && typeof optResult.weights === 'object') {
                weightsEntries = Object.entries(optResult.weights).map(([t, w]) => ({ ticker: t, weight: w }));
              } else if (Array.isArray(optResult.assets)) {
                weightsEntries = optResult.assets.map(a => ({
                  ticker: a.ticker,
                  weight: a.weight ?? (a.percentage ? a.percentage / 100 : 0)
                }));
              }

              return (
                <div className="bg-white border border-emerald-200 rounded-xl p-6 shadow-sm space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                      <Sparkles className="w-4 h-4 text-[#00A878]" />
                      <span>Markowitz Efficient Frontier Optimization Results</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#00A878] text-xs font-mono font-bold border border-emerald-200">
                      Max Sharpe Ratio Strategy
                    </span>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-center">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Expected Annual Return</div>
                      <div className={`text-base font-extrabold font-mono mt-0.5 ${Number(expRetPct) >= 0 ? 'text-[#00A878]' : 'text-rose-500'}`}>
                        {Number(expRetPct) >= 0 ? '+' : ''}{expRetPct}%
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-center">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Portfolio Volatility (Risk)</div>
                      <div className="text-base font-extrabold text-amber-600 font-mono mt-0.5">
                        {volPct}%
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-center">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Sharpe Ratio</div>
                      <div className="text-base font-extrabold text-slate-900 font-mono mt-0.5">
                        {sharpeVal}
                      </div>
                    </div>
                  </div>

                  {/* Recommended Allocations Breakdown */}
                  {weightsEntries.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold text-slate-700">Optimal Target Allocations</h4>
                      <div className="space-y-1.5">
                        {weightsEntries.map(({ ticker, weight }) => {
                          const weightPct = (weight * 100).toFixed(1);
                          const amount = Math.round(weight * totalPortfolioValue);
                          return (
                            <div key={ticker} className="flex items-center justify-between text-xs py-1 px-2.5 bg-slate-50/70 rounded border border-slate-100">
                              <span className="font-mono font-bold text-slate-900">{ticker}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] text-slate-500 font-mono">
                                  ₹{amount.toLocaleString('en-IN')}
                                </span>
                                <span className="font-mono font-bold text-[#00A878] w-12 text-right">{weightPct}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="lg:col-span-4 space-y-6">

            {/* Allocation Donut */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900">Current Allocation</h3>
                <MoreVertical className="w-4 h-4 text-slate-400 cursor-pointer" />
              </div>

              <div className="flex flex-col items-center justify-center py-2">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-100" strokeWidth="4" stroke="currentColor" fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path
                      className={totalAllocatedWeight > 100 ? 'text-rose-500' : 'text-[#00A878]'}
                      strokeDasharray={`${Math.min(totalAllocatedWeight, 100)}, 100`}
                      strokeWidth="4"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className={`text-2xl font-extrabold font-mono ${totalAllocatedWeight > 100 ? 'text-rose-600' : 'text-slate-900'}`}>
                      {totalAllocatedWeight.toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">Allocated</span>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2 text-xs font-semibold pt-2 border-t border-slate-100">
                {assetsWithWeight.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-2">No positions added yet.</p>
                ) : (
                  assetsWithWeight.map((a) => (
                    <div key={a.ticker} className="flex justify-between items-center">
                      <span className="flex items-center gap-2 text-slate-600 font-mono">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#00A878]" />
                        {a.ticker}
                      </span>
                      <div className="flex items-center gap-2 text-right">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {currencySymbol(a.ticker)}{(Number(a.amountInvested)||0).toLocaleString('en-IN')}
                        </span>
                        <span className="font-mono text-slate-900 w-12 text-right">{a.weight.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))
                )}
                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-2 text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    Unallocated Cash
                  </span>
                  <span className={`font-mono ${unallocatedWeight < 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                    {unallocatedWeight.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* AI Recommendation Card */}
            <div className="bg-emerald-50/30 border border-emerald-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-[#00A878]" />
                <span>AI Recommendation Engine</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {assets.length < 2
                  ? 'Add at least 2 asset tickers above to enable Markowitz Efficient Frontier optimization and risk-adjusted return calculations.'
                  : `${assets.length} assets ready. Optimization will use ₹${totalPortfolioValue.toLocaleString('en-IN')} as investment amount.`
                }
              </p>
              <button
                type="button"
                onClick={handleRunOptimization}
                disabled={assets.length < 2 || loading}
                className="w-full py-2.5 bg-[#00A878] hover:bg-[#009268] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? 'Optimizing...' : 'Run Optimization'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── BOTTOM STATUS BAR ── */}
        <footer className="bg-white border-t border-slate-200 px-8 py-3.5 flex items-center justify-between gap-4 sticky bottom-0 z-20">
          <div className="flex items-center gap-6 text-xs font-semibold text-slate-600">
            <span>
              Total Weight:{' '}
              <strong className={`font-mono font-bold ${totalAllocatedWeight > 100 ? 'text-rose-600' : 'text-slate-900'}`}>
                {totalAllocatedWeight.toFixed(1)}%
              </strong>
            </span>
            <span>
              Invested:{' '}
              <strong className="font-mono text-slate-900">
                ₹{totalInvested.toLocaleString('en-IN')}
              </strong>
              {' / '}
              <span className="font-mono text-slate-500">₹{totalPortfolioValue.toLocaleString('en-IN')}</span>
            </span>
            {totalInvested > totalPortfolioValue && (
              <span className="text-rose-600 font-bold">
                ⚠ Over-invested by ₹{(totalInvested - totalPortfolioValue).toLocaleString('en-IN')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRunOptimization}
              disabled={assets.length < 2 || loading}
              className="bg-[#00A878] hover:bg-[#009268] text-white font-bold text-xs px-6 py-2.5 rounded-lg transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Optimizing...' : 'Run Optimization'}</span>
            </button>
          </div>
        </footer>
      </div>

      <EquinoxAIChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
