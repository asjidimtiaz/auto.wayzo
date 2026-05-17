import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { requireSuperAdmin } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const ctx = requireSuperAdmin(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (id) {
      const ae = await db.getAutoEcoleById(Number(id));
      if (!ae) return NextResponse.json({ error: 'Auto-ecole introuvable' }, { status: 404 });
      const settings = await db.getSettings(ae.id);
      return NextResponse.json({ ...ae, settings: settings || null });
    }

    return NextResponse.json(await db.getAllAutoEcoles());
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const ctx = requireSuperAdmin(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    const data = await req.json();
    if (!data.name || !data.slug) return NextResponse.json({ error: 'name et slug requis' }, { status: 400 });

    const ae = await db.createAutoEcole(data);
    await db.createSettingsForAutoEcole(ae.id, { school_name: data.name });

    let setupUrl = null;
    if (data.adminUsername) {
      const result = await db.createTenantAdmin(ae.id, String(data.adminUsername).trim(), null, { invite: true });
      const origin = req.headers.get('origin') || new URL(req.url).origin;
      setupUrl = `${origin}/${data.slug}/setup?token=${encodeURIComponent(result.setupToken)}`;
    }

    return NextResponse.json({ success: true, id: ae.id, setupUrl });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return NextResponse.json({ error: 'Ce slug est deja utilise' }, { status: 409 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const ctx = requireSuperAdmin(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

    const existing = await db.getAutoEcoleById(id);
    if (!existing) return NextResponse.json({ error: 'Auto-ecole introuvable' }, { status: 404 });

    const data = await req.json();
    if (!data.name || !data.slug) return NextResponse.json({ error: 'name et slug requis' }, { status: 400 });

    await db.updateAutoEcole(id, data);
    if (data.settings) {
      await db.createSettingsForAutoEcole(id, {
        ...data.settings,
        school_name: data.settings.school_name || data.name,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return NextResponse.json({ error: 'Ce slug est deja utilise' }, { status: 409 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const ctx = requireSuperAdmin(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

    const existing = await db.getAutoEcoleById(id);
    if (!existing) return NextResponse.json({ error: 'Auto-ecole introuvable' }, { status: 404 });

    await db.deleteAutoEcole(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
