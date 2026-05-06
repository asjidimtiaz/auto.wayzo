import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await db.query('SELECT 1 as connected');
    const schools = await db.getAllAutoEcoles();
    return NextResponse.json({ 
      status: 'ok', 
      db: res[0].connected === 1 ? 'connected' : 'error',
      schoolCount: schools.length,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ? 'PRESENT' : 'MISSING',
        NODE_ENV: process.env.NODE_ENV
      }
    });
  } catch (err) {
    return NextResponse.json({ 
      status: 'error', 
      message: err.message,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ? 'PRESENT' : 'MISSING',
      }
    }, { status: 500 });
  }
}
