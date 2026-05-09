'use client';

const colorMap = {
  primary: { icon: 'bg-primary-500/10 text-primary-500', gradient: 'from-primary-500 to-primary-400' },
  success: { icon: 'bg-accent-green/10 text-accent-green', gradient: 'from-accent-green to-teal-300' },
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

  const glowClass = {
    primary: 'hover:shadow-primary-500/20',
    success: 'hover:shadow-accent-green/20',
    warning: 'hover:shadow-accent-yellow/20',
    danger:  'hover:shadow-accent-red/20',
    info:    'hover:shadow-accent-blue/20',
    gray:    'hover:shadow-gray-400/20',
  }[color];

  if (gradient) {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-br ${cfg.gradient} rounded-[2rem] ${sz.padding} shadow-lg ${onClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-xl transition-all duration-300' : ''} ${className}`}
        onClick={onClick}
      >
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
        <p className={`relative z-10 text-white/80 font-bold uppercase tracking-wider ${sz.title}`}>{title}</p>
        {loading ? (
          <div className="animate-pulse h-8 bg-white/20 rounded-xl w-24 mt-2" />
        ) : (
          <p className={`relative z-10 font-black text-white mt-1 tracking-tight ${sz.value}`}>{value}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-white rounded-[2rem] border border-surface-100 shadow-soft transition-all duration-300 ${sz.padding} ${onClick ? `cursor-pointer hover:-translate-y-1 hover:shadow-xl ${glowClass}` : ''} ${className}`}
      onClick={onClick}
    >
      <div className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full opacity-[0.03] ${cfg.icon.split(' ')[0]}`} />
      
      <div className="flex items-center justify-between relative z-10">
        <div className="min-w-0">
          <p className={`text-dark-muted font-bold uppercase tracking-wider ${sz.title}`}>{title}</p>
          {loading ? (
            <div className="animate-pulse h-9 bg-surface-100 rounded-xl w-20 mt-2" />
          ) : (
            <p className={`font-black text-dark mt-1 tracking-tight ${sz.value}`}>{value}</p>
          )}
          {trend !== undefined && (
            <div className={`flex items-center gap-1.5 mt-2.5 px-2 py-0.5 rounded-full w-fit ${trend > 0 ? 'bg-accent-green/10 text-accent-green' : trend < 0 ? 'bg-accent-red/10 text-accent-red' : 'bg-surface-100 text-dark-muted'}`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3}
                  d={trend >= 0 ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' : 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'}
                />
              </svg>
              <span className="text-[10px] font-black uppercase">
                {trend > 0 ? '+' : ''}{trend}% {trendLabel}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`${sz.icon} rounded-3xl ${cfg.icon} flex items-center justify-center flex-shrink-0 ml-4 shadow-inner border border-white/50`}>
            <span className={sz.iconInner}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}
