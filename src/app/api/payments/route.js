import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { requireTenant } from '@/lib/tenant';
import { validateData, parsePositiveInt } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const paymentSchema = {
  student_id: { required: true, type: 'number', min: 1 },
  amount: { required: true, type: 'number', min: 0.01 },
  payment_method: { required: true, enum: ['Cash', 'Transfer', 'Cheque', 'TPE'] },
  payment_date: { required: true, type: 'string' },
};

export async function GET(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentId = parsePositiveInt(searchParams.get('studentId'));

    if (searchParams.has('studentId')) {
      if (!studentId) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
      return NextResponse.json(await db.getPaymentsByStudent(studentId, ctx.autoEcoleId));
    }
    return NextResponse.json(await db.getAllPayments(ctx.autoEcoleId));
  } catch (err) {
    console.error('[payments GET]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const data = await req.json();
    const { errors, valid } = validateData(data, paymentSchema);
    if (!valid) return NextResponse.json({ error: 'Données invalides', details: errors }, { status: 400 });

    return NextResponse.json(await db.createPayment(ctx.autoEcoleId, data));
  } catch (err) {
    console.error('[payments POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = parsePositiveInt(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

    await db.deletePayment(id, ctx.autoEcoleId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[payments DELETE]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
