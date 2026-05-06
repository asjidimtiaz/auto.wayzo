function validateData(data, schema) {
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    if (rules.required && (value === null || value === undefined || value === '')) {
      errors[field] = `${field} est requis`;
      continue;
    }
    if (value !== null && value !== undefined && value !== '') {
      if (rules.type === 'number') {
        const num = Number(value);
        if (isNaN(num)) { errors[field] = `${field} doit être un nombre`; continue; }
        if (rules.min !== undefined && num < rules.min) errors[field] = `${field} doit être ≥ ${rules.min}`;
        if (rules.max !== undefined && num > rules.max) errors[field] = `${field} doit être ≤ ${rules.max}`;
      }
      if (rules.type === 'string') {
        const str = String(value);
        if (rules.minLength && str.length < rules.minLength) errors[field] = `${field} doit avoir au moins ${rules.minLength} caractères`;
        if (rules.maxLength && str.length > rules.maxLength) errors[field] = `${field} trop long (max ${rules.maxLength})`;
      }
      if (rules.enum && !rules.enum.includes(value)) errors[field] = `${field} invalide`;
    }
  }
  return { errors, valid: Object.keys(errors).length === 0 };
}

function parsePositiveInt(val) {
  if (!val) return null;
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

module.exports = { validateData, parsePositiveInt };
