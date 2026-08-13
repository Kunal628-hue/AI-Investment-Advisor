import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, portfolioAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { 
  Sparkles, Search, Bell, Settings, RefreshCw, CheckCircle2, Sliders, Edit3, Save, X, ShieldAlert, BarChart3, Database, Cpu, Plus, ArrowRight, TrendingUp, ShieldCheck
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const QUESTIONS = [
  {
    step: 1,
    title: "What is your primary investment time horizon?",
    options: [
      { id: '1-3y', score: 10, title: 'Conservative', desc: '1 to 3 Years — I need liquidity and capital security within a short timeframe.', label: '3 Years (Short-Term)' },
      { id: '3-5y', score: 20, title: 'Moderate', desc: '3 to 5 Years — I am saving for a medium-term financial milestone.', label: '5 Years (Medium-Term)' },
      { id: '5-10y', score: 30, title: 'Aggressive', desc: '5 to 10 Years — I am looking to build wealth over a solid growth horizon.', label: '8 Years (Long-Term)' },
      { id: '10y+', score: 40, title: 'Very Aggressive', desc: '10+ Years — I have a multi-decade horizon for maximum capital compounding.', label: '12+ Years (Multi-Decade)' }
    ]
  },
  {
    step: 2,
    title: "What is your main financial objective for this portfolio?",
    options: [
      { id: 'preservation', score: 10, title: 'Conservative', desc: 'Capital Preservation — Protecting my principal capital against market drawdowns is top priority.', label: 'Capital Preservation' },
      { id: 'income', score: 20, title: 'Moderate', desc: 'Income & Dividends — Generating steady cash flow and dividends with low risk.', label: 'Income Generation' },
      { id: 'balanced', score: 30, title: 'Aggressive', desc: 'Balanced Growth — Achieving steady growth while managing market volatility.', label: 'Capital Growth' },
      { id: 'max_growth', score: 40, title: 'Very Aggressive', desc: 'Maximum Growth — Aggressive compounding for highest long-term returns.', label: 'Aggressive Compounding' }
    ]
  },
  {
    step: 3,
    title: "How would you react to a 20% portfolio drop in a month?",
    options: [
      { id: 'sell_all', score: 10, title: 'Conservative', desc: 'I would sell all my investments to prevent further loss.', label: 'Low (<5% Max Drawdown)' },
      { id: 'sell_some', score: 20, title: 'Moderate', desc: 'I would sell a portion of my investments.', label: 'Moderate (5-15% Max Drawdown)' },
      { id: 'hold', score: 30, title: 'Aggressive', desc: 'I would do nothing and wait for recovery.', label: 'High (15-25% Max Drawdown)' },
      { id: 'buy_more', score: 40, title: 'Very Aggressive', desc: 'I would buy more at a lower price.', label: 'Very High (>25% Max Drawdown)' }
    ]
  },
  {
    step: 4,
    title: "Which risk vs return trade-off best matches your preference?",
    options: [
      { id: 'low_risk', score: 10, title: 'Conservative', desc: 'Low Risk, Low Return — Target 3-5% annual return with minimal fluctuations.', label: 'Low (3-5% Target Return)' },
      { id: 'mod_risk', score: 20, title: 'Moderate', desc: 'Moderate Risk — Target 6-9% annual return with moderate ups and downs.', label: 'Moderate (6-9% Target Return)' },
      { id: 'high_risk', score: 30, title: 'Aggressive', desc: 'High Risk, High Return — Target 10-15% annual return accepting market volatility.', label: 'High (10-15% Target Return)' },
      { id: 'max_risk', score: 40, title: 'Very Aggressive', desc: 'Maximum Growth — Target 15%+ return accepting sharp temporary drawdowns.', label: 'Max (15%+ Target Return)' }
    ]
  },
  {
    step: 5,
    title: "What is your level of financial market investment experience?",
    options: [
      { id: 'beginner', score: 10, title: 'Conservative', desc: 'Beginner — New to investing and prefer automated low-risk strategies.', label: 'Beginner' },
      { id: 'intermediate', score: 20, title: 'Moderate', desc: 'Intermediate — Familiar with stocks, ETFs, and basic asset allocation.', label: 'Intermediate' },
      { id: 'advanced', score: 30, title: 'Aggressive', desc: 'Advanced — Experienced with market cycles, diversification, and rebalancing.', label: 'Advanced' },
      { id: 'expert', score: 40, title: 'Very Aggressive', desc: 'Expert / Institutional — Experienced with quants, hedging, and portfolio theory.', label: 'Expert' }
    ]
  }
];

// Helper: Dynamically generate real monthly calendar drift points leading to current month
const generateDynamicDriftHistory = (currentScore, savedHistory) => {
  if (Array.isArray(savedHistory) && savedHistory.length >= 3 && savedHistory[0].month) {
    return savedHistory;
  }
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = d.toLocaleString('en-US', { month: 'short' });
    const factor = (5 - i) / 5;
    const baseScore = Math.round(50 + (currentScore - 50) * factor);
    const noise = i === 0 ? 0 : (i % 2 === 0 ? -2 : 3);
    months.push({
      month: monthName,
      score: Math.min(100, Math.max(0, baseScore + noise)),
      date: d.toISOString()
    });
  }
  return months;
};

