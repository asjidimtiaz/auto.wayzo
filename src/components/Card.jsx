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
  border = false,
  borderColor = 'gray',
  className = '',
}) {
  return (
    <div
      className={`
        bg-white rounded-2xl shadow-soft
        ${paddingMap[padding]}
        ${hover ? 'hover:shadow-card-hover transition-shadow cursor-pointer' : ''}
        ${border ? borderColorMap[borderColor] : ''}
        ${className}
      `}
    >
      {(title || actions) && (
        <div className={`flex items-center justify-between ${padding !== 'none' ? 'mb-4' : 'p-4 border-b border-surface-200'}`}>
          <div className="flex items-center">
            {icon && <span className="mr-3 text-dark-muted">{icon}</span>}
            <div>
              {title && <h3 className="text-lg font-semibold text-dark">{title}</h3>}
              {subtitle && <p className="text-sm text-dark-muted">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div>{children}</div>
      {footer && (
        <div className={`${padding !== 'none' ? 'mt-4 pt-4' : 'p-4'} border-t border-surface-200`}>
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
