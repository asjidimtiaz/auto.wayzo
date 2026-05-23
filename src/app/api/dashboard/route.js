import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { requireTenant } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    await db.checkAndGenerateMonthlyExpenses(ctx.autoEcoleId);
    const { searchParams } = new URL(req.url);
    return NextResponse.json(await db.getDashboardStats(ctx.autoEcoleId, {
      date: searchParams.get('date') || undefined,
    }));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