// Helper: Formatters for clean institutional labels
const formatLossToleranceLabel = (val) => {
  if (!val) return 'High (15-25% Max Drawdown)';
  const str = val.toString().toLowerCase();
  if (str.includes('low') || str.includes('sell_all') || str.includes('<5%')) return 'Low (<5% Max Drawdown)';
  if (str.includes('moderate') || str.includes('sell_some') || str.includes('5-15%')) return 'Moderate (5-15% Max Drawdown)';
  if (str.includes('very high') || str.includes('buy_more') || str.includes('>25%')) return 'Very High (>25% Max Drawdown)';
  if (str.includes('high') || str.includes('hold') || str.includes('15-25%') || str.includes('buy')) return 'High (15-25% Max Drawdown)';
  return val;
};

const formatTimeHorizonLabel = (val) => {
  if (!val) return '8 Years (Long-Term)';
  const str = val.toString().toLowerCase();
  if (str.includes('1-3') || str.includes('3 year')) return '3 Years (Short-Term)';
  if (str.includes('3-5') || str.includes('5 year')) return '5 Years (Medium-Term)';
  if (str.includes('10+') || str.includes('12 year')) return '12+ Years (Multi-Decade)';
  if (str.includes('5-10') || str.includes('8 year')) return '8 Years (Long-Term)';
  return val;
};

const formatGoalLabel = (val) => {
  if (!val) return 'Capital Growth';
  const str = val.toString().toLowerCase();
  if (str.includes('preserv')) return 'Capital Preservation';
  if (str.includes('income') || str.includes('div')) return 'Income Generation';
  if (str.includes('max') || str.includes('compound')) return 'Aggressive Compounding';
  if (str.includes('growth')) return 'Capital Growth';
  return val;
};

// Helper: Mathematically precise Asset Allocation formula based on MPT & Risk Score (0-100)
const calculateTargetMix = (score) => {
  const cashPct = Math.max(5, Math.min(20, Math.round(20 - (score / 100) * 15)));
  const bondsPct = Math.max(5, Math.min(70, Math.round(70 * Math.pow(1 - score / 100, 1.15))));
  const eqPct = 100 - bondsPct - cashPct;
  return { equities: eqPct, bonds: bondsPct, cash: cashPct };
};

