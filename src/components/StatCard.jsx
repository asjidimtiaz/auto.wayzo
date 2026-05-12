'use client';

const colorMap = {
  primary: {
    icon:     'bg-blue-50 text-blue-600',
    accent:   '#2563eb',
    ring:     'rgba(37,99,235,0.1)',
    badge:    'bg-blue-100 text-blue-700',
  },
  success: {
    icon:     'bg-emerald-50 text-emerald-600',
    accent:   '#059669',
    ring:     'rgba(5,150,105,0.1)',
    badge:    'bg-emerald-100 text-emerald-700',
  },
  warning: {
    icon:     'bg-amber-50 text-amber-600',
    accent:   '#d97706',
    ring:     'rgba(217,119,6,0.1)',
    badge:    'bg-amber-100 text-amber-700',
  },
  danger: {
    icon:     'bg-red-50 text-red-500',
    accent:   '#dc2626',
    ring:     'rgba(220,38,38,0.1)',
    badge:    'bg-red-100 text-red-600',
  },
  info: {
    icon:     'bg-sky-50 text-sky-600',
    accent:   '#0284c7',
    ring:     'rgba(2,132,199,0.1)',
    badge:    'bg-sky-100 text-sky-700',
  },
  gray: {
    icon:     'bg-gray-100 text-gray-500',
    accent:   '#64748b',
    ring:     'rgba(100,116,139,0.1)',
    badge:    'bg-gray-100 text-gray-600',
  },
};

const gradientMap = {
  success: { from: '#047857', to: '#10b981', shadow: 'rgba(5,150,105,0.28)' },
  danger:  { from: '#b91c1c', to: '#ef4444', shadow: 'rgba(220,38,38,0.28)' },
  primary: { from: '#1a47be', to: '#3b82f6', shadow: 'rgba(37,99,235,0.28)' },
  warning: { from: '#b45309', to: '#f59e0b', shadow: 'rgba(217,119,6,0.28)' },
  info:    { from: '#0369a1', to: '#38bdf8', shadow: 'rgba(2,132,199,0.28)' },
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
        style={{
          background: `linear-gradient(135deg, ${bg.from} 0%, ${bg.to} 100%)`,
          borderRadius: '14px',
          padding: '22px 24px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: `0 4px 20px ${bg.shadow}, 0 1px 4px rgba(0,0,0,0.1)`,
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
        }}
        className={className}
        onClick={onClick}
      >
        <div style={{ position:'absolute', right:-20, top:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.1)' }} />
        <div style={{ position:'absolute', right:20, bottom:-28, width:70, height:70, borderRadius:'50%', background:'rgba(255,255,255,0.07)' }} />
        <div style={{ position:'absolute', left:-10, bottom:10, width:50, height:50, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />

        <p style={{ position:'relative', zIndex:1, color:'rgba(255,255,255,0.75)', fontSize:'10.5px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'10px' }}>
          {title}
        </p>

        {loading ? (
          <div style={{ height:32, borderRadius:8, width:120, background:'rgba(255,255,255,0.2)' }} className="animate-pulse" />
        ) : (
          <p style={{ position:'relative', zIndex:1, color:'#ffffff', fontSize:'28px', fontWeight:800, letterSpacing:'-0.03em', lineHeight:1 }}>
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
        border: '1px solid #e8edf6',
        borderRadius: '14px',
        padding: '20px 22px',
        boxShadow: '0 1px 3px rgba(13,27,46,0.06), 0 1px 2px rgba(13,27,46,0.04)',
        transition: 'all 0.2s ease',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(13,27,46,0.1)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(13,27,46,0.06), 0 1px 2px rgba(13,27,46,0.04)';
      }}
      onClick={onClick}
      className={className}
    >
      {/* Top accent bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px', background:`linear-gradient(90deg, ${cfg.accent} 0%, ${cfg.accent}44 100%)`, borderRadius:'14px 14px 0 0' }} />

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', paddingTop:'4px' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:'10.5px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'#7f93ae', marginBottom:'10px' }}>
            {title}
          </p>
          {loading ? (
            <div style={{ height:34, borderRadius:8, width:80, background:'#f1f4f9' }} className="animate-pulse" />
          ) : (
            <p style={{ fontSize:'30px', fontWeight:800, color:'#0d1b2e', lineHeight:1, letterSpacing:'-0.03em' }}>
              {value}
            </p>
          )}
          {trend !== undefined && !loading && (
            <div style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:8, padding:'3px 8px', borderRadius:6, background: trend >= 0 ? '#dcfce7' : '#fee2e2', color: trend >= 0 ? '#15803d' : '#dc2626' }}>
              <svg style={{ width:11, height:11 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={trend >= 0 ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' : 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'} />
              </svg>
              <span style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.03em' }}>
                {trend > 0 ? '+' : ''}{trend}% {trendLabel}
              </span>
            </div>
          )}
        </div>

        {icon && (
          <div
            style={{ width:44, height:44, borderRadius:12, flexShrink:0, marginLeft:14, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 0 6px ${cfg.ring}` }}
            className={cfg.icon}
          >
            <span style={{ width:22, height:22, display:'block' }}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}
