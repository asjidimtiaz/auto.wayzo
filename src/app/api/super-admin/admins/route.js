import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { requireSuperAdmin } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const ctx = requireSuperAdmin(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const autoEcoleId = searchParams.get('autoEcoleId');
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
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const { autoEcoleId, username, password } = await req.json();
    if (!autoEcoleId || !username || !password) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    const result = await db.createTenantAdmin(Number(autoEcoleId), username, password);
    return NextResponse.json({ success: true, id: result.id });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return NextResponse.json({ error: 'Ce nom d\'utilisateur existe déjà' }, { status: 409 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const ctx = requireSuperAdmin(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));
    const { password } = await req.json();
    if (!password) return NextResponse.json({ error: 'Mot de passe requis' }, { status: 400 });
    await db.updateTenantAdminPassword(id, password);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const ctx = requireSuperAdmin(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));
    await db.deleteTenantAdmin(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
