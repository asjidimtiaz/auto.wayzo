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
  const borderColorClass = {
    gray:    'border-l-4 border-gray-200',
    primary: 'border-l-4 border-blue-500',
    success: 'border-l-4 border-emerald-500',
    warning: 'border-l-4 border-amber-400',
    danger:  'border-l-4 border-red-400',
    info:    'border-l-4 border-sky-400',
  }[borderColor] || 'border-l-4 border-gray-200';

  return (
    <div
      className={`
        relative overflow-hidden
        rounded-2xl transition-all duration-200
        ${glass
          ? 'bg-white/80 backdrop-blur-lg border border-white/50 shadow-md'
          : 'bg-white shadow-sm border border-gray-100'}
        ${paddingMap[padding]}
        ${interactive ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : ''}
        ${hover ? 'hover:shadow-md cursor-pointer' : ''}
        ${border ? borderColorClass : ''}
        ${className}
      `}
    >
      {(title || actions) && (
        <div className={`flex items-center justify-between ${padding !== 'none' ? 'mb-4' : 'p-5 border-b border-gray-100'}`}>
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-blue-600 border border-gray-100">
                {icon}
              </div>
            )}
            <div>
              {title && <h3 className="text-base font-semibold text-gray-900 leading-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="relative z-10">{children}</div>
      {footer && (
        <div className={`${padding !== 'none' ? 'mt-4 pt-4' : 'p-5'} border-t border-gray-100`}>
          {footer}
        </div>
      )}
    </div>
  );
}

Card.Header = function CardHeader({ children, title, action, className = '' }) {
  if (title || action) {
    return (
      <div className={`pb-4 border-b border-gray-100 mb-4 flex items-center justify-between ${className}`}>
        {typeof title === 'string' ? (
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        ) : title}
        {action && <div>{action}</div>}
      </div>
    );
  }
  return (
    <div className={`pb-4 border-b border-gray-100 mb-4 ${className}`}>
      {children}
    </div>
  );
};

Card.Body = function CardBody({ children, className = '' }) {
  return <div className={className}>{children}</div>;
};

Card.Footer = function CardFooter({ children, className = '' }) {
  return (
    <div className={`pt-4 border-t border-gray-100 mt-4 ${className}`}>
      {children}
    </div>
  );
};

export default Card;
