// Date formatting
export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Today's date as YYYY-MM-DD
export function today() {
  return new Date().toISOString().split('T')[0];
}

// Format currency in MAD
export function formatCurrency(value) {
  if (value == null) return '0 MAD';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return '0 MAD';
  return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n) + ' MAD';
}

// Days remaining from a date
export function daysRemaining(startDate, durationDays) {
  if (!startDate || !durationDays) return null;
  const end = new Date(new Date(startDate));
  end.setDate(end.getDate() + durationDays);
  return Math.ceil((end - new Date()) / 86400000);
}

// Status → badge variant
export function statusToBadgeVariant(status) {
  return ({
    'En formation':  'info',
    'Permis obtenu': 'success',
    'Inactif':       'gray',
    'Présent':       'success',
    'Sorti':         'warning',
    'En cours':      'info',
    'Terminé':       'success',
  })[status] || 'gray';
}

// Format minutes as "Xh Ymin"
export function formatDuration(minutes) {
  if (!minutes) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// License type options
export const LICENSE_TYPES = [
  { value: 'A', label: 'Permis A (Moto)' },
  { value: 'B', label: 'Permis B (Voiture)' },
  { value: 'C', label: 'Permis C (Camion)' },
  { value: 'D', label: 'Permis D (Bus)' },
  { value: 'E', label: 'Permis E' },
];

// Student status options
export const STUDENT_STATUSES = [
  { value: 'En formation',  label: 'En formation' },
  { value: 'Permis obtenu', label: 'Permis obtenu' },
  { value: 'Inactif',       label: 'Inactif' },
];

// Payment method options
export const PAYMENT_METHODS = [
  { value: 'Cash',     label: 'Espèces' },
  { value: 'Transfer', label: 'Virement' },
  { value: 'Cheque',   label: 'Chèque' },
  { value: 'TPE',      label: 'TPE' },
];
