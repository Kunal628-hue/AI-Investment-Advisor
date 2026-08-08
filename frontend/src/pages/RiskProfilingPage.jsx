import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import EquinoxLogo from '../components/EquinoxLogo';
import Sidebar from '../components/Sidebar';
import { 
  PieChart, TrendingUp, Sparkles, FileText, ShieldAlert, Settings, 
  HelpCircle, Search, Bell, Moon, RefreshCw, ArrowRight, CheckCircle2, ChevronRight, Sliders
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const QUESTIONS = [
  {
    step: 1,
    title: "What is your primary investment time horizon?",
    options: [
      { id: '1-3y', score: 10, title: 'Conservative', desc: '1 to 3 Years — I need liquidity and capital security within a short timeframe.' },
      { id: '3-5y', score: 20, title: 'Moderate', desc: '3 to 5 Years — I am saving for a medium-term financial milestone.' },
      { id: '5-10y', score: 30, title: 'Aggressive', desc: '5 to 10 Years — I am looking to build wealth over a solid growth horizon.' },
      { id: '10y+', score: 40, title: 'Very Aggressive', desc: '10+ Years — I have a multi-decade horizon for maximum capital compounding.' }
    ]
  },
  {
    step: 2,
    title: "What is your main financial objective for this portfolio?",
    options: [
      { id: 'preservation', score: 10, title: 'Conservative', desc: 'Capital Preservation — Protecting my principal capital against market drawdowns is top priority.' },
      { id: 'income', score: 20, title: 'Moderate', desc: 'Income & Dividends — Generating steady cash flow and dividends with low risk.' },
      { id: 'balanced', score: 30, title: 'Aggressive', desc: 'Balanced Growth — Achieving steady growth while managing market volatility.' },
      { id: 'max_growth', score: 40, title: 'Very Aggressive', desc: 'Maximum Growth — Aggressive compounding for highest long-term returns.' }
    ]
  },
  {
    step: 3,
    title: "How would you react to a 20% portfolio drop in a month?",
    options: [
      { id: 'sell_all', score: 10, title: 'Conservative', desc: 'I would sell all my investments to prevent further loss.' },
      { id: 'sell_some', score: 20, title: 'Moderate', desc: 'I would sell a portion of my investments.' },
      { id: 'hold', score: 30, title: 'Aggressive', desc: 'I would do nothing and wait for recovery.' },
      { id: 'buy_more', score: 40, title: 'Very Aggressive', desc: 'I would buy more at a lower price.' }
    ]
  },
  {
    step: 4,
    title: "Which risk vs return trade-off best matches your preference?",
    options: [
      { id: 'low_risk', score: 10, title: 'Conservative', desc: 'Low Risk, Low Return — Target 3-5% annual return with minimal fluctuations.' },
      { id: 'mod_risk', score: 20, title: 'Moderate', desc: 'Moderate Risk — Target 6-9% annual return with moderate ups and downs.' },
      { id: 'high_risk', score: 30, title: 'Aggressive', desc: 'High Risk, High Return — Target 10-15% annual return accepting market volatility.' },
      { id: 'max_risk', score: 40, title: 'Very Aggressive', desc: 'Maximum Growth — Target 15%+ return accepting sharp temporary drawdowns.' }
    ]
  },
  {
    step: 5,
    title: "What is your level of financial market investment experience?",
    options: [
      { id: 'beginner', score: 10, title: 'Conservative', desc: 'Beginner — New to investing and prefer automated low-risk strategies.' },
      { id: 'intermediate', score: 20, title: 'Moderate', desc: 'Intermediate — Familiar with stocks, ETFs, and basic asset allocation.' },
      { id: 'advanced', score: 30, title: 'Aggressive', desc: 'Advanced — Experienced with market cycles, diversification, and rebalancing.' },
      { id: 'expert', score: 40, title: 'Very Aggressive', desc: 'Expert / Institutional — Experienced with quants, hedging, and portfolio theory.' }
    ]
  }
];

const DRIFT_DATA = [
  { month: 'May', score: 50 },
  { month: 'Jun', score: 52 },
  { month: 'Jul', score: 48 },
  { month: 'Aug', score: 58 },
  { month: 'Sep', score: 62 },
  { month: 'Oct', score: 60 }
];

export default function RiskProfilingPage() {
  const { user, updateUserRiskProfile } = useAuth();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'questionnaire'
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState({
    1: '5-10y',
    2: 'balanced',
    3: 'hold',
    4: 'high_risk',
    5: 'advanced'
  });

  const [submitting, setSubmitting] = useState(false);

  const currentQuestion = QUESTIONS[currentStepIndex];
  const selectedOptionId = answers[currentQuestion.step];

  const handleSelectOption = (optionId) => {
    setAnswers({ ...answers, [currentQuestion.step]: optionId });
  };

  const handleNext = () => {
    if (currentStepIndex < QUESTIONS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      finishQuestionnaire();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const finishQuestionnaire = async () => {
    setSubmitting(true);
    let totalPoints = 0;
    QUESTIONS.forEach(q => {
      const selectedId = answers[q.step];
      const opt = q.options.find(o => o.id === selectedId);
      if (opt) totalPoints += opt.score;
    });

    const calculatedScore = Math.min(100, Math.max(0, Math.round(((totalPoints - 50) / 150) * 100)));

    let category = 'Balanced Moderate';
    if (calculatedScore < 35) category = 'Conservative';
    else if (calculatedScore < 65) category = 'Balanced Moderate';
    else category = 'Balanced Aggressive';

    try {
      const res = await userAPI.updateRiskProfile({
        score: calculatedScore,
        category,
        answers
      });
      if (res.data?.success) {
        updateUserRiskProfile(res.data.riskProfile);
      }
    } catch (err) {
      updateUserRiskProfile({ score: calculatedScore, category });
    } finally {
      setSubmitting(false);
      setViewMode('overview');
    }
  };

  const riskScore = user?.riskProfile?.score || 62;
  const progressPercent = ((currentStepIndex + 1) / QUESTIONS.length) * 100;

  // QUESTIONNAIRE FLOW RENDER
  if (viewMode === 'questionnaire') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between text-slate-900 font-sans">
        
        {/* Top Progress Bar */}
        <div className="w-full bg-slate-200 h-1">
          <div 
            className="bg-[#00A878] h-1 transition-all duration-500 ease-out" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Main Questionnaire Box */}
        <div className="max-w-4xl mx-auto px-4 py-16 w-full my-auto text-center">
          
          <div className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase mb-3">
            STEP {currentQuestion.step} OF {QUESTIONS.length}
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 max-w-2xl mx-auto text-center mb-10 tracking-tight leading-tight">
            {currentQuestion.title}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto mb-12">
            {currentQuestion.options.map(option => {
              const isSelected = selectedOptionId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelectOption(option.id)}
                  className={`p-6 rounded-lg text-left transition-all border ${
                    isSelected
                      ? 'bg-white border-[#00A878] ring-1 ring-[#00A878] shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-none'
                  }`}
                >
                  <div className="font-bold text-slate-900 text-base mb-1.5">
                    {option.title}
                  </div>
                  <div className="text-xs text-slate-500 leading-relaxed">
                    {option.desc}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-200 w-full max-w-3xl mx-auto pt-6 flex justify-between items-center">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStepIndex === 0}
              className="text-xs font-mono font-bold text-slate-400 hover:text-slate-900 tracking-wider transition-colors disabled:opacity-30"
            >
              BACK
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={submitting}
              className="bg-[#00A878] hover:bg-[#009268] text-white font-mono font-bold text-xs uppercase px-7 py-2.5 rounded transition-all shadow-sm tracking-wider flex items-center gap-1"
            >
              {submitting ? 'SAVING...' : currentStepIndex === QUESTIONS.length - 1 ? 'COMPLETE' : 'NEXT'}
            </button>
          </div>

        </div>
        <div className="py-4"></div>
      </div>
    );
  }

  // OVERVIEW RENDER (Matching Reference Screenshot 1:1)
  return (
    <div className="h-screen bg-[#F8FAFC] flex overflow-hidden text-slate-900 font-sans">
      
      {/* FIXED LEFT SIDEBAR */}
      <Sidebar activePage="/risk-profile" />

      {/* RIGHT MAIN CONTENT AREA (SCROLLABLE) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* TOP HEADER BAR */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between gap-4 sticky top-0 z-20">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Equinox</h1>

          {/* Search Bar */}
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00A878]"
            />
          </div>

          {/* Right Header Icons */}
          <div className="flex items-center gap-4">
            <button type="button" className="p-2 text-slate-500 hover:text-slate-900 transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>
            <button type="button" className="p-2 text-slate-500 hover:text-slate-900 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center border border-slate-700 cursor-pointer">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SJ'}
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT */}
        <div className="flex-1 p-8 space-y-6 overflow-y-auto max-w-6xl w-full">
          
          {/* Page Title & Subtitle */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Risk Profile Overview</h2>
              <p className="text-xs text-slate-500 mt-0.5">Review your current risk tolerance and allocation constraints.</p>
            </div>
            <div className="text-xs font-mono text-slate-400">
              Last updated: Oct 12, 2026
            </div>
          </div>

          {/* CURRENT CLASSIFICATION HERO CARD */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            <div className="md:col-span-7 space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#00A878]">
                CURRENT CLASSIFICATION
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900">Balanced Investor</h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-md">
                Your profile indicates a preference for moderate growth while seeking to limit downside volatility over an 8-year horizon.
              </p>
            </div>

            {/* Risk Score Meter Box */}
            <div className="md:col-span-5 bg-slate-50/80 border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                <span>Risk Score</span>
                <span className="text-2xl font-extrabold text-slate-900 font-mono">
                  {riskScore} <span className="text-xs font-normal text-slate-400 font-mono">/100</span>
                </span>
              </div>

              {/* Multi-color Spectrum Progress Bar */}
              <div className="relative pt-2">
                <div className="w-full h-2.5 rounded-full bg-gradient-to-r from-blue-300 via-[#00A878] to-rose-500 relative">
                  {/* Indicator Arrow */}
                  <div 
                    className="absolute -bottom-3 text-slate-900 text-xs font-extrabold transform -translate-x-1/2"
                    style={{ left: `${riskScore}%` }}
                  >
                    ▲
                  </div>
                </div>
              </div>

              <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-3">
                <span>Conservative</span>
                <span>Aggressive</span>
              </div>
            </div>

          </div>

          {/* CALCULATION INPUTS & AI ALLOCATION RATIONALE GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Card 1: Calculation Inputs */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900">Calculation Inputs</h3>
                <button
                  type="button"
                  onClick={() => setViewMode('questionnaire')}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded border border-slate-200 transition-colors"
                >
                  Retake Questionnaire
                </button>
              </div>

              <div className="space-y-3 text-xs divide-y divide-slate-100 pt-1">
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Time Horizon</span>
                  <span className="font-mono font-bold text-slate-900">8 Years</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Loss Tolerance</span>
                  <span className="font-bold text-slate-900">Moderate</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Income Stability</span>
                  <span className="font-bold text-slate-900">High</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Investment Goal</span>
                  <span className="font-bold text-slate-900">Growth</span>
                </div>
              </div>
            </div>

            {/* Card 2: AI Allocation Rationale */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00A878]" />
                AI Allocation Rationale
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-8 text-xs text-slate-600 leading-relaxed space-y-2">
                  <p>
                    Based on a <strong>62/100</strong> risk tolerance, the optimal constraint model suggests limiting equity exposure to mitigate max drawdown during standard market stress events.
                  </p>
                  <p>
                    The volatility target remains within acceptable limits for an 8-year horizon, prioritizing long-term capital appreciation over immediate liquidity.
                  </p>
                </div>

                {/* Right Target Mix Ring Chart */}
                <div className="md:col-span-4 flex flex-col items-center">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#00A878" strokeWidth="4" strokeDasharray="60, 100" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F43F5E" strokeWidth="4" strokeDasharray="30, 100" strokeDashoffset="-60" />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-slate-700 text-center leading-tight">
                      Target<br/>Mix
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-[10px] font-mono text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00A878]"></span>
                      <span>Equities (60%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span>Bonds (30%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-300"></span>
                      <span>Cash (10%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RISK PROFILE DRIFT CARD */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Risk Profile Drift</h3>
            
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={DRIFT_DATA}>
                  <defs>
                    <linearGradient id="driftGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00A878" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#00A878" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={10} />
                  <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#E2E8F0', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="score" stroke="#00A878" strokeWidth={2.5} fillOpacity={1} fill="url(#driftGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
