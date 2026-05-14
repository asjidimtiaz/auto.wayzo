require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function fixSuperAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const newUsername = 'Login@login.com';
    const newPassword = 'Login@2026';
    const hash = await bcrypt.hash(newPassword, 10);
    
    console.log('Attempting to update super admin...');
    const result = await pool.query(
      "UPDATE admins SET username = $1, password = $2 WHERE role = 'super_admin' RETURNING id, username",
      [newUsername, hash]
    );

    if (result.rowCount > 0) {
      console.log(`Success: Super Admin updated. New Username: ${newUsername}, Password: ${newPassword}`);
    } else {
      console.log('Error: Super Admin not found with that role. Checking by current username "Login"...');
      const result2 = await pool.query(
        "UPDATE admins SET username = $1, password = $2 WHERE username = 'Login' RETURNING id, username",
        [newUsername, hash]
      );
      if (result2.rowCount > 0) {
        console.log(`Success: Super Admin (Login) updated to ${newUsername}`);
      } else {
        console.log('Still not found. Listing admins to be sure:');
        const admins = await pool.query("SELECT id, username, role FROM admins");
        console.table(admins.rows);
      }
    }
  } catch (err) {
    console.error('Error updating Super Admin:', err);
  } finally {
    await pool.end();
  }
}

fixSuperAdmin();