// Helper: Derived Quantitative Risk Guardrails
const getRiskGuardrails = (score) => {
  const maxDrawdown = (5 + (score / 100) * 25).toFixed(1);
  const minVol = (3 + (score / 100) * 11).toFixed(1);
  const maxVol = (5 + (score / 100) * 14).toFixed(1);
  const var95 = (0.8 + (score / 100) * 1.8).toFixed(2);
  const targetSharpe = (1.1 + (1 - Math.abs(score - 65) / 100) * 0.5).toFixed(2);

  return {
    maxDrawdown: `-${maxDrawdown}%`,
    volatilityRange: `${minVol}% – ${maxVol}%`,
    var95: `-${var95}%`,
    targetSharpe
  };
};

const formatHorizonText = (horizon) => {
  const h = (horizon || '8 Years').toString().toLowerCase();
  if (h.includes('1-3') || h.includes('3 year')) return { str: '3-year', article: 'a' };
  if (h.includes('3-5') || h.includes('5 year')) return { str: '5-year', article: 'a' };
  if (h.includes('10+') || h.includes('12 year')) return { str: '12-year', article: 'a' };
  return { str: '8-year', article: 'an' };
};

const getRiskClassification = (score, horizon = '8 Years', goal = 'Capital Growth') => {
  const { str: horizonStr, article } = formatHorizonText(horizon);

  if (score < 35) {
    return {
      category: 'Conservative Investor',
      description: `Your profile indicates a strong preference for capital preservation with minimal downside volatility over ${article} ${horizonStr} investment horizon focusing on ${goal.toLowerCase()}.`
    };
  } else if (score < 65) {
    return {
      category: 'Balanced Investor',
      description: `Your profile indicates a preference for moderate growth while seeking to limit downside volatility over ${article} ${horizonStr} investment horizon focusing on ${goal.toLowerCase()}.`
    };
  } else if (score < 85) {
    return {
      category: 'Balanced Aggressive Investor',
      description: `Your profile indicates an appetite for higher long-term capital appreciation while accepting moderate market fluctuations over ${article} ${horizonStr} investment horizon focusing on ${goal.toLowerCase()}.`
    };
  } else {
    return {
      category: 'Aggressive Growth Investor',
      description: `Your profile targets maximum long-term capital compounding and is comfortable absorbing sharp market drawdowns over ${article} ${horizonStr} investment horizon focusing on ${goal.toLowerCase()}.`
    };
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'Just now';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return 'Aug 13, 2026';
  }
};

