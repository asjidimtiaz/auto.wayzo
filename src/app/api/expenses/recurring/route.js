import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { requireTenant } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    await db.initDb();

    const { searchParams } = new URL(req.url);
    if (searchParams.get('check')) {
      await db.checkAndGenerateMonthlyExpenses(ctx.autoEcoleId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(await db.getRecurringExpenses(ctx.autoEcoleId));
  } catch (err) {
    console.error('[recurring GET]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const data = await req.json();
    const result = await db.createRecurringExpense(ctx.autoEcoleId, data);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[recurring POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const data = await req.json();
    const { id, ...updateData } = data;
    const result = await db.updateRecurringExpense(id, ctx.autoEcoleId, updateData);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[recurring PUT]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    await db.deleteRecurringExpense(id, ctx.autoEcoleId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[recurring DELETE]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
