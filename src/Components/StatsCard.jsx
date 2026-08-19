// src/components/StatsCard.jsx
import React from 'react';

const ACCENTS = ['blue', 'emerald', 'violet', 'amber', 'cyan', 'rose'];

const StatsCard = ({ icon, label, title, value, change, changePositive, isPositive, accent }) => {
  const isPos = isPositive !== undefined ? isPositive : changePositive;
  const changeColor = isPos ? 'stats-change-positive text-emerald-400' : 'stats-change-negative text-rose-400';
  const accentClass = accent && ACCENTS.includes(accent) ? `stats-card--${accent}` : '';
  const displayLabel = label || title;

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const IconComponent = icon;
    return <IconComponent size={20} />;
  };

  return (
    <div
      className={`stats-card surface-card flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${accentClass}`}
    >
      <div className="stats-card-icon inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300 shadow-inner">
        {renderIcon()}
      </div>
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted">{displayLabel}</p>
        <h3 className="mt-1.5 text-2xl font-semibold text-primary">{value}</h3>
        {change && (
          <p className={`mt-1.5 text-xs font-medium ${changeColor}`}>
            {isPos ? '▲' : '▼'} {change}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
