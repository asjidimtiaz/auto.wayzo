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
    if (action === 'today') return NextResponse.json(await db.getTodayAttendance(ctx.autoEcoleId));
    if (action === 'status' && studentId) return NextResponse.json({ status: await db.getStudentAttendanceStatus(ctx.autoEcoleId, Number(studentId)) });
    if (studentId) return NextResponse.json(await db.getAttendanceByStudent(Number(studentId), ctx.autoEcoleId));
    return NextResponse.json(await db.getTodayAttendance(ctx.autoEcoleId));
  } catch (err) { console.error(err); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }); }
}
export async function POST(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const data = await req.json();
    if (data.action === 'scanIn') return NextResponse.json(await db.recordAttendanceIn(ctx.autoEcoleId, data.studentId));
    if (data.action === 'scanOut') return NextResponse.json(await db.recordAttendanceOut(ctx.autoEcoleId, data.studentId));
    if (data.action === 'cleanup') return NextResponse.json(await db.cleanupDuplicateAttendance(ctx.autoEcoleId));
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) { console.error(err); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }); }
}