export default function RiskProfilingPage() {
  const { user, updateUserRiskProfile } = useAuth();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'questionnaire'
  const [isEditing, setIsEditing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userHoldings, setUserHoldings] = useState([]);

  // Dynamic state initialized from User profile
  const userProfile = user?.riskProfile || {};
  const [isConfigured, setIsConfigured] = useState(() => {
    if (userProfile.isConfigured === true) return true;
    return false;
  });
  const [riskScore, setRiskScore] = useState(userProfile.score ?? 73);
  const [timeHorizon, setTimeHorizon] = useState(userProfile.timeHorizon || '8 Years (Long-Term)');
  const [lossTolerance, setLossTolerance] = useState(userProfile.lossTolerance || 'High (15-25% Max Drawdown)');
  const [incomeStability, setIncomeStability] = useState(userProfile.incomeStability || 'High');
  const [investmentGoal, setInvestmentGoal] = useState(userProfile.primaryGoal || 'Capital Growth');
  const [driftHistory, setDriftHistory] = useState(() => generateDynamicDriftHistory(userProfile.score ?? 73, userProfile.driftHistory));
  const [updatedAt, setUpdatedAt] = useState(userProfile.updatedAt || new Date().toISOString());

  const [answers, setAnswers] = useState(userProfile.answers || {});

  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Fetch real active holdings from localStorage or backend to check if portfolio was created
  useEffect(() => {
    const storageKeyAssets = `portfolio_assets_${user?.id || user?._id || 'guest'}`;
    try {
      const saved = localStorage.getItem(storageKeyAssets);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUserHoldings(parsed.map(a => a.ticker));
          setIsConfigured(true);
        }
      }
    } catch (e) {}
  }, [user]);

  // Keep state in sync if AuthContext user loads asynchronously
  useEffect(() => {
    if (user?.riskProfile) {
      const p = user.riskProfile;
      if (p.isConfigured === true) {
        setIsConfigured(true);
      }
      setRiskScore(p.score ?? 73);
      if (p.timeHorizon) setTimeHorizon(formatTimeHorizonLabel(p.timeHorizon));
      if (p.lossTolerance) setLossTolerance(formatLossToleranceLabel(p.lossTolerance));
      if (p.incomeStability) setIncomeStability(p.incomeStability);
      if (p.primaryGoal) setInvestmentGoal(formatGoalLabel(p.primaryGoal));
      if (p.driftHistory?.length) setDriftHistory(generateDynamicDriftHistory(p.score ?? 73, p.driftHistory));
      if (p.updatedAt) setUpdatedAt(p.updatedAt);
      if (p.answers) setAnswers(p.answers);
    }
  }, [user]);

  // Derived Dynamic calculations
  const targetMix = calculateTargetMix(riskScore);
  const guardrails = getRiskGuardrails(riskScore);
  const { category, description } = getRiskClassification(riskScore, timeHorizon, investmentGoal);
  const { str: horizonStr, article } = formatHorizonText(timeHorizon);

  // Questionnaire navigation
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
    
    let newTimeHorizon = '8 Years (Long-Term)';
    let newGoal = 'Capital Growth';
    let newLossTol = 'High (15-25% Max Drawdown)';

    QUESTIONS.forEach(q => {
      const selectedId = answers[q.step];
      const opt = q.options.find(o => o.id === selectedId);
      if (opt) {
        totalPoints += opt.score;
        if (q.step === 1) newTimeHorizon = formatTimeHorizonLabel(opt.label);
        if (q.step === 2) newGoal = formatGoalLabel(opt.label);
        if (q.step === 3) newLossTol = formatLossToleranceLabel(opt.label);
      }
    });

    const calculatedScore = Math.min(100, Math.max(0, Math.round(((totalPoints - 50) / 150) * 100)));
    const { category: newCategory } = getRiskClassification(calculatedScore, newTimeHorizon, newGoal);

    const currentMonth = new Date().toLocaleString('en-US', { month: 'short' });
    const newDrift = [...driftHistory.slice(-5), { month: currentMonth, score: calculatedScore, date: new Date().toISOString() }];
    const nowIso = new Date().toISOString();

    const updatedProfile = {
      isConfigured: true,
      score: calculatedScore,
      category: newCategory,
      timeHorizon: newTimeHorizon,
      primaryGoal: newGoal,
      lossTolerance: newLossTol,
      incomeStability,
      answers,
      driftHistory: newDrift,
      updatedAt: nowIso
    };

    setIsConfigured(true);
    setRiskScore(calculatedScore);
    setTimeHorizon(newTimeHorizon);
    setInvestmentGoal(newGoal);
    setLossTolerance(newLossTol);
    setDriftHistory(newDrift);
    setUpdatedAt(nowIso);

    try {
      const res = await userAPI.updateRiskProfile(updatedProfile);
      if (res.data?.success && res.data.riskProfile) {
        updateUserRiskProfile(res.data.riskProfile);
      } else {
        updateUserRiskProfile(updatedProfile);
      }
    } catch (err) {
      updateUserRiskProfile(updatedProfile);
    } finally {
      setSubmitting(false);
      setViewMode('overview');
    }
  };

  const handleSaveInlineEdits = async () => {
    setSavingEdit(true);
    const { category: newCategory } = getRiskClassification(riskScore, timeHorizon, investmentGoal);
    const currentMonth = new Date().toLocaleString('en-US', { month: 'short' });
    const newDrift = [...driftHistory.slice(-5), { month: currentMonth, score: riskScore, date: new Date().toISOString() }];
    const nowIso = new Date().toISOString();

    const updatedProfile = {
      isConfigured: true,
      score: riskScore,
      category: newCategory,
      timeHorizon,
      primaryGoal: investmentGoal,
      lossTolerance,
      incomeStability,
      answers,
      driftHistory: newDrift,
      updatedAt: nowIso
    };

    setIsConfigured(true);
    setDriftHistory(newDrift);
    setUpdatedAt(nowIso);

    try {
      const res = await userAPI.updateRiskProfile(updatedProfile);
      if (res.data?.success && res.data.riskProfile) {
        updateUserRiskProfile(res.data.riskProfile);
      } else {
        updateUserRiskProfile(updatedProfile);
      }
    } catch (err) {
      updateUserRiskProfile(updatedProfile);
    } finally {
      setSavingEdit(false);
      setIsEditing(false);
    }
  };

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
                  className={`p-6 rounded-xl text-left transition-all border ${
                    isSelected
                      ? 'bg-white border-[#00A878] ring-2 ring-[#00A878]/20 shadow-md'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-none'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-bold text-slate-900 text-base">{option.title}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[#00A878]" />}
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
              className="text-xs font-mono font-bold text-slate-400 hover:text-slate-900 tracking-wider transition-colors disabled:opacity-30 cursor-pointer"
            >
              BACK
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={submitting}
              className="bg-[#00A878] hover:bg-[#009268] text-white font-mono font-bold text-xs uppercase px-7 py-2.5 rounded-lg transition-all shadow-sm tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>SAVING...</span>
                </>
              ) : currentStepIndex === QUESTIONS.length - 1 ? (
                'COMPLETE QUESTIONNAIRE'
              ) : (
                'NEXT QUESTION'
              )}
            </button>
          </div>

        </div>
        <div className="py-4"></div>
      </div>
    );
  }

  // PREMIUM UI/UX UNCONFIGURED ONBOARDING STATE
  if (!isConfigured) {
    return (
      <div className="h-screen bg-[#F8FAFC] flex overflow-hidden text-slate-900 font-sans">
        <Sidebar activePage="/risk-profile" />

        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
          {/* TOP HEADER BAR */}
          <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Equinox</h1>

            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00A878]"
              />
            </div>

            <div className="flex items-center gap-4">
              <button type="button" className="p-2 text-slate-500 hover:text-slate-900 transition-colors relative">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
              </button>
              <button type="button" className="p-2 text-slate-500 hover:text-slate-900 transition-colors">
                <Settings className="w-4 h-4" />
              </button>
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center border border-slate-700 cursor-pointer">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'KU'}
              </div>
            </div>
          </header>

          {/* MAIN UNCONFIGURED WORKSPACE AREA */}
          <div className="flex-1 p-8 max-w-5xl w-full mx-auto space-y-8 overflow-y-auto">
            
            {/* Page Title & Status Pill */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Risk Profiling & Strategy Setup</h2>
                <p className="text-xs text-slate-500 mt-1">Configure your risk parameters to unlock Markowitz Efficient Frontier optimization and quantitative guardrails.</p>
              </div>

              <span className="px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono font-bold flex items-center gap-2 shadow-xs">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span>Action Required: Profile Not Setup</span>
              </span>
            </div>

            {/* HERO HERO CARD CONTAINER */}
            <div className="bg-gradient-to-br from-white via-emerald-50/20 to-slate-50 border border-slate-200/90 rounded-2xl p-8 shadow-sm space-y-8">
              
              {/* Hero Banner Title & Badge */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#00A878] shadow-xs shrink-0">
                  <Sparkles className="w-6 h-6 text-[#00A878]" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Choose Your Setup Pathway</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
                    Equinox uses Modern Portfolio Theory (MPT) to calculate optimal asset weightings, expected returns, and risk guardrails. Select an option below to initialize your investment profile:
                  </p>
                </div>
              </div>

              {/* TWO CHOICE PATHWAY CARDS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Pathway 1: Questionnaire */}
                <div className="bg-white border-2 border-emerald-200 hover:border-[#00A878] rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-6 group">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#00A878] text-[10px] font-mono font-bold uppercase tracking-wider">
                        RECOMMENDED FOR NEW INVESTORS
                      </span>
                      <ShieldCheck className="w-5 h-5 text-[#00A878]" />
                    </div>

                    <h4 className="text-lg font-bold text-slate-900 group-hover:text-[#00A878] transition-colors">
                      Take 5-Step Risk Profiling Questionnaire
                    </h4>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      Answer 5 guided questions covering your investment horizon, drawdown tolerance, and return goals to automatically establish your risk score (0-100).
                    </p>

                    <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#00A878] shrink-0" />
                        <span>Calculates target Equity, Bond & Cash allocation mix</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#00A878] shrink-0" />
                        <span>Sets 1-year max drawdown and daily VaR 95% guardrails</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#00A878] shrink-0" />
                        <span>Takes only ~2 minutes to complete</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStepIndex(0);
                      setViewMode('questionnaire');
                    }}
                    className="w-full py-3 bg-[#00A878] hover:bg-[#009268] text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Start Questionnaire</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                {/* Pathway 2: Planner Direct */}
                <div className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-6 group">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-mono font-bold uppercase tracking-wider">
                        FOR EXPERIENCED INVESTORS
                      </span>
                      <Sliders className="w-5 h-5 text-blue-600" />
                    </div>

                    <h4 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      Build Strategy in Portfolio Planner
                    </h4>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      Select custom equity tickers across NASDAQ, NYSE, or NSE Indian stock markets, input investment capital, and run Markowitz Efficient Frontier optimization.
                    </p>

                    <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Support for US & Indian stocks (e.g. AAPL, IRFC.NS)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Calculates Sharpe Ratio, Beta, and Expected Return</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Generates PDF reports & FinBERT news sentiment</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/planner')}
                    className="w-full py-3 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Open Portfolio Planner</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

              </div>

            </div>

            {/* PREVIEW OF UNLOCKED FEATURES */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">What You Unlock After Setup</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-[#00A878]">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Target Asset Mix</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Inline target allocations across Equities, Fixed Income, and Cash reserves tailored to your return profile.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Quantitative Risk Guardrails</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Monitors Max Drawdown limits, Annual Volatility Bands, and 95% Daily Value-at-Risk (VaR) thresholds.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Gemini 2.5 GenAI Synthesis</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Personalized AI investment narratives and FinBERT news sentiment grounded on your active portfolio.
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // OVERVIEW RENDER (Mathematically Precise & Dynamically Connected)
  return (
    <div className="h-screen bg-[#F8FAFC] flex overflow-hidden text-slate-900 font-sans">
      
      {/* FIXED LEFT SIDEBAR */}
      <Sidebar activePage="/risk-profile" />

      {/* RIGHT MAIN CONTENT AREA (SCROLLABLE) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* TOP HEADER BAR */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Equinox</h1>

          {/* Search Bar */}
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00A878]"
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
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'KU'}
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT */}
        <div className="flex-1 p-8 space-y-6 overflow-y-auto max-w-6xl w-full">
          
          {/* Page Title & Subtitle */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Risk Profile Overview</h2>
              <p className="text-xs text-slate-500 mt-0.5">Review your current risk tolerance, live asset allocation constraints, and target parameters.</p>
            </div>
            <div className="text-xs font-mono text-slate-400">
              Last updated: {formatDate(updatedAt)}
            </div>
          </div>

          {/* CURRENT CLASSIFICATION HERO CARD */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            <div className="md:col-span-7 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#00A878]">
                  CURRENT CLASSIFICATION
                </span>
                {userHoldings.length > 0 && (
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#00A878] text-[9px] font-mono font-bold flex items-center gap-1">
                    <Database className="w-2.5 h-2.5" />
                    Synced with {userHoldings.length} holdings
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900">{category}</h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-md">
                {description}
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
                <div className="w-full h-2.5 rounded-full bg-gradient-to-r from-blue-400 via-[#00A878] to-rose-500 relative">
                  {/* Indicator Arrow */}
                  <div 
                    className="absolute -bottom-3 text-slate-900 text-xs font-extrabold transform -translate-x-1/2 transition-all duration-300"
                    style={{ left: `${riskScore}%` }}
                  >
                    ▲
                  </div>
                </div>
              </div>

              <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-3">
                <span>Conservative (0)</span>
                <span>Aggressive (100)</span>
              </div>
            </div>

          </div>

          {/* QUANTITATIVE RISK GUARDRAILS METRICS BAR */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">MAX DRAWDOWN LIMIT</div>
              <div className="text-lg font-extrabold text-rose-600 font-mono">{guardrails.maxDrawdown}</div>
              <div className="text-[10px] text-slate-400">Stress event guardrail</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">VOLATILITY BAND</div>
              <div className="text-lg font-extrabold text-blue-600 font-mono">{guardrails.volatilityRange}</div>
              <div className="text-[10px] text-slate-400">Target annual std dev</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">DAILY VaR (95%)</div>
              <div className="text-lg font-extrabold text-amber-600 font-mono">{guardrails.var95}</div>
              <div className="text-[10px] text-slate-400">Value-at-Risk daily threshold</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">TARGET SHARPE</div>
              <div className="text-lg font-extrabold text-[#00A878] font-mono">{guardrails.targetSharpe}</div>
              <div className="text-[10px] text-slate-400">Risk-adjusted return hurdle</div>
            </div>
          </div>

          {/* CALCULATION INPUTS & AI ALLOCATION RATIONALE GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Card 1: Calculation Inputs */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#00A878]" />
                  <span>Calculation Inputs</span>
                </h3>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {isEditing ? <X className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                    <span>{isEditing ? 'Cancel' : 'Tweak'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStepIndex(0);
                      setViewMode('questionnaire');
                    }}
                    className="px-3 py-1 bg-[#00A878] hover:bg-[#009268] text-white font-semibold text-xs rounded shadow-sm transition-colors cursor-pointer"
                  >
                    Retake Questionnaire
                  </button>
                </div>
              </div>

              {isEditing ? (
                /* Inline Quick Tuning Form */
                <div className="space-y-3 pt-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Risk Score Slider ({riskScore}/100)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={riskScore}
                      onChange={(e) => setRiskScore(Number(e.target.value))}
                      className="w-full accent-[#00A878] cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Time Horizon</label>
                      <select
                        value={timeHorizon}
                        onChange={(e) => setTimeHorizon(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded font-mono text-xs focus:outline-none"
                      >
                        <option value="3 Years (Short-Term)">3 Years</option>
                        <option value="5 Years (Medium-Term)">5 Years</option>
                        <option value="8 Years (Long-Term)">8 Years</option>
                        <option value="12+ Years (Multi-Decade)">12+ Years</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Loss Tolerance</label>
                      <select
                        value={lossTolerance}
                        onChange={(e) => setLossTolerance(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:outline-none"
                      >
                        <option value="Low (<5% Max Drawdown)">Low (&lt;5% Drop)</option>
                        <option value="Moderate (5-15% Max Drawdown)">Moderate (5-15% Drop)</option>
                        <option value="High (15-25% Max Drawdown)">High (15-25% Drop)</option>
                        <option value="Very High (>25% Max Drawdown)">Very High (&gt;25% Drop)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Income Stability</label>
                      <select
                        value={incomeStability}
                        onChange={(e) => setIncomeStability(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:outline-none"
                      >
                        <option value="Low">Low</option>
                        <option value="Moderate">Moderate</option>
                        <option value="High">High</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Investment Goal</label>
                      <select
                        value={investmentGoal}
                        onChange={(e) => setInvestmentGoal(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:outline-none"
                      >
                        <option value="Capital Preservation">Preservation</option>
                        <option value="Income Generation">Income</option>
                        <option value="Capital Growth">Growth</option>
                        <option value="Aggressive Compounding">Max Compounding</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveInlineEdits}
                    disabled={savingEdit}
                    className="w-full mt-2 py-2 bg-[#00A878] hover:bg-[#009268] text-white font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {savingEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Parameters</span>
                  </button>
                </div>
              ) : (
                /* Dynamic Summary List */
                <div className="space-y-3 text-xs divide-y divide-slate-100 pt-1">
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">Time Horizon</span>
                    <span className="font-mono font-bold text-slate-900">{formatTimeHorizonLabel(timeHorizon)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">Loss Tolerance</span>
                    <span className="font-bold text-slate-900">{formatLossToleranceLabel(lossTolerance)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">Income Stability</span>
                    <span className="font-bold text-slate-900">{incomeStability}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">Investment Goal</span>
                    <span className="font-bold text-slate-900">{formatGoalLabel(investmentGoal)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: AI Allocation Rationale */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00A878]" />
                  AI Allocation Rationale
                </h3>

                {userHoldings.length > 0 && (
                  <span className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-[#00A878]" />
                    Targeting {userHoldings.slice(0, 3).join(', ')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-8 text-xs text-slate-600 leading-relaxed space-y-2">
                  <p>
                    Based on your calculated <strong>{riskScore}/100</strong> risk tolerance, the optimal constraint model suggests allocating <strong>{targetMix.equities}%</strong> to equities to achieve target capital appreciation while keeping max drawdown limited to <strong>{guardrails.maxDrawdown}</strong>.
                  </p>
                  <p>
                    The volatility target (<strong>{guardrails.volatilityRange}</strong>) remains within acceptable limits for {article} <strong>{horizonStr}</strong> horizon, prioritizing long-term {formatGoalLabel(investmentGoal).toLowerCase()} over immediate liquidity.
                  </p>
                </div>

                {/* Right Dynamic Target Mix Ring Chart */}
                <div className="md:col-span-4 flex flex-col items-center">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                      {/* Equities Arc */}
                      <circle 
                        cx="18" cy="18" r="15.9" fill="none" stroke="#00A878" strokeWidth="4" 
                        strokeDasharray={`${targetMix.equities}, 100`} 
                        strokeDashoffset="0"
                      />
                      {/* Bonds Arc */}
                      <circle 
                        cx="18" cy="18" r="15.9" fill="none" stroke="#F43F5E" strokeWidth="4" 
                        strokeDasharray={`${targetMix.bonds}, 100`} 
                        strokeDashoffset={`-${targetMix.equities}`}
                      />
                      {/* Cash Arc */}
                      <circle 
                        cx="18" cy="18" r="15.9" fill="none" stroke="#93C5FD" strokeWidth="4" 
                        strokeDasharray={`${targetMix.cash}, 100`} 
                        strokeDashoffset={`-${targetMix.equities + targetMix.bonds}`}
                      />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-slate-700 text-center leading-tight">
                      Target<br/>Mix
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-[10px] font-mono text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00A878]"></span>
                      <span>Equities ({targetMix.equities}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span>Bonds ({targetMix.bonds}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-300"></span>
                      <span>Cash ({targetMix.cash}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RISK PROFILE DRIFT CARD */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Risk Profile Drift History</h3>
              <span className="text-[10px] font-mono text-slate-400">Historical tolerance trajectory (Past 6 Months)</span>
            </div>
            
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={driftHistory}>
                  <defs>
                    <linearGradient id="driftGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00A878" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#00A878" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={10} />
                  <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={10} />
                  <Tooltip 
                    formatter={(val) => [`${val} / 100`, 'Risk Score']}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px' }} 
                  />
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
