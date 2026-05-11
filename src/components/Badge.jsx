'use client';

const variantStyles = {
  success: 'bg-[#dcfce7] text-[#16a34a]',
  warning: 'bg-[#fef9c3] text-[#b45309]',
  danger:  'bg-[#fee2e2] text-[#dc2626]',
  info:    'bg-[#dbeafe] text-[#1d4ed8]',
  gray:    'bg-[#f1f5f9] text-[#64748b]',
  primary: 'bg-[#dbeafe] text-[#1d4ed8]',
  purple:  'bg-[#ede9fe] text-[#7c3aed]',
  orange:  'bg-[#ffedd5] text-[#c2410c]',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[10.5px]',
  md: 'px-2.5 py-0.5 text-[11.5px]',
  lg: 'px-3 py-1 text-xs',
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
    <span className={`inline-flex items-center font-semibold rounded-md ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
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
