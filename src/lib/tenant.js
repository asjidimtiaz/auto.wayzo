const { isAuthenticated } = require('./auth');
const db = require('./db');

const tenantCache = new Map();
const tenantCacheTtlMs = 5 * 60 * 1000;

async function getCachedAutoEcoleBySlug(slug) {
  const key = String(slug || '').trim();
  if (!key) return null;

  const cached = tenantCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise || cached.value;
  }

  const promise = db.getAutoEcoleBySlug(key)
    .then((value) => {
      tenantCache.set(key, { value, expiresAt: Date.now() + tenantCacheTtlMs });
      return value;
    })
    .catch((err) => {
      tenantCache.delete(key);
      throw err;
    });

  tenantCache.set(key, { promise, expiresAt: Date.now() + tenantCacheTtlMs });
  return promise;
}

function getTenantContext(req) {
  const user = isAuthenticated(req);
  if (!user) return null;
  return {
    userId: user.id,
    username: user.username,
    role: user.role,
    autoEcoleId: user.auto_ecole_id,
    slug: user.slug,
    isSuperAdmin: user.role === 'super_admin',
  };
}

async function requireTenant(req) {
  const ctx = getTenantContext(req);
  if (!ctx) return null;

  if (ctx.isSuperAdmin && !ctx.autoEcoleId) {
    const tenantSlug = req.headers.get('x-tenant-slug');
    if (tenantSlug) {
      const ae = await getCachedAutoEcoleBySlug(tenantSlug);
      if (ae) {
        ctx.autoEcoleId = ae.id;
        ctx.slug = tenantSlug;
        return ctx;
      }
    }
    return null;
  }

  return ctx.autoEcoleId ? ctx : null;
}

function requireSuperAdmin(req) {
  const ctx = getTenantContext(req);
  return ctx && ctx.isSuperAdmin ? ctx : null;
}

function requireAuth(req) {
  return getTenantContext(req) || null;
}

module.exports = { getTenantContext, requireTenant, requireSuperAdmin, requireAuth };
