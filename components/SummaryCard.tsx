
import React from 'react';

interface SummaryCardProps {
  title: string;
  value: number;
  icon: string;
  colorClass: string;
  iconColorClass: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, colorClass, iconColorClass }) => {
  // Logic to adjust font size based on the length of the number
  const valueStr = value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const getFontSize = (len: number) => {
    if (len > 12) return 'text-xs md:text-sm';
    if (len > 9) return 'text-sm md:text-base';
    return 'text-base md:text-xl';
  };

  return (
    <div className={`bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex items-center gap-2 h-full`}>
      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex-shrink-0 flex items-center justify-center ${iconColorClass}`}>
        <i className={`fas ${icon} text-sm md:text-lg`}></i>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-slate-500 text-[9px] md:text-[10px] font-black uppercase tracking-tighter truncate leading-none mb-1">{title}</p>
        <div className="flex items-baseline gap-0.5 min-w-0">
          <span className={`text-[10px] md:text-xs font-bold ${colorClass} opacity-70`}>TK</span>
          <p className={`font-black leading-tight ${colorClass} truncate ${getFontSize(valueStr.length)}`}>
            {valueStr}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
