import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await db.initDb();
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'Lien invalide' }, { status: 400 });

    const user = await db.getAdminBySetupToken(token);
    if (!user) return NextResponse.json({ error: 'Lien invalide ou expire' }, { status: 404 });

    return NextResponse.json({
      success: true,
      user: {
        username: user.username,
        full_name: user.full_name || '',
        auto_ecole_name: user.auto_ecole_name,
        slug: user.slug,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await db.initDb();
    const { token, full_name, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: 'Mot de passe requis' }, { status: 400 });
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: 'Le mot de passe doit faire au moins 6 caracteres' }, { status: 400 });
    }

    const user = await db.completeTenantAdminSetup(token, String(full_name || '').trim(), password);
    if (!user) return NextResponse.json({ error: 'Lien invalide ou expire' }, { status: 404 });

    return NextResponse.json({
      success: true,
      loginUrl: `/${user.slug}/login`,
      username: user.username,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
