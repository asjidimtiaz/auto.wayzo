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
    if (action === 'overdue') return NextResponse.json(await db.getOverduePayments(ctx.autoEcoleId));
    if (action === 'upcoming') return NextResponse.json(await db.getUpcomingPayments(ctx.autoEcoleId, Number(searchParams.get('days')) || 7));
    if (studentId) return NextResponse.json(await db.getPaymentSchedulesByStudent(Number(studentId), ctx.autoEcoleId));
    return NextResponse.json([]);
  } catch (err) { console.error(err); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }); }
}
export async function POST(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const data = await req.json();
    if (data.action === 'markPaid') { await db.markScheduleAsPaid(data.scheduleId, data.paymentId, ctx.autoEcoleId); return NextResponse.json({ success: true }); }
    return NextResponse.json(await db.createPaymentSchedule(ctx.autoEcoleId, data.studentId, data.schedules));
  } catch (err) { console.error(err); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }); }
}
