import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
}

const StatsCard = ({ title, value, change, changeType, icon: Icon }: StatsCardProps) => {
  const changeColor = {
    positive: 'text-emerald-400',
    negative: 'text-red-400',
    neutral: 'text-red-300'
  }[changeType];

  return (
    <div className="cyber-card rounded-2xl p-8 cyber-hover cyber-slide-up group scan-line">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-red-200/70 uppercase tracking-wider mb-3">{title}</p>
          <p className="text-4xl font-bold bg-gradient-to-r from-white to-red-100 bg-clip-text text-transparent mb-2 cyber-text-glow">
            {value}
          </p>
          <p className={`text-xs font-medium ${changeColor}`}>{change}</p>
        </div>
        <div className="relative ml-6">
          <div className="w-16 h-16 bg-gradient-to-br from-red-900 via-red-800 to-red-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 cyber-glow">
            <Icon className="w-8 h-8 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center cyber-pulse">
            <div className="w-3 h-3 bg-emerald-900 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;