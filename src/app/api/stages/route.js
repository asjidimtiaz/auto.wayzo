import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { requireTenant } from '@/lib/tenant';
export const dynamic = 'force-dynamic';
export async function GET(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const action = searchParams.get('action');
    if (action === 'today') return NextResponse.json(await db.getTodayStages(ctx.autoEcoleId));
    if (action === 'upcoming') return NextResponse.json(await db.getUpcomingStages(ctx.autoEcoleId, Number(searchParams.get('days')) || 7));
    if (action === 'sessionTimeStats') return NextResponse.json(await db.getSessionTimeStats(ctx.autoEcoleId));
    if (action === 'studentSessionTimeStats' && studentId) return NextResponse.json(await db.getStudentSessionTimeStats(Number(studentId), ctx.autoEcoleId));
    if (studentId) return NextResponse.json(await db.getStagesByStudent(Number(studentId), ctx.autoEcoleId));
    return NextResponse.json(await db.getAllStages(ctx.autoEcoleId));
  } catch (err) { console.error(err); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }); }
}
export async function POST(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    return NextResponse.json(await db.createStage(ctx.autoEcoleId, await req.json()));
  } catch (err) { console.error(err); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }); }
}
export async function PUT(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const id = Number(new URL(req.url).searchParams.get('id'));
    await db.updateStage(id, ctx.autoEcoleId, await req.json());
    return NextResponse.json({ success: true });
  } catch (err) { console.error(err); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }); }
}
export async function DELETE(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    await db.deleteStage(Number(new URL(req.url).searchParams.get('id')), ctx.autoEcoleId);
    return NextResponse.json({ success: true });
  } catch (err) { console.error(err); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }); }
}
