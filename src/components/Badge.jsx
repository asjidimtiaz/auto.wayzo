'use client';

const variantStyles = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  danger:  'bg-red-50 text-red-600 border-red-100',
  info:    'bg-blue-50 text-blue-700 border-blue-100',
  gray:    'bg-gray-100 text-gray-500 border-gray-200',
  primary: 'bg-blue-50 text-blue-700 border-blue-100',
  purple:  'bg-violet-50 text-violet-700 border-violet-100',
  orange:  'bg-orange-50 text-orange-700 border-orange-100',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

const dotColors = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger:  'bg-red-500',
  info:    'bg-blue-500',
};

export default function Badge({
  children,
  variant = 'gray',
  size = 'md',
  dot = false,
  removable = false,
  onRemove,
  className = '',
}) {
  return (
    <span className={`inline-flex items-center font-medium rounded-lg border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColors[variant] || 'bg-gray-400'}`} />
      )}
      {children}
      {removable && (
        <button onClick={onRemove} className="ml-1.5 -mr-0.5 hover:bg-black/10 rounded-md p-0.5">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}
