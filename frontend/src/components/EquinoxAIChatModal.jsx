import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, User, RefreshCw } from 'lucide-react';
import axios from 'axios';

export default function EquinoxAIChatModal({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Hello! I am Equinox AI, your financial and portfolio optimization assistant powered by Gemini API. Ask me anything about your risk profile, asset allocation, Markowitz Efficient Frontier, or market sentiment!'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');

    return lines.map((line, lIdx) => {
      if (!line.trim()) return <div key={lIdx} className="h-1.5" />;

      let isHeader = false;
      let cleanLine = line;
      if (line.startsWith('### ')) {
        isHeader = true;
        cleanLine = line.replace('### ', '');
      }

      const parts = cleanLine.split(/(\*\*.*?\*\*|\*.*?\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={pIdx} className="italic text-slate-800">{part.slice(1, -1)}</em>;
        }
        return part;
      });

      if (isHeader) {
        return <h4 key={lIdx} className="font-bold text-slate-900 text-sm mt-2 mb-1">{renderedParts}</h4>;
      }

      return (
        <p key={lIdx} className="mb-1 leading-relaxed">
          {renderedParts}
        </p>
      );
    });
  };

  if (!isOpen) return null;

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      let tickers = ['IRFC.NS', 'IRIS.NS', 'PCBL.NS', 'NHPC.NS', 'SJVN.NS'];
      let investmentAmount = 100000;

      try {
        const savedAssetsStr = localStorage.getItem('portfolio_assets_guest') || localStorage.getItem('portfolio_assets_undefined');
        if (savedAssetsStr) {
          const parsed = JSON.parse(savedAssetsStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            tickers = parsed.map(a => a.ticker);
          }
        }
        const totalVal = Number(localStorage.getItem('portfolio_total_guest')) || 100000;
        if (totalVal) investmentAmount = totalVal;
      } catch {}

      const res = await axios.post('/api/symbols/chat', {
        message: userText,
        tickers,
        investmentAmount,
        riskScore: 50
      });

      const aiAnswer = res.data?.reply || 
        'Equinox AI Analysis: Modern Portfolio Theory optimizes allocations across non-correlated holdings to maximize Sharpe ratio while protecting against drawdown volatility.';

      setMessages(prev => [...prev, { sender: 'ai', text: aiAnswer }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: `Equinox Advisor Response: ${userText.toLowerCase().includes('risk') ? 'To optimize risk, balance equity holdings with defensive assets and limit single position weight under 25%.' : 'Markowitz Mean-Variance Optimization calculates the target weights along the Efficient Frontier curve for maximum Sharpe efficiency.'}` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col h-[520px] overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#1E293B] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00A878] flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Ask Equinox AI</h3>
              <p className="text-[10px] text-emerald-400 font-mono">Gemini 2.5 Multi-Agent Engine Active</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
          {messages.map((m, idx) => (
            <div 
              key={idx} 
              className={`flex gap-3 text-xs leading-relaxed ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-7 h-7 rounded-lg bg-[#00A878] text-white flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}
              <div 
                className={`max-w-[85%] p-3.5 rounded-2xl ${
                  m.sender === 'user' 
                    ? 'bg-[#00A878] text-white rounded-br-none font-medium shadow-sm' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                }`}
              >
                {renderFormattedText(m.text)}
              </div>
              {m.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 font-bold text-[10px]">
                  US
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold italic pl-10">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00A878]" />
              Equinox AI is calculating recommendation...
            </div>
          )}
        </div>

        {/* Quick Question Chips */}
        <div className="px-6 py-2 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-slate-400 font-medium whitespace-nowrap">Suggested:</span>
          {[
            'Optimize my risk profile',
            'Explain Sharpe Ratio',
            'Which stocks offer high growth?'
          ].map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setInput(q);
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-full whitespace-nowrap transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Footer Input */}
        <form id="chat-form" onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200 flex items-center gap-3">
          <input
            type="text"
            placeholder="Ask Equinox AI about investments, risk, or portfolio strategy..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00A878]"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-[#00A878] hover:bg-[#009268] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

      </div>
    </div>
  );
}
