// Global tenant slug (set by TenantProvider in layout)
let _slug = null;
const _cache = new Map();

export function setTenantSlug(slug) {
  _slug = slug;
}

function apiFetch(url, options = {}) {
  options.credentials = 'include';
  let slug = _slug;
  
  // Fallback to URL path if slug not set (useful for first render/refresh)
  if (!slug && typeof window !== 'undefined') {
    const parts = window.location.pathname.split('/');
    if (parts[1] && parts[1] !== 'super-admin' && parts[1] !== 'api') {
      slug = parts[1];
    }
  }

  if (slug) {
    options.headers = { ...options.headers, 'x-tenant-slug': slug };
  }
  return fetch(url, options).then((r) => {
    if (!r.ok) {
      if (r.status === 401 && typeof window !== 'undefined' && !window.location.pathname.endsWith('/login')) {
        // Optional: redirect to login or handle unauthorized
      }
    }
    return r.json();
  });
}

function apiJSON(url, method, body) {
  return apiFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const api = {
  auth: {
    login: (credentials) => apiJSON('/api/auth', 'POST', credentials),
    logout: () => apiFetch('/api/auth', { method: 'DELETE' }),
    check: () => apiFetch('/api/auth'),
    updateProfile: (data) => apiJSON('/api/auth/profile', 'PUT', data),
  },
  students: {
    getAll: () => apiFetch('/api/students'),
    getById: (id) => apiFetch(`/api/students?id=${id}`),
    create: (data) => apiJSON('/api/students', 'POST', data),
    update: (id, data) => apiJSON(`/api/students?id=${id}`, 'PUT', data),
    delete: (id) => apiFetch(`/api/students?id=${id}`, { method: 'DELETE' }),
    markLicenseObtained: (id, licenseType, dateObtained) =>
      apiJSON(`/api/students?id=${id}`, 'PUT', { action: 'markLicenseObtained', licenseType, dateObtained }),
    updateFollowUp: (id, data) =>
      apiJSON(`/api/students?id=${id}`, 'PUT', { action: 'updateFollowUp', ...data }),
    updateImage: (id, field, imagePath) =>
      apiJSON(`/api/students?id=${id}`, 'PUT', { action: 'updateImage', field, imagePath }),
  },
  attendance: {
    scanIn: (studentId) => apiJSON('/api/attendance', 'POST', { action: 'scanIn', studentId }),
    scanOut: (studentId) => apiJSON('/api/attendance', 'POST', { action: 'scanOut', studentId }),
    getByStudent: (studentId) => apiFetch(`/api/attendance?studentId=${studentId}`),
    getToday: () => apiFetch('/api/attendance?action=today'),
    getStudentStatus: (studentId) => apiFetch(`/api/attendance?action=status&studentId=${studentId}`),
    cleanupDuplicates: () => apiJSON('/api/attendance', 'POST', { action: 'cleanup' }),
  },
  payments: {
    create: (data) => apiJSON('/api/payments', 'POST', data),
    getByStudent: (studentId) => apiFetch(`/api/payments?studentId=${studentId}`),
    getAll: () => apiFetch('/api/payments'),
    delete: (id) => apiFetch(`/api/payments?id=${id}`, { method: 'DELETE' }),
    generateReceipt: (paymentId) => apiFetch(`/api/payments/receipt?id=${paymentId}`, { method: 'POST' }),
  },
  paymentSchedules: {
    create: (studentId, schedules) =>
      apiJSON('/api/payment-schedules', 'POST', { studentId, schedules }),
    getByStudent: (studentId) => apiFetch(`/api/payment-schedules?studentId=${studentId}`),
    markPaid: (scheduleId, paymentId) =>
      apiJSON('/api/payment-schedules', 'POST', { action: 'markPaid', scheduleId, paymentId }),
    getOverdue: () => apiFetch('/api/payment-schedules?action=overdue'),
    getUpcoming: (days) => apiFetch(`/api/payment-schedules?action=upcoming&days=${days || 7}`),
  },
  stages: {
    create: (data) => apiJSON('/api/stages', 'POST', data),
    update: (id, data) => apiJSON(`/api/stages?id=${id}`, 'PUT', data),
    delete: (id) => apiFetch(`/api/stages?id=${id}`, { method: 'DELETE' }),
    getByStudent: (studentId) => apiFetch(`/api/stages?studentId=${studentId}`),
    getAll: () => apiFetch('/api/stages'),
    getToday: () => apiFetch('/api/stages?action=today'),
    getUpcoming: (days) => apiFetch(`/api/stages?action=upcoming&days=${days || 7}`),
    getSessionTimeStats: () => apiFetch('/api/stages?action=sessionTimeStats'),
    getStudentSessionTimeStats: (studentId) =>
      apiFetch(`/api/stages?action=studentSessionTimeStats&studentId=${studentId}`),
  },
  alerts: {
    getAll: () => apiFetch('/api/alerts'),
    getCounts: () => apiFetch('/api/alerts?action=counts'),
  },
  offers: {
    getAll: () => apiFetch('/api/offers'),
    create: (data) => apiJSON('/api/offers', 'POST', data),
    update: (id, data) => apiJSON(`/api/offers?id=${id}`, 'PUT', data),
    delete: (id) => apiFetch(`/api/offers?id=${id}`, { method: 'DELETE' }),
  },
  dashboard: {
    getStats: () => apiFetch('/api/dashboard'),
  },
  settings: {
    get: () => apiFetch('/api/settings'),
    update: (data) => apiJSON('/api/settings', 'PUT', data),
  },
  incidents: {
    create: (data) => apiJSON('/api/incidents', 'POST', data),
    getByStudent: (studentId) => apiFetch(`/api/incidents?studentId=${studentId}`),
    getAll: () => apiFetch('/api/incidents'),
    getUnresolved: () => apiFetch('/api/incidents?action=unresolved'),
    resolve: (id, notes) => apiJSON(`/api/incidents?id=${id}`, 'PUT', { notes }),
    delete: (id) => apiFetch(`/api/incidents?id=${id}`, { method: 'DELETE' }),
    getStudentCount: (studentId) => apiFetch(`/api/incidents?action=count&studentId=${studentId}`),
  },
  files: {
    upload: (file, subfolder) => {
      const form = new FormData();
      form.append('file', file);
      form.append('subfolder', subfolder || 'documents');
      const opts = { method: 'POST', body: form, credentials: 'include' };
      if (_slug) opts.headers = { 'x-tenant-slug': _slug };
      return fetch('/api/files', opts).then((r) => r.json());
    },
    getBase64: async (path) => {
      if (!path) return null;
      if (_cache.has(path)) return _cache.get(path);
      if (path.startsWith('http')) { _cache.set(path, path); return path; }
      const data = await apiFetch(`/api/files?path=${encodeURIComponent(path)}`)
        .then((r) => r?.data || null)
        .catch(() => null);
      if (data) _cache.set(path, data);
      return data;
    },
    clearCache: (path) => { path ? _cache.delete(path) : _cache.clear(); },
    deleteFile: (path) => apiFetch(`/api/files?path=${encodeURIComponent(path)}`, { method: 'DELETE' }),
  },
  invoices: {
    create: (data) => apiJSON('/api/invoices', 'POST', data),
    getById: (id) => apiFetch(`/api/invoices?id=${id}`),
    getByStudent: (studentId) => apiFetch(`/api/invoices?studentId=${studentId}`),
    getAll: () => apiFetch('/api/invoices'),
    updateStatus: (id, status) => apiJSON(`/api/invoices?id=${id}`, 'PUT', { status }),
    delete: (id) => apiFetch(`/api/invoices?id=${id}`, { method: 'DELETE' }),
  },
  documents: {
    create: (data) => apiJSON('/api/documents', 'POST', data),
    getByStudent: (studentId) => apiFetch(`/api/documents?studentId=${studentId}`),
    getById: (id) => apiFetch(`/api/documents?id=${id}`),
    getAll: () => apiFetch('/api/documents'),
    delete: (id) => apiFetch(`/api/documents?id=${id}`, { method: 'DELETE' }),
  },
  contracts: {
    generate: (studentId, overrideData) =>
      apiJSON('/api/contracts', 'POST', { studentId, overrideData }),
  },
  demande15: {
    generate: (studentId, overrideData) =>
      apiJSON('/api/demande15', 'POST', { studentId, overrideData }),
  },
  contratAvancement: {
    generate: (studentId, overrideData) =>
      apiJSON('/api/contrat-avancement', 'POST', { studentId, overrideData }),
  },
  expenses: {
    getAll: () => apiFetch('/api/expenses'),
    getStats: () => apiFetch('/api/expenses?stats=1'),
    create: (data) => apiJSON('/api/expenses', 'POST', data),
    delete: (id) => apiFetch(`/api/expenses?id=${id}`, { method: 'DELETE' }),
  },
  // Super-admin
  superAdmin: {
    getDashboard: () => apiFetch('/api/super-admin/dashboard'),
    getEcoles: () => apiFetch('/api/super-admin/ecoles'),
    createEcole: (data) => apiJSON('/api/super-admin/ecoles', 'POST', data),
    getEcole: (slug) => apiFetch(`/api/ecoles/${slug}`),
    updateEcole: (slug, data) => apiJSON(`/api/ecoles/${slug}`, 'PUT', data),
    deleteEcole: (slug) => apiFetch(`/api/ecoles/${slug}`, { method: 'DELETE' }),
    getAdmins: (autoEcoleId) => apiFetch(`/api/super-admin/admins?autoEcoleId=${autoEcoleId}`),
    createAdmin: (data) => apiJSON('/api/super-admin/admins', 'POST', data),
    updateAdminPassword: (id, password) =>
      apiJSON(`/api/super-admin/admins?id=${id}`, 'PUT', { password }),
    deleteAdmin: (id) => apiFetch(`/api/super-admin/admins?id=${id}`, { method: 'DELETE' }),
  },
};

export default api;
