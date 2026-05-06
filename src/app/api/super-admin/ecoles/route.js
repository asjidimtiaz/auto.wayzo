import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { requireSuperAdmin } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const ctx = requireSuperAdmin(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    return NextResponse.json(await db.getAllAutoEcoles());
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
    if (!data.name || !data.slug) return NextResponse.json({ error: 'name et slug requis' }, { status: 400 });

    const ae = await db.createAutoEcole(data);
    await db.createSettingsForAutoEcole(ae.id, { school_name: data.name });

    if (data.adminUsername && data.adminPassword) {
      await db.createTenantAdmin(ae.id, data.adminUsername, data.adminPassword);
    }

    return NextResponse.json({ success: true, id: ae.id });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return NextResponse.json({ error: 'Ce slug est déjà utilisé' }, { status: 409 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
