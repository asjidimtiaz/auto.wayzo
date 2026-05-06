'use client';

const colorMap = {
  primary: { icon: 'bg-primary-500/10 text-primary-500', gradient: 'from-primary-500 to-primary-400' },
  success: { icon: 'bg-accent-green/10 text-accent-green', gradient: 'from-accent-green to-emerald-300' },
  warning: { icon: 'bg-accent-yellow/10 text-accent-yellow', gradient: 'from-accent-yellow to-amber-300' },
  danger:  { icon: 'bg-accent-red/10 text-accent-red', gradient: 'from-accent-red to-red-300' },
  info:    { icon: 'bg-accent-blue/10 text-accent-blue', gradient: 'from-accent-blue to-blue-300' },
  gray:    { icon: 'bg-dark-muted/10 text-dark-muted', gradient: 'from-gray-400 to-gray-300' },
};

const sizeMap = {
  sm: { padding: 'p-4', icon: 'w-10 h-10', iconInner: 'w-5 h-5', value: 'text-xl',  title: 'text-xs' },
  md: { padding: 'p-5', icon: 'w-11 h-11', iconInner: 'w-5 h-5', value: 'text-2xl', title: 'text-sm' },
  lg: { padding: 'p-6', icon: 'w-14 h-14', iconInner: 'w-7 h-7', value: 'text-3xl', title: 'text-base' },
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
  const sz = sizeMap[size] || sizeMap.md;

  if (gradient) {
    return (
      <div
        className={`bg-gradient-to-br ${cfg.gradient} rounded-2xl ${sz.padding} shadow-card ${onClick ? 'cursor-pointer hover:shadow-card-hover transition-shadow' : ''} ${className}`}
        onClick={onClick}
      >
        <p className={`text-white/80 font-medium ${sz.title}`}>{title}</p>
        {loading ? (
          <div className="animate-pulse h-8 bg-white/20 rounded w-20 mt-2" />
        ) : (
          <p className={`font-bold text-white mt-1 ${sz.value}`}>{value}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-2xl shadow-soft ${sz.padding} ${onClick ? 'cursor-pointer hover:shadow-card-hover transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className={`text-dark-muted font-medium ${sz.title}`}>{title}</p>
          {loading ? (
            <div className="animate-pulse h-8 bg-surface-200 rounded w-16 mt-1" />
          ) : (
            <p className={`font-bold text-dark mt-1 ${sz.value}`}>{value}</p>
          )}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 ${trend > 0 ? 'text-accent-green' : trend < 0 ? 'text-accent-red' : 'text-dark-muted'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={trend >= 0 ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' : 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'}
                />
              </svg>
              <span className="text-xs font-medium">
                {trend > 0 ? '+' : ''}{trend}% {trendLabel}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`${sz.icon} rounded-2xl ${cfg.icon} flex items-center justify-center flex-shrink-0 ml-4`}>
            <span className={sz.iconInner}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}
