'use client';

const variants = {
  primary:   'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700',
  secondary: 'bg-white text-slate-600 border-[#e4e8f0] hover:bg-[#f8fafd] hover:border-[#c8d0e0]',
  success:   'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700',
  danger:    'bg-red-600 text-white border-red-600 hover:bg-red-700',
  warning:   'bg-amber-500 text-white border-amber-500 hover:bg-amber-600',
  ghost:     'bg-transparent text-slate-500 border-transparent hover:bg-slate-100',
};

const shadows = {
  primary:   'hover:shadow-[0_4px_12px_rgba(37,99,235,0.3)]',
  secondary: '',
  success:   'hover:shadow-[0_4px_12px_rgba(5,150,105,0.28)]',
  danger:    'hover:shadow-[0_4px_12px_rgba(220,38,38,0.25)]',
  warning:   '',
  ghost:     '',
};

const sizes = {
  xs: 'h-7 px-2.5 text-xs rounded-lg',
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-[38px] px-4 text-[13.5px] rounded-xl',
  lg: 'h-11 px-5 text-sm rounded-xl',
  xl: 'h-12 px-6 text-base rounded-xl',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 border focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${shadows[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Chargement...
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="mr-1.5 flex items-center">{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span className="ml-1.5 flex items-center">{icon}</span>}
        </>
      )}
    </button>
  );
}
