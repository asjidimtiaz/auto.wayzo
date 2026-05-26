import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

export const dynamic = 'force-dynamic';

// One-time setup / password reset endpoint
// Usage: GET /api/setup?secret=YOUR_SETUP_SECRET
// This will reset or create the super admin with username "Admin" and password "Admin@2026"

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    // Must provide the correct secret from env variable
    const expectedSecret = process.env.SETUP_SECRET || 'wayzo-setup-2026';
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.initDb();

    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('Admin@2026', 10);

    // Prefer the Admin account if it already exists so this endpoint can be run repeatedly.
    let existing = await db.query("SELECT * FROM admins WHERE username = $1 LIMIT 1", ['Admin']);
    if (existing.length === 0) {
      existing = await db.query("SELECT * FROM admins WHERE username = $1 AND role = 'super_admin' LIMIT 1", ['Login']);
    }
    if (existing.length === 0) {
      existing = await db.query("SELECT * FROM admins WHERE role = 'super_admin' LIMIT 1");
    }

    if (existing.length > 0) {
      // Update password
      await db.query(
        'UPDATE admins SET username = $1, password = $2, role = $3 WHERE id = $4',
        ['Admin', hash, 'super_admin', existing[0].id]
      );
      return NextResponse.json({
        success: true,
        message: 'Super admin password reset successfully.',
        username: 'Admin',
        password: 'Admin@2026',
      });
    } else {
      // Create new super admin
      await db.query(
        "INSERT INTO admins (username, password, role, auto_ecole_id) VALUES ($1, $2, 'super_admin', NULL)",
        ['Admin', hash]
      );
      return NextResponse.json({
        success: true,
        message: 'Super admin created successfully.',
        username: 'Admin',
        password: 'Admin@2026',
      });
    }
  } catch (err) {
    console.error('Setup error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
