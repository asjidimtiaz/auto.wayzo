import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminByUsername, initDb } from '@/lib/db';
import { generateToken, isAuthenticated } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const secureCookie = process.env.NODE_ENV === 'production';

export async function POST(req) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const maxAttempts = process.env.NODE_ENV === 'production' ? 5 : 50;
    const rl = checkRateLimit(`login:${ip}`, { maxAttempts, windowMs: 900_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
      );
    }

    await initDb();
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Nom d\'utilisateur et mot de passe requis' }, { status: 400 });
    }

    const rawTenantSlug = req.headers.get('x-tenant-slug');
    const tenantSlug = rawTenantSlug ? rawTenantSlug.trim().toLowerCase() : null;
    const isTenantLogin = tenantSlug && tenantSlug !== 'login' && tenantSlug !== 'super-admin';

    const user = await getAdminByUsername(username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }

    // Verify tenant and role isolation
    if (isTenantLogin) {
      if (!user.slug || user.slug.trim().toLowerCase() !== tenantSlug) {
        return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
      }
    } else {
      if (user.role !== 'super_admin') {
        return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
      }
    }

    if (user.setup_token_hash && !user.setup_completed_at) {
      return NextResponse.json(
        { error: 'Veuillez terminer la creation de votre compte avec le lien d invitation.' },
        { status: 403 }
      );
    }

    const token = generateToken(user);
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name || null,
        role: user.role || 'admin',
        auto_ecole_id: user.auto_ecole_id || null,
        slug: user.slug || null,
      },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: 'strict',
      maxAge: 86400,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Auth error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const user = isAuthenticated(req);
    if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name || null,
        role: user.role || 'admin',
        auto_ecole_id: user.auto_ecole_id || null,
        slug: user.slug || null,
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: secureCookie,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
