'use client';

const paddingMap = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' };
const borderColorMap = {
  gray:    'border-l-4 border-dark-muted/30',
  primary: 'border-l-4 border-primary-500',
  success: 'border-l-4 border-accent-green',
  warning: 'border-l-4 border-accent-yellow',
  danger:  'border-l-4 border-accent-red',
  info:    'border-l-4 border-accent-blue',
};

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
  return (
    <div
      className={`
        relative overflow-hidden
        rounded-[2.5rem] transition-all duration-300 ease-out
        ${glass 
          ? 'bg-white/70 backdrop-blur-xl border border-white/40 shadow-glass' 
          : 'bg-white shadow-soft border border-surface-100'}
        ${paddingMap[padding]}
        ${interactive ? 'hover:-translate-y-1 hover:shadow-card-hover hover:border-primary-200/50' : ''}
        ${hover ? 'hover:shadow-card-hover transition-shadow cursor-pointer' : ''}
        ${border ? borderColorMap[borderColor] : ''}
        ${accent ? `border-t-4 ${borderColorMap[borderColor].replace('border-l-4', '')}` : ''}
        ${className}
      `}
    >
      {accent && (
        <div className={`absolute top-0 left-0 w-full h-1 opacity-20 bg-current ${borderColorMap[borderColor].replace('border-l-4 border-', 'bg-')}`} />
      )}
      
      {(title || actions) && (
        <div className={`flex items-center justify-between ${padding !== 'none' ? 'mb-5' : 'p-6 border-b border-surface-100'}`}>
          <div className="flex items-center gap-4">
            {icon && (
              <div className="w-10 h-10 rounded-2xl bg-surface-50 flex items-center justify-center text-primary-500 shadow-sm border border-surface-100">
                {icon}
              </div>
            )}
            <div>
              {title && <h3 className="text-lg font-bold text-dark tracking-tight leading-tight">{title}</h3>}
              {subtitle && <p className="text-xs font-medium text-dark-muted mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="relative z-10">{children}</div>
      {footer && (
        <div className={`${padding !== 'none' ? 'mt-5 pt-5' : 'p-6'} border-t border-surface-100`}>
          {footer}
        </div>
      )}
    </div>
  );
}

Card.Header = function CardHeader({ children, title, action, className = '' }) {
  if (title || action) {
    return (
      <div className={`pb-4 border-b border-surface-200 mb-4 flex items-center justify-between ${className}`}>
        {typeof title === 'string' ? (
          <h3 className="text-lg font-semibold text-dark">{title}</h3>
        ) : title}
        {action && <div>{action}</div>}
      </div>
    );
  }
  return (
    <div className={`pb-4 border-b border-surface-200 mb-4 ${className}`}>
      {children}
    </div>
  );
};

Card.Body = function CardBody({ children, className = '' }) {
  return <div className={className}>{children}</div>;
};

Card.Footer = function CardFooter({ children, className = '' }) {
  return (
    <div className={`pt-4 border-t border-surface-200 mt-4 ${className}`}>
      {children}
    </div>
  );
};

export default Card;
