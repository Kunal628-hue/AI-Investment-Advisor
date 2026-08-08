import React from 'react';

export default function EquinoxLogo({ 
  className = "w-8 h-8", 
  textClassName = "text-lg", 
  showText = true,
  isDarkBg = false 
}) {
  return (
    <div className="flex items-center gap-3 select-none inline-flex">
      {/* Precision Geometric EF Growth Monogram Icon */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Angled Diamond Base Loop (Letter 'E') */}
        <path
          d="M 22 55 L 45 32 L 62 49 L 45 66 Z"
          stroke="#00A878"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <path
          d="M 32 45 L 52 25 L 68 41"
          stroke="#00A878"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Letter 'F' Arm */}
        <path
          d="M 52 50 L 52 75 M 52 50 L 68 50 M 52 62 L 64 62"
          stroke="#00A878"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Growth Arrow pointing Top Right */}
        <path
          d="M 45 32 L 78 12 M 78 12 L 62 12 M 78 12 L 78 28"
          stroke="#00A878"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showText && (
        <span className={`font-extrabold tracking-wider ${isDarkBg ? 'text-slate-100' : 'text-slate-900'} ${textClassName}`}>
          EQUINOX <span className="text-[#00A878] font-bold">FINTECH</span>
        </span>
      )}
    </div>
  );
}
