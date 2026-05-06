import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { requireTenant } from '@/lib/tenant';
import { validateData, parsePositiveInt } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const studentSchema = {
  full_name: { required: true, type: 'string', minLength: 2, maxLength: 200 },
  total_price: { type: 'number', min: 0 },
  training_duration_days: { type: 'number', min: 1, max: 3650 },
};

export async function GET(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = parsePositiveInt(searchParams.get('id'));

    if (searchParams.has('id')) {
      if (!id) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
      const student = await db.getStudentById(id, ctx.autoEcoleId);
      if (!student) return NextResponse.json({ error: 'Étudiant introuvable' }, { status: 404 });
      return NextResponse.json(student);
    }

    return NextResponse.json(await db.getAllStudents(ctx.autoEcoleId));
  } catch (err) {
    console.error('[students GET]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const data = await req.json();
    const { errors, valid } = validateData(data, studentSchema);
    if (!valid) return NextResponse.json({ error: 'Données invalides', details: errors }, { status: 400 });

    const result = await db.createStudent(ctx.autoEcoleId, data);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[students POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = parsePositiveInt(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

    const data = await req.json();

    if (data.action === 'markLicenseObtained') {
      await db.markLicenseObtained(id, ctx.autoEcoleId, data.licenseType, data.dateObtained);
      return NextResponse.json({ success: true });
    }
    if (data.action === 'updateFollowUp') {
      await db.updateStudentFollowUp(id, ctx.autoEcoleId, data);
      return NextResponse.json({ success: true });
    }
    if (data.action === 'updateImage') {
      await db.updateStudentImage(id, ctx.autoEcoleId, data.field, data.imagePath);
      return NextResponse.json({ success: true });
    }

    await db.updateStudent(id, ctx.autoEcoleId, data);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[students PUT]', err);
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

    await db.deleteStudent(id, ctx.autoEcoleId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[students DELETE]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
