const { isAuthenticated } = require('./auth');
const db = require('./db');

// ─── DEV ONLY ────────────────────────────────────────────────────────────────
// Set to `true` to skip JWT checks during local development.
// Must match the DEV_BYPASS_AUTH flag in src/middleware.js.
// Remember to set back to `false` before deploying!
const DEV_BYPASS_AUTH = false;

function devCtx(slug, ae) {
  return {
    userId: 1,
    username: 'dev',
    role: 'admin',
    autoEcoleId: ae?.id || null,
    slug: slug || null,
    isSuperAdmin: false,
  };
}
// ─────────────────────────────────────────────────────────────────────────────

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
  if (DEV_BYPASS_AUTH) {
    const slug = req.headers.get('x-tenant-slug');
    if (!slug) return null;
    let ae = await db.getAutoEcoleBySlug(slug).catch(() => null);
    
    // Fallback to the first available auto-école if the slug doesn't match
    if (!ae) {
      const all = await db.getAllAutoEcoles().catch(() => []);
      if (all.length > 0) ae = all[0];
    }
    
    return devCtx(slug, ae);
  }

  const ctx = getTenantContext(req);
  if (!ctx) return null;

  if (ctx.isSuperAdmin && !ctx.autoEcoleId) {
    const tenantSlug = req.headers.get('x-tenant-slug');
    if (tenantSlug) {
      const ae = await db.getAutoEcoleBySlug(tenantSlug);
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
  if (DEV_BYPASS_AUTH) {
    return { userId: 1, username: 'dev', role: 'super_admin', autoEcoleId: null, slug: null, isSuperAdmin: true };
  }
  const ctx = getTenantContext(req);
  return ctx && ctx.isSuperAdmin ? ctx : null;
}

function requireAuth(req) {
  if (DEV_BYPASS_AUTH) {
    const slug = req.headers.get('x-tenant-slug');
    return devCtx(slug, null);
  }
  return getTenantContext(req) || null;
}

module.exports = { getTenantContext, requireTenant, requireSuperAdmin, requireAuth };

