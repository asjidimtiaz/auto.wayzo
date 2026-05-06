import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await initDb();
    return NextResponse.json({ success: true, message: 'Database initialized successfully' });
  } catch (err) {
    console.error('DB init error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
