import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Cpu, Database } from 'lucide-react';
import EquinoxLogo from './EquinoxLogo';

export default function Footer() {
  const { user } = useAuth();
  const location = useLocation();

  // Hide global Footer after sign in or on internal application routes
  if (user || (location.pathname !== '/' && location.pathname !== '/auth')) {
    return null;
  }

  return (
    <footer className="mt-20 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 py-10 px-6 text-slate-500 dark:text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        <div>
          <div className="mb-2">
            <EquinoxLogo className="w-6 h-6" textClassName="text-sm" isDarkBg={false} />
          </div>
          <p className="max-w-xl text-slate-500 dark:text-slate-400 leading-relaxed">
            Personalized portfolio advisory powered by classical quantitative optimization (PyPortfolioOpt), FinBERT news sentiment grounding, and LangChain LLM synthesis.
          </p>
        </div>

        <div className="flex items-center gap-6 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#00A878]" />
            <span>FastAPI Microservice: Operational</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>MongoDB: Connected</span>
          </div>
        </div>

      </div>
      
      <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-slate-200 dark:border-slate-900 text-center text-slate-400 dark:text-slate-600 text-[11px]">
        © 2026 Equinox Fintech Inc. All rights reserved. Educational & GenAI Capstone Deliverable.
      </div>
    </footer>
  );
}
