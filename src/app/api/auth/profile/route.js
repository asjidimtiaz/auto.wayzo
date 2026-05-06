import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import * as db from '@/lib/db';
import { requireAuth } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function PUT(req) {
  try {
    const ctx = requireAuth(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { username, password } = await req.json();
    
    // We update the user by their ID from context
    if (password) {
      await db.updateTenantAdminPassword(ctx.userId, password);
    }
    
    // Optional: update username if provided (though usually it's fixed)
    // if (username) { ... }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
