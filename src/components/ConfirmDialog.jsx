'use client';
import Button from './Button';

const typeConfig = {
  default: { iconBg: 'bg-blue-50', iconColor: 'text-blue-600', confirmVariant: 'primary' },
  danger:  { iconBg: 'bg-red-50',  iconColor: 'text-red-500',  confirmVariant: 'danger' },
  warning: { iconBg: 'bg-amber-50', iconColor: 'text-amber-500', confirmVariant: 'warning' },
};

const defaultIcons = {
  default: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  danger: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

export default function ConfirmDialog({
  isOpen, onClose, onConfirm, title = 'Confirmer',
  message = 'Êtes-vous sûr de vouloir continuer ?',
  confirmText = 'Confirmer', cancelText = 'Annuler',
  type = 'default', loading = false, icon,
}) {
  if (!isOpen) return null;
  const cfg = typeConfig[type];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white max-w-sm w-full p-6 animate-[modalIn_0.22s_cubic-bezier(0.16,1,0.3,1)]"
          style={{ borderRadius: 20, boxShadow: '0 20px 60px rgba(10,18,40,0.18)', border: '1px solid #eef1f7' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${cfg.iconBg} ${cfg.iconColor} flex items-center justify-center`}>
              {icon || defaultIcons[type]}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-[#0f172a] mb-1">{title}</h3>
              <p className="text-sm text-[#64748b]">{message}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2.5 mt-5">
            <Button variant="secondary" onClick={onClose} disabled={loading}>{cancelText}</Button>
            <Button variant={cfg.confirmVariant} onClick={onConfirm} loading={loading}>{confirmText}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
