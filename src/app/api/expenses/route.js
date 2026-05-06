import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { requireTenant } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    if (searchParams.get('stats')) {
      return NextResponse.json(await db.getExpenseStats(ctx.autoEcoleId));
    }

    return NextResponse.json(await db.getAllExpenses(ctx.autoEcoleId));
  } catch (err) {
    console.error('[expenses GET]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const data = await req.json();
    if (!data.category || !data.amount) {
      return NextResponse.json({ error: 'Catégorie et montant requis' }, { status: 400 });
    }

    const result = await db.createExpense(ctx.autoEcoleId, data);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[expenses POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

    await db.deleteExpense(ctx.autoEcoleId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[expenses DELETE]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
