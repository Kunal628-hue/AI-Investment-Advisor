import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { portfolioAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import { 
  FileText, Plus, Download, Bell, RefreshCw, Sparkles, Filter, CheckCircle2
} from 'lucide-react';

export default function ReportsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [portfolios, setPortfolios] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    let loadedPortfolios = [];

    // 1. Try fetching from MongoDB
    try {
      const res = await portfolioAPI.getPortfolios();
      if (res.data?.success && Array.isArray(res.data.portfolios)) {
        loadedPortfolios = res.data.portfolios;
      }
    } catch (err) {
      console.warn('Notice loading portfolios:', err.message);
    }

    // 2. Fallback to active portfolio in localStorage
    const storageKeyAssets = `portfolio_assets_${user?.id || user?._id || 'guest'}`;
    const storageKeyTotal  = `portfolio_total_${user?.id  || user?._id || 'guest'}`;
    const storageKeyOpt    = `portfolio_opt_${user?.id    || user?._id || 'guest'}`;

    try {
      const savedAssetsStr = localStorage.getItem(storageKeyAssets);
      if (savedAssetsStr) {
        const savedAssets = JSON.parse(savedAssetsStr);
        if (Array.isArray(savedAssets) && savedAssets.length > 0) {
          const totalVal = Number(localStorage.getItem(storageKeyTotal)) || 100000;
          let optData = null;
          try {
            const savedOpt = localStorage.getItem(storageKeyOpt);
            if (savedOpt) optData = JSON.parse(savedOpt);
          } catch {}

          const summary = optData?.summary || optData;
          const realExpectedReturn = summary?.expectedReturn ?? summary?.expected_return ?? -0.173;
          const realVolatility = summary?.volatility ?? 0.247;
          const realSharpe = summary?.sharpeRatio ?? summary?.sharpe_ratio ?? -0.86;

          const localPortfolio = {
            _id: 'planned_local_portfolio',
            name: `${user?.name || 'Active'} Strategy Recommendation`,
            investmentAmount: totalVal,
            objective: 'max_sharpe',
            assets: savedAssets,
            metrics: {
              expectedReturn: realExpectedReturn,
              volatility: realVolatility,
              sharpeRatio: Number(realSharpe.toFixed(2))
            },
            aiNarrative: optData?.narrative || {
              executiveSummary: `Based on your risk profile, this portfolio optimizes ₹${totalVal.toLocaleString('en-IN')} across ${savedAssets.length} active holdings including ${savedAssets.map(a => a.ticker).slice(0, 3).join(', ')}.`,
              allocationRationale: 'Top asset allocations selected using Markowitz Mean-Variance Optimization on the Efficient Frontier.'
            }
          };

          loadedPortfolios = [localPortfolio, ...loadedPortfolios.filter(p => p._id !== 'planned_local_portfolio')];
        }
      }
    } catch (e) {
      console.warn('LocalStorage portfolio fallback notice:', e);
    }

    setPortfolios(loadedPortfolios);
    setLoading(false);
  };

  const handleGenerateReport = async (format = 'pdf') => {
    setExporting(true);
    try {
      const targetPortfolio = portfolios[0] || {
        name: 'Equinox Portfolio Strategy',
        investmentAmount: 100000,
        assets: [
          { ticker: 'IRFC.NS', company: 'Indian Railway Finance', amountInvested: 20000, returnPct: 14.5 },
          { ticker: 'IRIS.NS', company: 'Iris Business Services', amountInvested: 20000, returnPct: 12.0 },
          { ticker: 'PCBL.NS', company: 'PCBL Limited', amountInvested: 20000, returnPct: 15.2 },
          { ticker: 'NHPC.NS', company: 'NHPC Limited', amountInvested: 20000, returnPct: 11.8 },
          { ticker: 'SJVN.NS', company: 'SJVN Limited', amountInvested: 20000, returnPct: 13.4 }
        ],
        metrics: { expectedReturn: -0.173, volatility: 0.247, sharpeRatio: -0.86 }
      };

      let blob;
      let filename = `${(targetPortfolio.name || 'Equinox_Portfolio').replace(/\s+/g, '_')}_Report`;

      try {
        if (targetPortfolio._id && targetPortfolio._id !== 'planned_local_portfolio') {
          const res = await portfolioAPI.exportReport(targetPortfolio._id, format);
          blob = new Blob([res.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
        } else {
          const res = await portfolioAPI.exportGuestReport(targetPortfolio, format);
          blob = new Blob([res.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
        }
      } catch (apiErr) {
        console.warn('API export notice, generating client-side fallback:', apiErr.message);
        blob = generateDynamicFallbackBlob(format, targetPortfolio);
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filename}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      const newReportEntry = {
        id: `rep-${Date.now()}`,
        name: `${targetPortfolio?.name || 'Equinox Portfolio'} ${format.toUpperCase()} Report`,
        type: format.toUpperCase(),
        date: new Date().toISOString().split('T')[0],
        portfolio: targetPortfolio?.name || 'Primary Portfolio'
      };
      setReports([newReportEntry, ...reports]);
    } catch (err) {
      console.warn('Report generation error:', err.message);
    } finally {
      setExporting(false);
    }
  };

  const generateDynamicFallbackBlob = (format, portfolioObj) => {
    const assets = portfolioObj?.assets || [];
    const totalVal = portfolioObj?.investmentAmount || 100000;

    if (format === 'csv') {
      let csv = "Ticker,Company / Asset Name,Amount Invested (₹),Weight %,Expected Return %,Sector\n";
      assets.forEach(a => {
        const ticker = a.ticker || 'UNKNOWN';
        const company = `"${(a.company || a.assetName || a.name || ticker).replace(/"/g, '""')}"`;
        const amount = Number(a.amountInvested) || Math.round(totalVal * (a.weight || (1 / (assets.length || 1))));
        const weightPct = totalVal > 0 ? ((amount / totalVal) * 100).toFixed(1) : '20.0';
        const expRet = (a.returnPct ?? (portfolioObj?.metrics?.expectedReturn ? portfolioObj.metrics.expectedReturn * 100 : 12.0)).toFixed(1);
        const sector = `"${(a.sector || 'Equity').replace(/"/g, '""')}"`;

        csv += `${ticker},${company},${amount},${weightPct}%,${expRet}%,${sector}\n`;
      });
      return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    } else {
      // Dynamic HTML PDF Blob print window
      const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${portfolioObj?.name || 'Equinox Portfolio Report'}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0F172A; }
            h1 { color: #00A878; margin-bottom: 5px; }
            .subtitle { color: #64748B; font-size: 14px; margin-bottom: 30px; border-bottom: 2px solid #E2E8F0; padding-bottom: 15px; }
            .metrics-box { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 20px; border-radius: 8px; margin-bottom: 30px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
            .metric-item label { font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: bold; }
            .metric-item div { font-size: 18px; font-weight: bold; font-family: monospace; color: #0F172A; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #F1F5F9; color: #475569; text-align: left; padding: 10px; font-size: 12px; font-weight: bold; border-bottom: 2px solid #CBD5E1; }
            td { padding: 10px; border-bottom: 1px solid #E2E8F0; font-size: 13px; }
            .footer { margin-top: 50px; text-align: center; color: #94A3B8; font-size: 11px; }
          </style>
        </head>
        <body>
          <h1>EQUINOX FINTECH</h1>
          <div class="subtitle">Personalized Executive Portfolio Report | Date: ${new Date().toLocaleDateString('en-IN')}</div>
          
          <div class="metrics-box">
            <div class="metric-item"><label>Total Capital</label><div>₹${totalVal.toLocaleString('en-IN')}</div></div>
            <div class="metric-item"><label>Expected Return</label><div>${((portfolioObj?.metrics?.expectedReturn || 0) * 100).toFixed(1)}%</div></div>
            <div class="metric-item"><label>Annual Volatility</label><div>${((portfolioObj?.metrics?.volatility || 0.247) * 100).toFixed(1)}%</div></div>
            <div class="metric-item"><label>Sharpe Ratio</label><div>${(portfolioObj?.metrics?.sharpeRatio || -0.86).toFixed(2)}</div></div>
          </div>

          <h2>Optimized Asset Allocation</h2>
          <table>
            <thead>
              <tr><th>Ticker</th><th>Asset Name</th><th>Amount (₹)</th><th>Weight %</th></tr>
            </thead>
            <tbody>
              ${assets.map(a => `
                <tr>
                  <td><strong>${a.ticker}</strong></td>
                  <td>${a.company || a.assetName || a.ticker}</td>
                  <td>₹${(Number(a.amountInvested) || Math.round(totalVal / assets.length)).toLocaleString('en-IN')}</td>
                  <td>${((Number(a.amountInvested || (totalVal / assets.length)) / totalVal) * 100).toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">Produced for educational & decision support purposes only.</div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
        </html>
      `;
      return new Blob([printHtml], { type: 'text/html;charset=utf-8;' });
    }
  };

  return (
    <div className="h-screen bg-[#F8FAFC] flex overflow-hidden text-slate-900 font-sans">
      
      {/* FIXED LEFT SIDEBAR */}
      <Sidebar activePage="/reports" />

      {/* RIGHT MAIN CONTENT AREA (SCROLLABLE) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* TOP HEADER BAR */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Portfolio Reports</h1>
            <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#00A878] text-xs font-mono font-bold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              PDF & CSV AUDIT LOGS
            </span>
          </div>

          {/* Right Header Icons */}
          <div className="flex items-center gap-4">
            <button type="button" className="p-2 text-slate-500 hover:text-slate-900 transition-colors relative">
              <Bell className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleGenerateReport('pdf')}
              disabled={exporting}
              className="px-4 py-2 bg-[#00A878] hover:bg-[#009268] text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{exporting ? 'Generating...' : 'Generate PDF Report'}</span>
            </button>

            <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center border border-slate-700 cursor-pointer">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT GRID */}
        <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto">
          
          {/* CENTER TABLE */}
          <div className="lg:col-span-8 space-y-4">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Report Export History</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-mono font-bold border border-slate-200">
                  {reports.length} Reports
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-mono font-semibold uppercase">
                    <th className="py-3 px-4">Report Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Portfolio</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-12 px-4 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <FileText className="w-8 h-8 text-slate-300 stroke-1" />
                          <p className="font-semibold text-slate-600 text-xs">No generated reports found.</p>
                          <p className="text-[11px] text-slate-400 max-w-xs">
                            Click "Generate PDF Report" or export CSV datasets from your active portfolio.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    reports.map((rep) => (
                      <tr key={rep.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{rep.name}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#00A878] font-mono text-[10px] font-bold">
                            {rep.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">{rep.date}</td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">{rep.portfolio}</td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleGenerateReport(rep.type.toLowerCase())}
                            className="p-1.5 text-[#00A878] hover:bg-emerald-50 rounded transition-colors"
                            title="Download Report"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* RIGHT SIDEBAR PANEL */}
          <div className="lg:col-span-4 space-y-6">
            
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00A878]" />
                Automated Export Engine
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generate instant executive PDF reports complete with asset weights, Sharpe ratios, Value at Risk (VaR) guardrails, and LangChain narrative synthesis.
              </p>
              
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => handleGenerateReport('pdf')}
                  disabled={exporting}
                  className="w-full py-2.5 bg-[#00A878] hover:bg-[#009268] text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download Executive PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerateReport('csv')}
                  disabled={exporting}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-[#00A878]" />
                  <span>Download Holdings CSV</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
