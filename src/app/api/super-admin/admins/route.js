import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { requireSuperAdmin } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const ctx = requireSuperAdmin(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    await db.initDb();
    const { searchParams } = new URL(req.url);
    const autoEcoleId = searchParams.get('autoEcoleId') || searchParams.get('ecoleId');
    if (!autoEcoleId) return NextResponse.json({ error: 'autoEcoleId requis' }, { status: 400 });
    return NextResponse.json(await db.getAdminsByAutoEcole(Number(autoEcoleId)));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const ctx = requireSuperAdmin(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    await db.initDb();
    const data = await req.json();
    const autoEcoleId = data.autoEcoleId || data.auto_ecole_id || data.ecoleId;
    const username = String(data.username || '').trim();
    const password = String(data.password || data.adminPassword || '').trim();
    if (!autoEcoleId || !username) {
      return NextResponse.json({ error: 'Donnees manquantes' }, { status: 400 });
    }

    const ecole = await db.getAutoEcoleById(Number(autoEcoleId));
    if (!ecole) return NextResponse.json({ error: 'Auto-ecole introuvable' }, { status: 404 });

    const result = await db.createTenantAdmin(Number(autoEcoleId), username, password || null, { invite: !password });
    const origin = req.headers.get('origin') || new URL(req.url).origin;
    const loginUrl = password ? `${origin}/${ecole.slug}/login` : null;
    const setupUrl = password ? null : `${origin}/${ecole.slug}/setup?token=${encodeURIComponent(result.setupToken)}`;

    return NextResponse.json({
      success: true,
      id: result.id,
      loginUrl,
      setupUrl,
      setupTokenExpiresAt: result.setupTokenExpiresAt,
    });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return NextResponse.json({ error: "Ce nom d'utilisateur existe deja" }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const ctx = requireSuperAdmin(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    await db.initDb();

    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));
    const { password } = await req.json();

    if (!id || !password) {
      return NextResponse.json({ error: 'id et mot de passe requis' }, { status: 400 });
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: 'Le mot de passe doit faire au moins 6 caracteres' }, { status: 400 });
    }

    await db.updateTenantAdminPassword(id, String(password));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const ctx = requireSuperAdmin(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    await db.initDb();
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));
    await db.deleteTenantAdmin(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
