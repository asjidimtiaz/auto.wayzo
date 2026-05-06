import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

function setSecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  return response;
}

export async function middleware(request) {
const { pathname } = request.nextUrl;

  // Allow static assets
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/fonts')) {
    return NextResponse.next();
  }

  // Public routes
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/ecoles/') ||
    pathname.startsWith('/api/init')
  ) {
    return setSecurityHeaders(NextResponse.next());
  }

  // Tenant login pages: /[slug]/login
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 2 && parts[1] === 'login' && parts[0] !== 'super-admin') {
    return setSecurityHeaders(NextResponse.next());
  }

  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    if (!pathname.startsWith('/api/')) {
      const slug = parts[0];
      if (slug && slug !== 'super-admin' && slug !== 'login') {
        return NextResponse.redirect(new URL(`/${slug}/login`, request.url));
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || '');
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });

    if (!payload.id || !payload.username) throw new Error('Invalid payload');

    if (pathname.startsWith('/super-admin')) {
      if (payload.role !== 'super_admin') {
        if (payload.slug) return NextResponse.redirect(new URL(`/${payload.slug}`, request.url));
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } else if (pathname === '/') {
      if (payload.role === 'super_admin') return NextResponse.redirect(new URL('/super-admin', request.url));
      if (payload.slug) return NextResponse.redirect(new URL(`/${payload.slug}`, request.url));
    } else if (!pathname.startsWith('/api/')) {
      const slug = parts[0];
      if (slug && slug !== 'super-admin' && slug !== 'login') {
        if (parts[1] === 'login' && (payload.role === 'super_admin' || payload.slug === slug)) {
          return NextResponse.redirect(new URL(`/${slug}`, request.url));
        }
        if (payload.role !== 'super_admin' && payload.slug !== slug) {
          if (payload.slug) return NextResponse.redirect(new URL(`/${payload.slug}`, request.url));
          return NextResponse.redirect(new URL('/login', request.url));
        }
      }
    }

    return setSecurityHeaders(NextResponse.next());
  } catch {
    if (!pathname.startsWith('/api/')) {
      const slug = parts[0];
      if (slug && slug !== 'super-admin' && slug !== 'login') {
        const res = NextResponse.redirect(new URL(`/${slug}/login`, request.url));
        res.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
        return res;
      }
      const res = NextResponse.redirect(new URL('/login', request.url));
      res.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
      return res;
    }
    return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
  }
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
};
