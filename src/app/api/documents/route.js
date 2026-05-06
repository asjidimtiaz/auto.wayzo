import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { requireTenant } from '@/lib/tenant';
export const dynamic = 'force-dynamic';
export async function GET(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id'), studentId = searchParams.get('studentId');
    if (id) { const doc = await db.getDocumentById(Number(id), ctx.autoEcoleId); if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 }); return NextResponse.json(doc); }
    if (studentId) return NextResponse.json(await db.getDocumentsByStudent(Number(studentId), ctx.autoEcoleId));
    return NextResponse.json(await db.getAllDocuments(ctx.autoEcoleId));
  } catch (err) { console.error(err); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }); }
}
export async function POST(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    return NextResponse.json(await db.createDocument(ctx.autoEcoleId, await req.json()));
  } catch (err) { console.error(err); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }); }
}
export async function DELETE(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    await db.deleteDocument(Number(new URL(req.url).searchParams.get('id')), ctx.autoEcoleId);
    return NextResponse.json({ success: true });
  } catch (err) { console.error(err); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }); }
}
