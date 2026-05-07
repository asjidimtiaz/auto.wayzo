import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { requireSuperAdmin } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const ctx = requireSuperAdmin(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
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
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const data = await req.json();
    const autoEcoleId = data.autoEcoleId || data.auto_ecole_id || data.ecoleId;
    const { username, password } = data;
    if (!autoEcoleId || !username) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    
    // Default password if not provided (e.g., username123)
    const effectivePassword = password || `${username}123`;
    
    const result = await db.createTenantAdmin(Number(autoEcoleId), username, effectivePassword);
    return NextResponse.json({ success: true, id: result.id });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return NextResponse.json({ error: 'Ce nom d\'utilisateur existe déjà' }, { status: 409 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Password update moved to /api/auth/profile for the user themselves
// Super admin should not have permission to change passwords directly
// export async function PUT(req) { ... }


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
