import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { requireTenant } from '@/lib/tenant';
export const dynamic = 'force-dynamic';
export async function GET(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId'), action = searchParams.get('action');
    if (action === 'unresolved') return NextResponse.json(await db.getUnresolvedIncidents(ctx.autoEcoleId));
    if (action === 'count' && studentId) return NextResponse.json(await db.getStudentIncidentsCount(Number(studentId), ctx.autoEcoleId));
    if (studentId) return NextResponse.json(await db.getIncidentsByStudent(Number(studentId), ctx.autoEcoleId));
    return NextResponse.json(await db.getAllIncidents(ctx.autoEcoleId));
  } catch (err) { console.error(err); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }); }
}
export async function POST(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    return NextResponse.json(await db.createIncident(ctx.autoEcoleId, await req.json()));
  } catch (err) { console.error(err); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }); }
}
export async function PUT(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const id = Number(new URL(req.url).searchParams.get('id'));
    const data = await req.json();
    await db.resolveIncident(id, ctx.autoEcoleId, data.notes);
    return NextResponse.json({ success: true });
  } catch (err) { console.error(err); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }); }
}
export async function DELETE(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    await db.deleteIncident(Number(new URL(req.url).searchParams.get('id')), ctx.autoEcoleId);
    return NextResponse.json({ success: true });
  } catch (err) { console.error(err); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }); }
}
