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
  const borderAccentClass = {
    gray:    'border-l-[3px] border-l-gray-300',
    primary: 'border-l-[3px] border-l-blue-500',
    success: 'border-l-[3px] border-l-emerald-500',
    warning: 'border-l-[3px] border-l-amber-400',
    danger:  'border-l-[3px] border-l-red-400',
    info:    'border-l-[3px] border-l-sky-400',
  }[borderColor] || 'border-l-[3px] border-l-gray-300';

  return (
    <div
      className={`
        relative overflow-hidden
        transition-all duration-200
        ${glass
          ? 'bg-white/80 backdrop-blur-lg border border-white/50'
          : 'bg-white border border-[#eef1f7]'}
        rounded-2xl
        ${paddingMap[padding]}
        ${interactive ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : ''}
        ${hover ? 'hover:shadow-md cursor-pointer' : ''}
        ${border ? borderAccentClass : ''}
        ${className}
      `}
      style={{
        boxShadow: '0 1px 4px rgba(15,23,42,0.05), 0 0 0 1px rgba(15,23,42,0.04)',
      }}
    >
      {(title || actions) && (
        <div className={`flex items-center justify-between ${padding !== 'none' ? 'mb-4' : 'p-5 border-b border-[#eef1f7]'}`}>
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                {icon}
              </div>
            )}
            <div>
              {title && <h3 className="text-sm font-semibold text-gray-900 leading-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="relative z-10">{children}</div>
      {footer && (
        <div className={`${padding !== 'none' ? 'mt-4 pt-4' : 'p-5'} border-t border-[#eef1f7]`}>
          {footer}
        </div>
      )}
    </div>
  );
}

Card.Header = function CardHeader({ children, title, action, className = '' }) {
  if (title || action) {
    return (
      <div className={`pb-4 border-b border-[#eef1f7] mb-4 flex items-center justify-between ${className}`}>
        {typeof title === 'string' ? (
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        ) : title}
        {action && <div>{action}</div>}
      </div>
    );
  }
  return (
    <div className={`pb-4 border-b border-[#eef1f7] mb-4 ${className}`}>
      {children}
    </div>
  );
};

Card.Body = function CardBody({ children, className = '' }) {
  return <div className={className}>{children}</div>;
};

Card.Footer = function CardFooter({ children, className = '' }) {
  return (
    <div className={`pt-4 border-t border-[#eef1f7] mt-4 ${className}`}>
      {children}
    </div>
  );
};

export default Card;
