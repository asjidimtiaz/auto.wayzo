import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { requireSuperAdmin } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    const { slug } = params;
    const ae = await db.getAutoEcoleBySlug(slug);
    if (!ae) return NextResponse.json({ error: 'Auto-école introuvable' }, { status: 404 });
    return NextResponse.json(ae);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const ctx = requireSuperAdmin(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const { slug } = params;
    const ae = await db.getAutoEcoleBySlug(slug);
    if (!ae) return NextResponse.json({ error: 'Auto-école introuvable' }, { status: 404 });
    const data = await req.json();
    await db.updateAutoEcole(ae.id, data);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const ctx = requireSuperAdmin(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const { slug } = params;
    const ae = await db.getAutoEcoleBySlug(slug);
    if (!ae) return NextResponse.json({ error: 'Auto-école introuvable' }, { status: 404 });
    await db.deleteAutoEcole(ae.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
