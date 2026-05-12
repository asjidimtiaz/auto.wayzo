'use client';

const paddingMap = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };

function Card({
  children,
  title,
  subtitle,
  icon,
  actions,
  footer,
  padding = 'md',
  hover = false,
  interactive = false,
  glass = false,
  border = false,
  borderColor = 'gray',
  accent = false,
  className = '',
}) {
  const accentColors = {
    gray:    '#94a3b8',
    primary: '#2563eb',
    success: '#059669',
    warning: '#d97706',
    danger:  '#dc2626',
    info:    '#0284c7',
  };
  const accentColor = accentColors[borderColor] || accentColors.gray;

  return (
    <div
      className={`
        relative overflow-hidden
        transition-all duration-200
        ${glass
          ? 'bg-white/80 backdrop-blur-lg border border-white/50'
          : 'bg-white border'}
        ${paddingMap[padding]}
        ${interactive ? 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer' : ''}
        ${hover ? 'hover:shadow-md cursor-pointer' : ''}
        ${className}
      `}
      style={{
        borderRadius: '14px',
        borderColor: '#e8edf6',
        boxShadow: '0 1px 3px rgba(13,27,46,0.06), 0 1px 2px rgba(13,27,46,0.04)',
      }}
    >
      {/* Top accent bar when border prop enabled */}
      {border && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}44 100%)`,
          borderRadius: '14px 14px 0 0',
        }} />
      )}

      {(title || actions) && (
        <div className={`flex items-center justify-between ${padding !== 'none' ? 'mb-4' : 'p-5 border-b'}`} style={padding === 'none' ? {borderColor:'#e8edf6'} : {}}>
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:'#dbeafe', color:'#2563eb'}}>
                {icon}
              </div>
            )}
            <div>
              {title && <h3 className="text-sm font-semibold leading-tight" style={{color:'#0d1b2e'}}>{title}</h3>}
              {subtitle && <p className="text-xs mt-0.5" style={{color:'#7f93ae'}}>{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="relative z-10">{children}</div>
      {footer && (
        <div className={`${padding !== 'none' ? 'mt-4 pt-4' : 'p-5'} border-t`} style={{borderColor:'#e8edf6'}}>
          {footer}
        </div>
      )}
    </div>
  );
}

Card.Header = function CardHeader({ children, title, action, className = '' }) {
  if (title || action) {
    return (
      <div className={`pb-4 mb-4 flex items-center justify-between border-b ${className}`} style={{borderColor:'#e8edf6'}}>
        {typeof title === 'string' ? (
          <h3 className="text-sm font-semibold" style={{color:'#0d1b2e'}}>{title}</h3>
        ) : title}
        {action && <div>{action}</div>}
      </div>
    );
  }
  return (
    <div className={`pb-4 mb-4 border-b ${className}`} style={{borderColor:'#e8edf6'}}>
      {children}
    </div>
  );
};

Card.Body = function CardBody({ children, className = '' }) {
  return <div className={className}>{children}</div>;
};

Card.Footer = function CardFooter({ children, className = '' }) {
  return (
    <div className={`pt-4 mt-4 border-t ${className}`} style={{borderColor:'#e8edf6'}}>
      {children}
    </div>
  );
};

export default Card;
