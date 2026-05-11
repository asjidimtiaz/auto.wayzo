'use client';

const colorMap = {
  primary: {
    icon:   'bg-blue-50 text-blue-600',
    badge:  'bg-blue-100 text-blue-700',
    accent: '#2563eb',
  },
  success: {
    icon:   'bg-emerald-50 text-emerald-600',
    badge:  'bg-emerald-100 text-emerald-700',
    accent: '#059669',
  },
  warning: {
    icon:   'bg-amber-50 text-amber-600',
    badge:  'bg-amber-100 text-amber-700',
    accent: '#d97706',
  },
  danger: {
    icon:   'bg-red-50 text-red-500',
    badge:  'bg-red-100 text-red-600',
    accent: '#dc2626',
  },
  info: {
    icon:   'bg-sky-50 text-sky-600',
    badge:  'bg-sky-100 text-sky-700',
    accent: '#0284c7',
  },
  gray: {
    icon:   'bg-gray-100 text-gray-500',
    badge:  'bg-gray-100 text-gray-600',
    accent: '#64748b',
  },
};

const gradientMap = {
  success: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  danger:  'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
  primary: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
  warning: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
  info:    'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
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
    const bg = gradientMap[color] || gradientMap.primary;
    return (
      <div
        style={{ background: bg }}
        className={`relative overflow-hidden rounded-2xl p-5 ${onClick ? 'cursor-pointer' : ''} ${className}`}
        onClick={onClick}
      >
        {/* Decorative circles */}
        <div className="absolute -right-5 -top-5 w-24 h-24 rounded-full bg-white/10" />
        <div className="absolute right-4 bottom-[-16px] w-14 h-14 rounded-full bg-white/8" />

        <p className="relative z-10 text-white/70 text-[11px] font-bold uppercase tracking-widest mb-2.5">
          {title}
        </p>
        {loading ? (
          <div className="animate-pulse h-7 bg-white/25 rounded-lg w-28 mt-1" />
        ) : (
          <p className="relative z-10 text-white text-2xl font-bold tracking-tight leading-none">
            {value}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #eef1f7',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 1px 4px rgba(15,23,42,0.05), 0 0 0 1px rgba(15,23,42,0.04)',
        transition: 'all 0.2s ease',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(15,23,42,0.1)'; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,0.05), 0 0 0 1px rgba(15,23,42,0.04)'; }}
      onClick={onClick}
      className={className}
    >
      {/* Left accent bar */}
      <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', borderRadius: '0 3px 3px 0', background: cfg.accent }} />

      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1 pl-1">
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: '8px' }}>
            {title}
          </p>
          {loading ? (
            <div className="animate-pulse h-8 bg-gray-100 rounded-lg w-20" />
          ) : (
            <p style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {value}
            </p>
          )}
          {trend !== undefined && !loading && (
            <div className={`flex items-center gap-1 mt-2 ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d={trend >= 0 ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' : 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'}
                />
              </svg>
              <span style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {trend > 0 ? '+' : ''}{trend}% {trendLabel}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, marginLeft: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            className={cfg.icon}>
            <span className="w-5 h-5 block">{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}
