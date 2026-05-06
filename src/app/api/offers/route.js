import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { requireTenant } from '@/lib/tenant';
export const dynamic = 'force-dynamic';
export async function GET(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    return NextResponse.json(await db.getAllOffers(ctx.autoEcoleId));
  } catch (err) { console.error(err); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }); }
}
export async function POST(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    return NextResponse.json(await db.createOffer(ctx.autoEcoleId, await req.json()));
  } catch (err) { console.error(err); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }); }
}
export async function PUT(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const id = Number(new URL(req.url).searchParams.get('id'));
    await db.updateOffer(id, ctx.autoEcoleId, await req.json());
    return NextResponse.json({ success: true });
  } catch (err) { console.error(err); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }); }
}
export async function DELETE(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    await db.deleteOffer(Number(new URL(req.url).searchParams.get('id')), ctx.autoEcoleId);
    return NextResponse.json({ success: true });
  } catch (err) { console.error(err); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }); }
}
