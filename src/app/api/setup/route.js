import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

export const dynamic = 'force-dynamic';

// One-time setup / password reset endpoint
// Usage: GET /api/setup?secret=YOUR_SETUP_SECRET
// This will reset or create the super admin with username "Login" and password "Login@2026"

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
    const hash = await bcrypt.hash('Login@2026', 10);

    // Check if super admin already exists
    const existing = await db.getAdminByUsername('Login');

    if (existing) {
      // Update password
      await db.query(
        'UPDATE admins SET password = $1, role = $2 WHERE username = $3',
        [hash, 'super_admin', 'Login']
      );
      return NextResponse.json({
        success: true,
        message: 'Super admin password reset successfully.',
        username: 'Login',
        password: 'Login@2026',
      });
    } else {
      // Create new super admin
      await db.query(
        "INSERT INTO admins (username, password, role, auto_ecole_id) VALUES ($1, $2, 'super_admin', NULL)",
        ['Login', hash]
      );
      return NextResponse.json({
        success: true,
        message: 'Super admin created successfully.',
        username: 'Login',
        password: 'Login@2026',
      });
    }
  } catch (err) {
    console.error('Setup error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
