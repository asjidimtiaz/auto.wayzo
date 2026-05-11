const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const DATABASE_URL = "postgresql://postgres.opjvehvtazkwnptcsevc:pVA%24GwWAVaab9MW@aws-1-eu-west-1.pooler.supabase.com:6543/postgres";

async function updateSuperAdmin() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const newUsername = 'Login';
    const newPassword = 'Login@2026';
    const hash = await bcrypt.hash(newPassword, 10);
    
    // We update the super admin (role = 'super_admin')
    // We saw from list_admins that ID 17 is login@login.com (super_admin)
    const result = await pool.query(
      "UPDATE admins SET username = $1, password = $2 WHERE role = 'super_admin' RETURNING id, username",
      [newUsername, hash]
    );

    if (result.rowCount > 0) {
      console.log(`Success: Super Admin updated. New Username: ${newUsername}, Password: ${newPassword}`);
    } else {
      console.log('Error: Super Admin not found.');
    }
  } catch (err) {
    console.error('Error updating Super Admin:', err);
  } finally {
    await pool.end();
  }
}

updateSuperAdmin();
