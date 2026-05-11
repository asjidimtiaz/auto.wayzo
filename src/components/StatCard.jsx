'use client';

const colorMap = {
  primary: { 
    icon: 'bg-blue-50 text-blue-600', 
    gradient: 'from-blue-600 to-blue-500',
    accent: 'bg-blue-600',
    light: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-100',
  },
  success: { 
    icon: 'bg-emerald-50 text-emerald-600', 
    gradient: 'from-emerald-500 to-teal-400',
    accent: 'bg-emerald-500',
    light: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-100',
  },
  warning: { 
    icon: 'bg-amber-50 text-amber-600', 
    gradient: 'from-amber-500 to-orange-400',
    accent: 'bg-amber-500',
    light: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-100',
  },
  danger: { 
    icon: 'bg-red-50 text-red-500', 
    gradient: 'from-red-500 to-rose-400',
    accent: 'bg-red-500',
    light: 'bg-red-50',
    text: 'text-red-500',
    border: 'border-red-100',
  },
  info: { 
    icon: 'bg-sky-50 text-sky-600', 
    gradient: 'from-sky-500 to-blue-400',
    accent: 'bg-sky-500',
    light: 'bg-sky-50',
    text: 'text-sky-600',
    border: 'border-sky-100',
  },
  gray: { 
    icon: 'bg-gray-100 text-gray-500', 
    gradient: 'from-gray-400 to-gray-300',
    accent: 'bg-gray-400',
    light: 'bg-gray-50',
    text: 'text-gray-500',
    border: 'border-gray-100',
  },
};

export default function StatCard({
  title,
  value,
  icon,
  trend,
  trendLabel,
  color = 'primary',
  size = 'md',
  loading = false,
  onClick,
  className = '',
  gradient = false,
}) {
  const cfg = colorMap[color] || colorMap.primary;

  if (gradient) {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-br ${cfg.gradient} rounded-2xl p-5 shadow-md ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-200' : ''} ${className}`}
        onClick={onClick}
      >
        {/* Subtle top-right glow circle */}
        <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full" />
        <div className="absolute -right-2 -bottom-4 w-16 h-16 bg-white/5 rounded-full" />
        <p className="relative z-10 text-white/75 text-xs font-semibold uppercase tracking-wider mb-2">{title}</p>
        {loading ? (
          <div className="animate-pulse h-7 bg-white/25 rounded-lg w-28 mt-1" />
        ) : (
          <p className="relative z-10 font-bold text-white text-xl tracking-tight">{value}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm transition-all duration-200 p-5 ${onClick ? `cursor-pointer hover:shadow-md hover:-translate-y-0.5` : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
          {loading ? (
            <div className="animate-pulse h-8 bg-gray-100 rounded-lg w-20 mt-1" />
          ) : (
            <p className="font-bold text-gray-900 text-2xl tracking-tight leading-none">{value}</p>
          )}
          {trend !== undefined && !loading && (
            <div className={`flex items-center gap-1 mt-2 ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d={trend >= 0 ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' : 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'}
                />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-wide">
                {trend > 0 ? '+' : ''}{trend}% {trendLabel}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-xl ${cfg.icon} flex items-center justify-center flex-shrink-0 ml-3`}>
            <span className="w-5 h-5 block">{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}
